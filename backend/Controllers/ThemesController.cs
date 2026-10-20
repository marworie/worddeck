using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Hazır tema listeleri: herkes için ortak, sadece okunur
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ThemesController : ControllerBase
    {
        private readonly IThemeRepository _themes;

        public ThemesController(IThemeRepository themes) => _themes = themes;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Themes → temalar ve ilerleme
        [HttpGet]
        public async Task<IActionResult> GetThemes() =>
            Ok(await _themes.GetThemesAsync(GetUserId()));

        // GET api/Themes/3/words → temadaki kelimeler
        [HttpGet("{id}/words")]
        public async Task<IActionResult> GetWords(int id)
        {
            if (!await _themes.ExistsAsync(id))
                return NotFound(new { message = "Tema bulunamadı." });
            return Ok(await _themes.GetThemeWordsAsync(GetUserId(), id));
        }

        // POST api/Themes/3/study?level=B1 → temadaki kelimeleri çalışmaya ekle
        [HttpPost("{id}/study")]
        public async Task<IActionResult> AddToStudy(int id, [FromQuery] string? level)
        {
            if (!await _themes.ExistsAsync(id))
                return NotFound(new { message = "Tema bulunamadı." });

            level = string.IsNullOrWhiteSpace(level) ? null : level.ToUpperInvariant();
            int added = await _themes.AddToStudyAsync(GetUserId(), id, level, AppClock.Today);
            return Ok(new { added });
        }
    }
}