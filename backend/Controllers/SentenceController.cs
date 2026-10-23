using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Kelimeyle cümle kurma: alıştırma kelimeleri ve cümle kontrolü
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SentenceController : ControllerBase
    {
        private readonly ISentenceRepository _sentences;
        private readonly LanguageToolService _languageTool;

        public SentenceController(ISentenceRepository sentences, LanguageToolService languageTool)
        {
            _sentences = sentences;
            _languageTool = languageTool;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Sentence/words?count=5
        [HttpGet("words")]
        public async Task<IActionResult> GetWords([FromQuery] int count = 5) =>
            Ok(await _sentences.GetPracticeWordsAsync(GetUserId(), Math.Clamp(count, 1, 20)));

        // POST api/Sentence/check  { "wordId": 12, "sentence": "..." }
        [HttpPost("check")]
        public async Task<IActionResult> Check([FromBody] SentenceCheckRequest req)
        {
            var sentence = req.Sentence?.Trim() ?? "";
            if (sentence.Length == 0) return BadRequest("Cümle boş");
            if (sentence.Length > SentenceRules.MaxLength) return BadRequest($"Cümle en fazla {SentenceRules.MaxLength} karakter olabilir");

            var headword = await _sentences.GetHeadwordAsync(req.WordId);
            if (headword == null) return NotFound();

            var wordCount = SentenceRules.Words(sentence).Count;
            var usesWord = SentenceRules.UsesWord(sentence, headword);
            var issues = await _languageTool.CheckAsync(sentence);

            var result = new SentenceCheckResult
            {
                UsesWord = usesWord,
                WordCount = wordCount,
                TooShort = wordCount < SentenceRules.MinWords,
                GrammarChecked = issues != null,
                Issues = issues ?? new()
            };
            result.Ok = result.UsesWord && !result.TooShort && result.Issues.Count == 0;

            return Ok(result);
        }
    }
}