using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Sınav: soru üretme, cevap kaydetme, sonuç kaydetme ve geçmiş
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class QuizController : ControllerBase
    {
        private readonly IQuizRepository _quiz;
        private readonly IHardRepository _hard;   // karıştırma kaydı için
        private readonly IWordListRepository _lists;
        private readonly IPlacementRepository _placement;   // çeldirici havuzu

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Quiz?level=B1&count=10   ya da   GET api/Quiz?listId=3&count=10
        [HttpGet]
        public async Task<IActionResult> GetQuestions([FromQuery] string? level, [FromQuery] int? listId, [FromQuery] int count = 10)
        {
            int userId = GetUserId();
            count = Math.Clamp(count, 5, 50);

            IEnumerable<PracticeQuestionDto> words;
            if (listId.HasValue)
            {
                // Başkasının listesinden sınav olunamasın
                if (await _lists.GetListAsync(userId, listId.Value) == null)
                    return NotFound(new { message = "Liste bulunamadı." });
                words = await _quiz.GetListQuizWordsAsync(userId, listId.Value, count);
            }
            else
            {
                level = (level ?? "").ToUpperInvariant();
                if (!Levels.All.Contains(level))
                    return BadRequest(new { message = "Geçersiz seviye." });
                words = await _quiz.GetQuizWordsAsync(userId, level, count);
            }

                       var wordList = words.ToList();

            // Çeldirici havuzları: her seviye için bir kez çek (listeden sınavda seviyeler karışık olabilir)
            var pools = new Dictionary<string, List<WordInfo>>();
            foreach (var lvl in wordList.Select(w => w.Level).Distinct())
                pools[lvl] = (await _placement.GetPoolAsync(lvl, 300)).ToList();

            var questions = new List<PracticeQuestionDto>();
            foreach (var q in wordList)
            {
                // Şimdilik hepsi seviye testindeki gibi çoktan seçmeli.
                // (Okuma/dinleme/yazma/konuşma bölümleri sonra eklenecek)
                var info = new WordInfo(q.WordId, q.Headword, q.PartOfSpeech, q.TurkishMeaning, q.Definition, q.Example);
                var built = ChoiceQuestionBuilder.Build(info, pools[q.Level]);

                if (built != null)
                {
                    q.QuestionType = QuestionTypes.Choice;
                    q.ChoiceType = built.Type;
                    q.Prompt = built.Prompt;
                    q.Options = built.Options;
                }
                else
                {
                    // Kaliteli şık kurulamadı: anlam göstermeyen dinleme sorusu (bozuk çeviri ekrana çıkmasın)
                    q.QuestionType = QuestionTypes.Listening;
                }

                questions.Add(q);
            }

            return Ok(questions);
        }

        // POST api/Quiz/answer → yanlışsa kelime Zorlandıklarım'a eklenir
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] PracticeAnswerDto dto)
        {
            int userId = GetUserId();

            bool correct = dto.QuestionType == QuestionTypes.Choice && dto.ChosenWordId.HasValue
                ? dto.ChosenWordId == dto.WordId
                : dto.IsCorrect;

            await _quiz.LogAnswerAsync(userId, dto.WordId, dto.QuestionType, correct);

            if (!correct)
            {
                await _quiz.MarkHardAsync(userId, dto.WordId, AppClock.Today);

                if (dto.ChosenWordId is int other && other != dto.WordId)
                    await _hard.AddConfusionAsync(userId, dto.WordId, other);
            }

            return Ok(new { correct, addedToHard = !correct });
        }

        // POST api/Quiz/finish → sınav sonucunu kaydet
        [HttpPost("finish")]
        public async Task<IActionResult> Finish([FromBody] QuizFinishDto dto)
        {
            int id = await _quiz.SaveResultAsync(GetUserId(), dto);
            return Ok(new { id });
        }

        // GET api/Quiz/history → son 5 sınav
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory() =>
            Ok(await _quiz.GetHistoryAsync(GetUserId(), 5));

        public QuizController(IQuizRepository quiz, IHardRepository hard, IWordListRepository lists, IPlacementRepository placement)
        {
            _quiz = quiz;
            _hard = hard;
            _lists = lists;
            _placement = placement;
        }
    }
}