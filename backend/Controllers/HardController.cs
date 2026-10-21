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
        private readonly IPlacementRepository _placement;   // çeldirici havuzu

        public HardController(IHardRepository hard, IPlacementRepository placement)
        {
            _hard = hard;
            _placement = placement;
        }

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
            var pool = (await _placement.GetPoolAsync(level, 300)).ToList();
            var questions = new List<PracticeQuestionDto>();

            foreach (var q in words)
            {
                var info = new WordInfo(q.WordId, q.Headword, q.PartOfSpeech, q.TurkishMeaning, q.Definition, q.Example);
                string? cloze = ChoiceQuestionBuilder.GoodCloze(q.Example, q.Headword);
                string? meaning = QuizSectionBuilder.CleanMeaning(info);

                // Kelimenin durumuna göre istenen tip; kurulamazsa sırayla daha basit tiplere düş.
                // Dinleme her zaman kurulabilir (anlam göstermiyor)
                string wanted = PracticeQuestionBuilder.PickType((HardState)q.HardState, q.HardStreak, cloze != null);
                var order = new[] { wanted, QuestionTypes.Choice, QuestionTypes.Cloze, QuestionTypes.Typing, QuestionTypes.Listening }.Distinct();

                foreach (var type in order)
                    if (TryBuild(q, type, info, pool, cloze, meaning)) break;

                q.CleanMeaning = ChoiceQuestionBuilder.ShortMeaning(q.TurkishMeaning);
                questions.Add(q);
            }

            return Ok(questions);
        }

        // Soruyu istenen tipte temiz içerikle kurar. Gerekli bilgi yoksa false döner
        private static bool TryBuild(PracticeQuestionDto q, string type, WordInfo info, List<WordInfo> pool,
                                     string? cloze, string? meaning)
        {
            switch (type)
            {
                case QuestionTypes.Choice:
                    var built = ChoiceQuestionBuilder.Build(info, pool);
                    if (built == null) return false;
                    q.ChoiceType = built.Type;
                    q.Prompt = built.Prompt;
                    q.Options = built.Options;
                    break;

                case QuestionTypes.Cloze:
                    if (cloze == null) return false;
                    q.ClozeSentence = cloze;
                    q.Hint = meaning;   // temiz değilse ipucu hiç gösterilmez
                    break;

                case QuestionTypes.Typing:
                case QuestionTypes.Speaking:
                    // Önce temiz Türkçe anlam, yoksa boşluklu cümle
                    string? prompt = meaning ?? cloze;
                    if (prompt == null) return false;
                    q.Prompt = prompt;
                    break;

                case QuestionTypes.Listening:
                    break;

                default:
                    return false;
            }

            q.QuestionType = type;
            return true;
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