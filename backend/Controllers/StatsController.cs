using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // İstatistik sayfası: tek istekte tüm veriler
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StatsController : ControllerBase
    {
        private const int DailyDays = 30;

        private readonly IStatsRepository _stats;
        private readonly IStudyRepository _study;
        private readonly IQuizRepository _quiz;

        public StatsController(IStatsRepository stats, IStudyRepository study, IQuizRepository quiz)
        {
            _stats = stats;
            _study = study;
            _quiz = quiz;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Stats
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            int userId = GetUserId();
            var today = AppClock.Today;
            var from = today.AddDays(-(DailyDays - 1));

            var totals = await _stats.GetTotalsAsync(userId);
            var dates = (await _study.GetStudyDatesAsync(userId)).ToList();
            var daily = (await _stats.GetDailyAsync(userId, from)).ToDictionary(d => d.Date.Date, d => d.Count);

            // Grafikte çalışılmayan günler de 0 olarak görünsün: 30 günü tek tek doldur
            var dailyFilled = Enumerable.Range(0, DailyDays)
                .Select(i => from.AddDays(i))
                .Select(d => new DailyCountDto { Date = d, Count = daily.GetValueOrDefault(d) })
                .ToList();

            int answered = totals.Correct + totals.Wrong;

            return Ok(new StatsDto
            {
                TotalStudied = totals.TotalStudied,
                Learned = totals.Learned,
                Known = totals.Known,
                TotalReviews = await _stats.GetTotalReviewsAsync(userId),
                CurrentStreak = StreakCalculator.Calculate(dates, today),
                LongestStreak = StreakCalculator.Longest(dates),
                SuccessRate = answered > 0 ? (int)Math.Round(100.0 * totals.Correct / answered) : null,
                Daily = dailyFilled,
                Boxes = (await _stats.GetBoxesAsync(userId)).ToList(),
                MostForgotten = (await _stats.GetMostForgottenAsync(userId, 5)).ToList(),
                Quizzes = (await _quiz.GetHistoryAsync(userId, 10)).Reverse().ToList()   // eskiden yeniye
            });
        }
    }
}