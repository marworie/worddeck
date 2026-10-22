using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Metin okuyucu: metindeki kelimeleri sözlükle eşleştirir
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReaderController : ControllerBase
    {
        private const int MaxWords = 3000;
        private readonly IReaderRepository _reader;

        public ReaderController(IReaderRepository reader) => _reader = reader;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // POST api/Reader/analyze  { "words": ["went", "running", ...] }
        [HttpPost("analyze")]
        public async Task<IActionResult> Analyze([FromBody] ReaderAnalyzeRequest req)
        {
            var words = req.Words
                .Select(Lemmatizer.Normalize)
                .Where(w => w.Length > 0)
                .Distinct()
                .Take(MaxWords)
                .ToList();

            if (words.Count == 0) return Ok(Array.Empty<ReaderWordDto>());

            var candidates = words.ToDictionary(w => w, Lemmatizer.Candidates);
            var allHeads = candidates.Values.SelectMany(c => c).Distinct();

            var found = new Dictionary<string, ReaderWordRow>(StringComparer.OrdinalIgnoreCase);
            foreach (var row in await _reader.FindHeadwordsAsync(GetUserId(), allHeads))
                found.TryAdd(row.Headword, row);

            var result = new List<ReaderWordDto>();
            foreach (var word in words)
            {
                // Adaylardan veritabanında ilk bulunan
                var head = candidates[word].FirstOrDefault(found.ContainsKey);
                if (head == null) continue;

                var row = found[head];
                result.Add(new ReaderWordDto
                {
                    Word = word,
                    WordId = row.WordId,
                    Headword = row.Headword,
                    PartOfSpeech = row.PartOfSpeech,
                    Level = row.Level,
                    Meaning = ChoiceQuestionBuilder.ShortMeaning(row.TurkishMeaning),
                    Status = StatusOf(row.Box)
                });
            }

            return Ok(result);
        }

        // POST api/Reader/study/123
        [HttpPost("study/{wordId:int}")]
        public async Task<IActionResult> AddToStudy(int wordId)
        {
            await _reader.AddToStudyAsync(GetUserId(), wordId, AppClock.Today);
            return NoContent();
        }

        // Kelime kartlarıyla aynı mantık: Box ≥ 2 biliyor, Box ≥ 6 öğrendi
        private static string StatusOf(int? box) =>
            box == null ? "new"
            : box >= LeitnerService.LearnedBox ? "learned"
            : box >= LeitnerService.KnownBox ? "known"
            : "studying";
    }
}