using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Dikte: cümleyi dinle, yaz, kelime kelime kontrol et
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DictationController : ControllerBase
    {
        private static readonly string[] Levels = { "A1", "A2", "B1", "B2", "C1" };
        private readonly IDictationRepository _repo;

        public DictationController(IDictationRepository repo) => _repo = repo;

        // GET api/Dictation?level=A1&count=10
        [HttpGet]
        public async Task<IActionResult> Get(string level = "A1", int count = 10)
        {
            if (!Levels.Contains(level)) return BadRequest("Geçersiz seviye");
            count = Math.Clamp(count, 1, 20);

            // Uzunluğu uymayanlar elenecek, o yüzden fazladan çekiyoruz
            var list = (await _repo.GetRandomAsync(level, count * 3))
                .Where(s => DictationRules.Suitable(s.Example))
                .Take(count);

            return Ok(list);
        }

        // POST api/Dictation/check  { "expected": "...", "typed": "..." }
        [HttpPost("check")]
        public IActionResult Check([FromBody] DictationCheckRequest req)
        {
            var tokens = DictationRules.Compare(req.Expected, req.Typed);
            return Ok(new { tokens, score = DictationRules.Score(tokens) });
        }
    }
}