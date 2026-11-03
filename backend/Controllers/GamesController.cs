using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Kelime oyunları için rastgele kelime çiftleri
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class GamesController : ControllerBase
    {
        private static readonly string[] Levels = { "A1", "A2", "B1", "B2", "C1" };
        private readonly IGamesRepository _repo;

        public GamesController(IGamesRepository repo) => _repo = repo;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Games/words?source=mine&count=6   (source: mine, A1, A2, B1, B2, C1)
        [HttpGet("words")]
        public async Task<IActionResult> Words(string source = "mine", int count = 6)
        {
            count = Math.Clamp(count, 2, 20);
            if (source != "mine" && !Levels.Contains(source)) return BadRequest("Geçersiz kaynak");

            // Aynı anlamlılar elenecek, o yüzden fazladan çek
            var raw = source == "mine"
                ? await _repo.GetMyWordsAsync(GetUserId(), count * 3)
                : await _repo.GetLevelWordsAsync(source, count * 3);

            return Ok(GameRules.PickPairs(raw, count));
        }

        // GET api/Games/wordle: günün kelimesi + serbest oyun için kelimeler + geçerli tahminler
        [HttpGet("wordle")]
        public async Task<IActionResult> Wordle()
        {
            var all = (await _repo.GetFiveLetterAsync()).Where(w => GameRules.IsLetters(w.Headword, 5, 5)).ToList();
            var valid = all.Select(w => w.Headword).Distinct().OrderBy(w => w).ToList();

            // Cevaplar kolay-orta seviyeden ve anlamı olan kelimelerden seçilir
            var answers = all
                .Where(w => w.Level is "A1" or "A2" or "B1" && !string.IsNullOrWhiteSpace(w.Meaning))
                .GroupBy(w => w.Headword)
                .Select(g => g.First())
                .OrderBy(w => w.Headword)
                .Select(w => new GameWordDto { WordId = w.WordId, Headword = w.Headword, Meaning = GameRules.ShortMeaning(w.Meaning), Level = w.Level })
                .ToList();
            if (answers.Count == 0) return NotFound("Uygun kelime yok");

            var today = DateOnly.FromDateTime(DateTime.Today);
            return Ok(new { day = today.ToString("yyyy-MM-dd"), daily = GameRules.DailyPick(answers, today), answers, valid });
        }

        public class ChainCheckRequest
        {
            public string? Prev { get; set; }
            public string Word { get; set; } = "";
            public List<string> Used { get; set; } = new();
        }

        // POST api/Games/chain/check: oyuncunun kelimesi kurala uyuyor ve sözlükte var mı?
        [HttpPost("chain/check")]
        public async Task<IActionResult> ChainCheck([FromBody] ChainCheckRequest req)
        {
            var word = (req.Word ?? "").Trim().ToLowerInvariant();
            var prev = req.Prev?.Trim().ToLowerInvariant();

            var error = GameRules.ChainError(prev, word, req.Used);
            if (error != null) return Ok(new { ok = false, reason = error });

            // "apples", "went" gibi çekimli haller de kabul edilsin
            var found = await _repo.FindAnyAsync(Lemmatizer.Candidates(word));
            if (found == null) return Ok(new { ok = false, reason = "Bu kelime sözlükte yok" });

            return Ok(new { ok = true, word, headword = found.Headword, meaning = GameRules.ShortMeaning(found.Meaning) });
        }

        // GET api/Games/chain/next?letter=e&used=apple,egg: bilgisayarın kelimesi (yoksa 204)
        [HttpGet("chain/next")]
        public async Task<IActionResult> ChainNext(string letter, string? used)
        {
            letter = (letter ?? "").ToLowerInvariant();
            if (!GameRules.IsLetters(letter, 1, 1)) return BadRequest("Geçersiz harf");

            var w = await _repo.RandomStartingWithAsync(letter, used ?? "");
            if (w == null) return NoContent();
            return Ok(new GameWordDto { WordId = w.WordId, Headword = w.Headword, Meaning = GameRules.ShortMeaning(w.Meaning), Level = w.Level });
        }
    }
}