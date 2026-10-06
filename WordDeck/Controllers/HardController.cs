using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Zorlandıklarım: liste, çalışma soruları ve cevap kaydetme
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HardController : ControllerBase
    {
        private readonly IHardRepository _hard;

        public HardController(IHardRepository hard) => _hard = hard;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Hard → tüm zor kelimeler (frontend seviyelere göre gruplar)
        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _hard.GetHardWordsAsync(GetUserId()));

        // GET api/Hard/practice?level=B1 → bugünün soruları
        [HttpGet("practice")]
        public async Task<IActionResult> GetPractice([FromQuery] string level)
        {
            level = (level ?? "").ToUpperInvariant();
            if (!Levels.All.Contains(level))
                return BadRequest(new { message = "Geçersiz seviye." });

            var words = await _hard.GetPracticeWordsAsync(GetUserId(), level, AppClock.Today);
            var questions = new List<PracticeQuestionDto>();

            foreach (var q in words)
            {
                string? cloze = PracticeQuestionBuilder.MakeCloze(q.Example, q.Headword);
                q.QuestionType = PracticeQuestionBuilder.PickType((HardState)q.HardState, q.HardStreak, cloze != null);

                if (q.QuestionType == QuestionTypes.Cloze)
                    q.ClozeSentence = cloze;

                if (q.QuestionType == QuestionTypes.Choice)
                {
                    // 3 çeldirici + doğru cevap, karışık sırada
                    var distractors = await _hard.GetDistractorsAsync(q.Level, q.PartOfSpeech, q.WordId, 3);
                    q.Choices = distractors
                        .Append(new ChoiceDto { WordId = q.WordId, Headword = q.Headword })
                        .OrderBy(_ => Random.Shared.Next())
                        .ToList();
                }

                questions.Add(q);
            }

            return Ok(questions);
        }

        // POST api/Hard/answer
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] PracticeAnswerDto dto)
        {
            int userId = GetUserId();

            var row = await _hard.GetProgressAsync(userId, dto.WordId);
            if (row == null || row.HardState == 0)
                return NotFound(new { message = "Bu kelime zor listende değil." });

            // Çoktan seçmelide doğruluğu sunucu kendisi kontrol etsin
            bool correct = dto.QuestionType == QuestionTypes.Choice && dto.ChosenWordId.HasValue
                ? dto.ChosenWordId == dto.WordId
                : dto.IsCorrect;

            var next = HardWordRules.Answer(row.ToProgress(), correct, AppClock.Today);
            await _hard.SaveAnswerAsync(userId, dto.WordId, next, dto.QuestionType, correct);

            // Yanlış şık seçildiyse "karıştırdıkların"a kaydet
            if (!correct && dto.ChosenWordId is int other && other != dto.WordId)
                await _hard.AddConfusionAsync(userId, dto.WordId, other);

            return Ok(new
            {
                correct,
                state = (int)next.State,
                streak = next.Streak,
                stateChanged = next.State != (HardState)row.HardState   // frontend "🟡 Güçleniyor!" gibi kutlama göstersin
            });
        }

                // GET api/Hard/confusions?min=2 → sık karıştırılan çiftler (karşılaştırma kartları)
        [HttpGet("confusions")]
        public async Task<IActionResult> GetConfusions([FromQuery] int min = 2) =>
            Ok(await _hard.GetConfusionsAsync(GetUserId(), Math.Max(1, min), 30));

        // GET api/Hard/insights → durum sayıları, türlere göre zorlanma, soru tiplerine göre başarı
        [HttpGet("insights")]
        public async Task<IActionResult> GetInsights()
        {
            int userId = GetUserId();
            var weekAgo = AppClock.Today.AddDays(-7);

            var counts = await _hard.GetStateCountsAsync(userId, weekAgo);
            var byPos = await _hard.GetPosStatsAsync(userId);
            var byType = await _hard.GetQuestionTypeStatsAsync(userId, weekAgo);
            var confusions = await _hard.GetConfusionsAsync(userId, 2, 3);   // en çok karıştırılan 3 çift

            return Ok(new InsightsDto
            {
                HardCount = counts.Hard,
                StrengtheningCount = counts.Strengthening,
                MasteredCount = counts.Mastered,
                MasteredThisWeek = counts.MasteredThisWeek,
                ByPartOfSpeech = byPos.ToList(),
                ByQuestionType = byType.ToList(),
                TopConfusions = confusions.ToList()
            });
        }
    }
}