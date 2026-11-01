using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Rozetler: mevcut veriden hesaplanır, ayrı tabloda saklanmaz
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class BadgesController : ControllerBase
    {
        private readonly IStatsRepository _stats;
        public BadgesController(IStatsRepository stats) => _stats = stats;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Badges
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            int userId = GetUserId();
            var today = DateTime.Today;

            var stats = await _stats.GetBadgeStatsAsync(userId);
            var dates = await _stats.GetStudyDatesAsync(userId, today.AddDays(-400));   // en uzun rozet 30 gün, bol bol yeter
            stats.StreakDays = BadgeRules.Streak(dates, today);

            return Ok(BadgeRules.Evaluate(stats));
        }
    }
}