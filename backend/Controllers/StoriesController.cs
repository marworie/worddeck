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
        private readonly IConfiguration _config;

        public StoriesController(IStoryRepository stories, IReaderRepository reader, IHttpClientFactory http, IConfiguration config)
        {
            _stories = stories;
            _reader = reader;
            _http = http;
            _config = config;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Hikaye ekleme / seviye yenileme sadece yönetici kullanıcıya açık (appsettings: AdminUser)
        private bool IsAdmin() =>
            string.Equals(User.Identity?.Name, _config["AdminUser"], StringComparison.OrdinalIgnoreCase);

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

        // GET api/Stories/5/words: bu kitapta işaretlenen kelimeler
        [HttpGet("{id:int}/words")]
        public async Task<IActionResult> GetWordMarks(int id) =>
            Ok(await _stories.GetWordMarksAsync(GetUserId(), id));

        // PUT api/Stories/5/words/123  { "mark": "unknown" }
        [HttpPut("{id:int}/words/{wordId:int}")]
        public async Task<IActionResult> SetWordMark(int id, int wordId, [FromBody] StoryWordMarkRequest req)
        {
            if (!StoryRules.IsValidMark(req.Mark)) return BadRequest("Geçersiz işaret");
            if (await _stories.GetAsync(id) == null) return NotFound();
            await _stories.SetWordMarkAsync(GetUserId(), id, wordId, req.Mark);
            return NoContent();
        }

        // DELETE api/Stories/5/words/123: işareti kaldır
        [HttpDelete("{id:int}/words/{wordId:int}")]
        public async Task<IActionResult> DeleteWordMark(int id, int wordId)
        {
            await _stories.DeleteWordMarkAsync(GetUserId(), id, wordId);
            return NoContent();
        }

        // POST api/Stories/import  (sadece yönetici)
        [HttpPost("import")]
        public async Task<IActionResult> Import([FromBody] StoryImportRequest req)
        {
            if (!IsAdmin()) return Forbid();
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

        // POST api/Stories/relevel            → sadece önizleme: hangi hikaye hangi seviyeye geçer
        // POST api/Stories/relevel?apply=true → değişiklikleri kaydeder
        // Kendi yazdığımız hikayeler (Author = WordDeck) seviyesi elle verildiği için atlanır. (sadece yönetici)
        [HttpPost("relevel")]
        public async Task<IActionResult> Relevel([FromQuery] bool apply = false)
        {
            if (!IsAdmin()) return Forbid();

            var result = new List<object>();

            foreach (var s in await _stories.GetAllRowsAsync())
            {
                if (s.Author == "WordDeck") continue;

                var (known, unknown) = await WordLevelsAsync(s.Body);
                var level = StoryRules.EstimateLevel(known, unknown);
                int pageCount = StoryRules.Paginate(s.Body, StoryRules.WordsPerPage(level)).Count;

                if (apply && level != s.Level)
                    await _stories.UpdateLevelAsync(s.Id, level, pageCount);

                result.Add(new
                {
                    s.Title,
                    oldLevel = s.Level,
                    newLevel = level,
                    baseLevel = StoryRules.EstimateLevel(known),                         // bilinmeyenler hariç
                    unknownPercent = Math.Round(100.0 * unknown / Math.Max(known.Count + unknown, 1), 1),
                    pageCount
                });
            }

            return Ok(result);
        }

        // Metindeki kelimeleri sözlükte bular: bulunanların seviyeleri + bulunamayan kelime sayısı
        private async Task<(List<string> Levels, int Unknown)> WordLevelsAsync(string body)
        {
            var words = StoryRules.CommonWords(body)
                .Select(Lemmatizer.Normalize)
                .Where(w => w.Length > 0)
                .Distinct()
                .ToList();

            var candidates = words.ToDictionary(w => w, Lemmatizer.Candidates);
            var found = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in await _reader.FindHeadwordsAsync(GetUserId(), candidates.Values.SelectMany(c => c).Distinct()))
                found.TryAdd(row.Headword, row.Level);

            var headwords = words.Select(w => candidates[w].FirstOrDefault(found.ContainsKey)).ToList();
            var levels = headwords.Where(h => h != null).Distinct().Select(h => found[h!]).ToList();
            return (levels, headwords.Count(h => h == null));
        }

        private async Task<string> EstimateLevelAsync(string body)
        {
            var (levels, unknown) = await WordLevelsAsync(body);
            return StoryRules.EstimateLevel(levels, unknown);
        }
    }
}