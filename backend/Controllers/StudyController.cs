using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

// Çalışma oturumu, cevap kaydetme, son cevabı geri alma ve ilerleme

namespace WordDeck.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudyController : ControllerBase
    {
        private readonly IStudyRepository _study;
        private readonly IUserRepository _users;
        private readonly IMemoryCache _cache;   // son cevabı geri almak için

        public StudyController(IStudyRepository study, IUserRepository users, IMemoryCache cache)
        {
            _study = study;
            _users = users;
            _cache = cache;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        private static string UndoKey(int userId) => $"study-undo:{userId}";

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

        // POST api/Study/answer   { "wordId": 15, "rating": 2 }
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] AnswerDto dto)
        {
            if (!await _study.WordExistsAsync(dto.WordId))
                return NotFound(new { message = "Kelime bulunamadı." });

            int userId = GetUserId();
            var today = AppClock.Today;

            // Geri alınabilsin diye kartın cevaptan önceki halini al
            var previous = await _study.GetSnapshotAsync(userId, dto.WordId);

            // Leitner hesabı: yeni kutu ve bir sonraki tekrar tarihi
            int? currentBox = await _study.GetBoxAsync(userId, dto.WordId);
            var rating = (Rating)dto.Rating;
            bool known = rating != Rating.Again;   // "Zor hatırladım" da doğru sayılır, sadece Bilmiyorum yanlış
            var (newBox, next) = LeitnerService.Next(currentBox, rating, today);

            await _study.SaveAnswerAsync(userId, dto.WordId, newBox, next, known, today);

            // Sadece son cevap geri alınabilir: öncekinin üstüne yazılır, 30 dk sonra kendiliğinden silinir
            _cache.Set(UndoKey(userId), new StudyUndo(dto.WordId, previous), TimeSpan.FromMinutes(30));

            return Ok(new
            {
                newBox,
                nextReviewDate = next.ToString("yyyy-MM-dd"),
                learned = newBox == LeitnerService.LearnedBox
            });
        }

        // POST api/Study/undo → son kart cevabını geri al
        [HttpPost("undo")]
        public async Task<IActionResult> Undo()
        {
            int userId = GetUserId();
            if (!_cache.TryGetValue(UndoKey(userId), out StudyUndo? undo) || undo == null)
                return BadRequest(new { message = "Geri alınacak cevap yok." });

            _cache.Remove(UndoKey(userId));   // aynı cevap iki kez geri alınamasın
            await _study.RestoreAsync(userId, undo.WordId, undo.Previous, AppClock.Today);
            return Ok(new { wordId = undo.WordId });
        }

        // GET api/Study/progress
        [HttpGet("progress")]
        public async Task<IActionResult> GetProgress()
        {
            int userId = GetUserId();
            var today = AppClock.Today;

            var levels = await _study.GetProgressAsync(userId, today);
            var dates = await _study.GetStudyDatesAsync(userId);

            var user = await _users.GetByIdAsync(userId);
            int todayReviewed = await _study.GetTodayReviewedAsync(userId, today);

            return Ok(new ProgressDto
            {
                Levels = levels.ToList(),
                Streak = StreakCalculator.Calculate(dates, today),
                TodayReviewed = todayReviewed,
                DailyGoal = user?.DailyGoal ?? 20
            });
        }
    }

    // Önbellekte tutulan son cevap: hangi kelime ve cevaptan önceki hali
    public record StudyUndo(int WordId, UserWordSnapshot? Previous);
}