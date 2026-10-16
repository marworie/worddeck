using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Seviye belirleme testi: seviye seviye soru üretir, cevapları sunucuda kontrol eder
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PlacementController : ControllerBase
    {
        private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(30);

        private readonly IPlacementRepository _placement;
        private readonly IMemoryCache _cache;

        public PlacementController(IPlacementRepository placement, IMemoryCache cache)
        {
            _placement = placement;
            _cache = cache;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        private static string CacheKey(string sessionId) => $"placement:{sessionId}";

        // GET api/Placement/questions?level=A1 → 5 soru (doğru cevaplar olmadan)
        [HttpGet("questions")]
        public async Task<IActionResult> GetQuestions([FromQuery] string? level)
        {
            level = (level ?? "").ToUpperInvariant();
            if (!Levels.All.Contains(level))
                return BadRequest(new { message = "Geçersiz seviye." });

            var candidates = await _placement.GetCandidatesAsync(level, 30);
            var pool = (await _placement.GetPoolAsync(level, 300)).ToList();

            // Adaylardan soru kurulabilenleri al (bazılarında yeterli bilgi ya da çeldirici olmayabilir)
            var questions = new List<ChoiceQuestion>();
            foreach (var word in candidates)
            {
                var q = ChoiceQuestionBuilder.Build(word, pool);
                if (q != null) questions.Add(q);
                if (questions.Count == PlacementRules.QuestionsPerLevel) break;
            }

            if (questions.Count < PlacementRules.QuestionsPerLevel)
                return BadRequest(new { message = "Bu seviye için yeterli soru hazırlanamadı." });

            // Doğru cevaplar sadece sunucuda: oturum Id'siyle önbellekte 30 dakika durur
            string sessionId = Guid.NewGuid().ToString("N");
            var session = new PlacementSession(GetUserId(), level, questions.Select(q => q.AnswerId).ToList());
            _cache.Set(CacheKey(sessionId), session, SessionLifetime);

            return Ok(new
            {
                sessionId,
                level,
                questions = questions.Select(q => new { q.Type, q.Prompt, q.Options })
            });
        }

        // POST api/Placement/answer → doğru sayısı ve karar (sonraki seviye ya da sonuç)
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] PlacementAnswerDto dto)
        {
            int userId = GetUserId();
            string key = CacheKey(dto.SessionId);

            if (!_cache.TryGetValue(key, out PlacementSession? session) || session!.UserId != userId)
                return BadRequest(new { message = "Test oturumu bulunamadı ya da süresi doldu." });

            _cache.Remove(key);   // aynı cevaplar ikinci kez gönderilemesin

            // Sıradaki cevabı sıradaki doğru cevapla karşılaştır
            var results = session.AnswerIds
                .Select((answerId, i) => i < dto.Answers.Count && dto.Answers[i] == answerId)
                .ToList();
            int correct = results.Count(r => r);

            var decision = PlacementRules.Decide(session.Level, correct);
            if (decision.Finished)
                await _placement.SaveResultAsync(userId, decision.Level);

            return Ok(new
            {
                correct,
                total = results.Count,
                results,                          // her soru doğru mu
                correctIds = session.AnswerIds,   // seviye bitti, artık doğruları göstermek sorun değil
                decision.Finished,
                decision.Level
            });
        }

        // GET api/Placement/result → son test sonucu
        [HttpGet("result")]
        public async Task<IActionResult> GetResult() =>
            Ok(await _placement.GetResultAsync(GetUserId()));
    }

    // Önbellekte tutulan test oturumu
    public record PlacementSession(int UserId, string Level, List<int> AnswerIds);
}