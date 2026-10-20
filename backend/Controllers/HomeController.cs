using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Ana sayfa: günün kelimesi, seviye yolculuğu ve özet sayılar
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HomeController : ControllerBase
    {
        private readonly IHomeRepository _home;
        private readonly IPlacementRepository _placement;
        private readonly IStudyRepository _study;
        private readonly IUserRepository _users;

        public HomeController(IHomeRepository home, IPlacementRepository placement, IStudyRepository study, IUserRepository users)
        {
            _home = home;
            _placement = placement;
            _study = study;
            _users = users;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Home
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            int userId = GetUserId();
            var today = AppClock.Today;

            var journey = (await _home.GetJourneyAsync(userId)).ToList();

            // Şu anki seviye: seviye testi sonucu; yoksa en çok çalışılan seviye; o da yoksa A1
            var placement = await _placement.GetResultAsync(userId);
            string currentLevel = placement?.PlacementLevel
                ?? journey.Where(j => j.Studied > 0).OrderByDescending(j => j.Studied).Select(j => j.Level).FirstOrDefault()
                ?? "A1";

            var wordOfDay = await _home.GetWordOfDayAsync(userId, currentLevel, today);
            var dates = await _study.GetStudyDatesAsync(userId);
            var user = await _users.GetByIdAsync(userId);

            return Ok(new
            {
                currentLevel,
                journey,
                wordOfDay,
                learnedTotal = journey.Sum(j => j.Learned),
                studyingTotal = journey.Sum(j => j.Studied - j.Learned),
                daysThisWeek = dates.Count(d => d >= today.AddDays(-6) && d <= today),
                dailyNewWords = user?.DailyNewWords ?? 10
            });
        }
    }
}