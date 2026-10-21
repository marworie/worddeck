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
                knownTotal = journey.Sum(j => j.Known),
                learnedTotal = journey.Sum(j => j.Learned),
                studyingTotal = journey.Sum(j => j.Studied - j.Known),
                daysThisWeek = dates.Count(d => d >= today.AddDays(-6) && d <= today),
                dailyNewWords = user?.DailyNewWords ?? 10
            });
        }

        // GET api/Home/discover → kullanıcının seviyesinden henüz çalışmadığı rastgele kelimeler
        [HttpGet("discover")]
        public async Task<IActionResult> Discover([FromQuery] int count = 10)
        {
            int userId = GetUserId();
            var placement = await _placement.GetResultAsync(userId);
            string level = placement?.PlacementLevel ?? "A1";

            var words = (await _home.GetDiscoverWordsAsync(userId, level, Math.Clamp(count, 1, 30))).ToList();
            foreach (var w in words)   // listede sadece kısa, temiz anlam
                w.TurkishMeaning = ChoiceQuestionBuilder.ShortMeaning(w.TurkishMeaning) ?? w.TurkishMeaning;

            return Ok(new { level, words });
        }
    }
}