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
    }
}