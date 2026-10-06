using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

// Çalışma oturumu, cevap kaydetme ve ilerleme

namespace WordDeck.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudyController : ControllerBase
    {
        private readonly IStudyRepository _study;
        private readonly IUserRepository _users;

        public StudyController(IStudyRepository study, IUserRepository users)
        {
            _study = study;
            _users = users;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Study/session?level=B1
        [HttpGet("session")]
        public async Task<IActionResult> GetSession([FromQuery] string level)
        {
            level = (level ?? "").ToUpperInvariant();
            if (!Levels.All.Contains(level))
                return BadRequest(new { message = "Geçersiz seviye." });

            int userId = GetUserId();
            var user = await _users.GetByIdAsync(userId);
            if (user == null) return Unauthorized();

            var today = AppClock.Today;
            var due = await _study.GetDueCardsAsync(userId, level, today);
            var fresh = await _study.GetNewCardsAsync(userId, level, user.DailyNewWords);

            // Önce tekrarlar, sonra yeni kelimeler
            return Ok(due.Concat(fresh));
        }

        // POST api/Study/answer   { "wordId": 15, "known": true }
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] AnswerDto dto)
        {
            if (!await _study.WordExistsAsync(dto.WordId))
                return NotFound(new { message = "Kelime bulunamadı." });

            int userId = GetUserId();
            var today = AppClock.Today;

            // Leitner hesabı: yeni kutu ve bir sonraki tekrar tarihi
            int? currentBox = await _study.GetBoxAsync(userId, dto.WordId);
            var (newBox, next) = LeitnerService.Next(currentBox, dto.Known, today);

            await _study.SaveAnswerAsync(userId, dto.WordId, newBox, next, dto.Known, today);

            return Ok(new
            {
                newBox,
                nextReviewDate = next.ToString("yyyy-MM-dd"),
                learned = newBox == LeitnerService.LearnedBox
            });
        }

        // GET api/Study/progress
        [HttpGet("progress")]
        public async Task<IActionResult> GetProgress()
        {
            int userId = GetUserId();
            var today = AppClock.Today;

            var levels = await _study.GetProgressAsync(userId, today);
            var dates = await _study.GetStudyDatesAsync(userId);

            return Ok(new ProgressDto
            {
                Levels = levels.ToList(),
                Streak = StreakCalculator.Calculate(dates, today)
            });
        }
    }
}