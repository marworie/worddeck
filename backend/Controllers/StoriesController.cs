using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Okuma hikayeleri: kitaplık, okuma, kaldığın sayfa, hikaye ekleme
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StoriesController : ControllerBase
    {
        private readonly IStoryRepository _stories;
        private readonly IReaderRepository _reader;
        private readonly IHttpClientFactory _http;

        public StoriesController(IStoryRepository stories, IReaderRepository reader, IHttpClientFactory http)
        {
            _stories = stories;
            _reader = reader;
            _http = http;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Stories
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _stories.GetAllAsync(GetUserId()));

        // GET api/Stories/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            var story = await _stories.GetAsync(id);
            if (story == null) return NotFound();

            var pages = StoryRules.Paginate(story.Body, StoryRules.WordsPerPage(story.Level));
            int page = await _stories.GetProgressAsync(GetUserId(), id) ?? 0;

            return Ok(new StoryDto
            {
                Id = story.Id,
                Title = story.Title,
                Author = story.Author,
                Level = story.Level,
                Emoji = story.Emoji,
                Color = story.Color,
                CoverUrl = story.CoverUrl,
                Pages = pages,
                Page = Math.Clamp(page, 0, Math.Max(pages.Count - 1, 0))
            });
        }

        // PUT api/Stories/5/progress  { "page": 3 }
        [HttpPut("{id:int}/progress")]
        public async Task<IActionResult> SaveProgress(int id, [FromBody] StoryProgressRequest req)
        {
            if (await _stories.GetAsync(id) == null) return NotFound();
            await _stories.SaveProgressAsync(GetUserId(), id, Math.Max(0, req.Page));
            return NoContent();
        }

        // POST api/Stories/import
        [HttpPost("import")]
        public async Task<IActionResult> Import([FromBody] StoryImportRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest("Başlık gerekli");
            if (await _stories.TitleExistsAsync(req.Title)) return Conflict("Bu hikaye zaten ekli");

            string? raw;
            string? source;

            if (req.GutenbergId.HasValue)
            {
                var client = _http.CreateClient();
                client.DefaultRequestHeaders.UserAgent.ParseAdd("WordDeck/1.0");
                int g = req.GutenbergId.Value;
                var file = await client.GetStringAsync($"https://www.gutenberg.org/cache/epub/{g}/pg{g}.txt");

                // İlk cümle verildiyse ona göre, yoksa başlığa göre kes
                raw = !string.IsNullOrWhiteSpace(req.Start)
                    ? StoryRules.Extract(file, req.Start, req.End)
                    : StoryRules.ExtractByTitle(file, req.Heading ?? req.Title, req.NextTitle);
                if (raw == null) return BadRequest("Başlangıç ya da bitiş metni bulunamadı");
                source = $"Project Gutenberg #{g}";
            }
            else
            {
                raw = req.Text;
                source = null;
            }

            if (string.IsNullOrWhiteSpace(raw)) return BadRequest("Metin boş");

            var body = StoryRules.Clean(raw);
            var level = StoryRules.Levels.Contains(req.Level) ? req.Level! : await EstimateLevelAsync(body);
            var pages = StoryRules.Paginate(body, StoryRules.WordsPerPage(level));

            if (pages.Count > StoryRules.MaxPages)
                return BadRequest($"Hikaye {pages.Count} sayfa, en fazla {StoryRules.MaxPages} olabilir");

            int id = await _stories.AddAsync(new StoryRow
            {
                Title = req.Title.Trim(),
                Author = req.Author.Trim(),
                Level = level,
                Emoji = req.Emoji,
                Color = req.Color,
                CoverUrl = req.CoverUrl,
                Body = body,
                WordCount = StoryRules.CountWords(body),
                PageCount = pages.Count,
                Source = source
            });

            return Ok(new { id, level, pageCount = pages.Count, wordCount = StoryRules.CountWords(body) });
        }

        // Metindeki kelimeleri sözlükte bulup seviyelerinden hikayenin seviyesini tahmin eder
        private async Task<string> EstimateLevelAsync(string body)
        {
            var words = body
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
                .Select(Lemmatizer.Normalize)
                .Where(w => w.Length > 0)
                .Distinct()
                .ToList();

            var candidates = words.ToDictionary(w => w, Lemmatizer.Candidates);
            var found = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in await _reader.FindHeadwordsAsync(GetUserId(), candidates.Values.SelectMany(c => c).Distinct()))
                found.TryAdd(row.Headword, row.Level);

            var levels = words
                .Select(w => candidates[w].FirstOrDefault(found.ContainsKey))
                .Where(h => h != null)
                .Distinct()
                .Select(h => found[h!]);

            return StoryRules.EstimateLevel(levels);
        }
    }
}