using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;

namespace WordDeck.Controllers
{
    // Kullanıcı ayarları (şimdilik: oturum başına yeni kelime sayısı)
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly IUserRepository _users;

        public SettingsController(IUserRepository users) => _users = users;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var user = await _users.GetByIdAsync(GetUserId());
            if (user == null) return Unauthorized();
            return Ok(new SettingsDto { DailyNewWords = user.DailyNewWords });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] SettingsDto dto)
        {
            await _users.UpdateDailyNewWordsAsync(GetUserId(), dto.DailyNewWords);
            return NoContent();
        }
    }
}