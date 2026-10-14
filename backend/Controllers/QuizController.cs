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
        private readonly IHardRepository _hard;   // çeldiriciler ve karıştırma kaydı için

        public QuizController(IQuizRepository quiz, IHardRepository hard)
        {
            _quiz = quiz;
            _hard = hard;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Quiz?level=B1&count=10
        [HttpGet]
        public async Task<IActionResult> GetQuestions([FromQuery] string level, [FromQuery] int count = 10)
        {
            level = (level ?? "").ToUpperInvariant();
            if (!Levels.All.Contains(level))
                return BadRequest(new { message = "Geçersiz seviye." });

            count = Math.Clamp(count, 5, 50);   // 5 ile 50 arasına sıkıştır

            var words = await _quiz.GetQuizWordsAsync(GetUserId(), level, count);
            var questions = new List<PracticeQuestionDto>();

            foreach (var q in words)
            {
                string? cloze = PracticeQuestionBuilder.MakeCloze(q.Example, q.Headword);
                q.QuestionType = PracticeQuestionBuilder.PickRandomType(cloze != null);

                if (q.QuestionType == QuestionTypes.Cloze)
                    q.ClozeSentence = cloze;

                if (q.QuestionType == QuestionTypes.Choice)
                {
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
    }
}