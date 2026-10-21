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
        private readonly IThemeRepository _themes;

        public QuizController(IQuizRepository quiz, IHardRepository hard, IWordListRepository lists,
                              IPlacementRepository placement, IThemeRepository themes)
        {
            _quiz = quiz;
            _hard = hard;
            _lists = lists;
            _placement = placement;
            _themes = themes;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Quiz?level=B1 | ?listId=3 | ?themeId=2 (&level=B1)   &count=10   &sections=reading,listening
        [HttpGet]
        public async Task<IActionResult> GetQuestions([FromQuery] string? level, [FromQuery] int? listId,
            [FromQuery] int? themeId, [FromQuery] string? sections, [FromQuery] int count = 10)
        {
            int userId = GetUserId();
            count = Math.Clamp(count, 5, 50);

            // Seçilen bölümler: "reading,listening". Boşsa 4 bölümün hepsi
            var chosen = (sections ?? "")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant())
                .Distinct()
                .ToList();
            if (chosen.Any(s => !QuizSections.All.Contains(s)))
                return BadRequest(new { message = "Geçersiz bölüm." });

            // Bazı bölümler seçildiyse her kelimeyle soru kurulamayabilir: fazladan kelime çek
            int fetchCount = chosen.Count is > 0 and < 4 ? count * 2 : count;

            IEnumerable<PracticeQuestionDto> words;
            if (listId.HasValue)
            {
                // Başkasının listesinden sınav olunamasın
                if (await _lists.GetListAsync(userId, listId.Value) == null)
                    return NotFound(new { message = "Liste bulunamadı." });
                words = await _quiz.GetListQuizWordsAsync(userId, listId.Value, fetchCount);
            }
            else if (themeId.HasValue)
            {
                if (!await _themes.ExistsAsync(themeId.Value))
                    return NotFound(new { message = "Tema bulunamadı." });
                string? themeLevel = string.IsNullOrWhiteSpace(level) ? null : level.ToUpperInvariant();
                words = await _themes.GetQuizWordsAsync(userId, themeId.Value, themeLevel, fetchCount);
            }
            else
            {
                level = (level ?? "").ToUpperInvariant();
                if (!Levels.All.Contains(level))
                    return BadRequest(new { message = "Geçersiz seviye." });
                words = await _quiz.GetQuizWordsAsync(userId, level, fetchCount);
            }

            var wordList = words.ToList();

            // Çeldirici havuzları: her seviye için bir kez çek (listeden sınavda seviyeler karışık olabilir)
            var pools = new Dictionary<string, List<WordInfo>>();
            foreach (var lvl in wordList.Select(w => w.Level).Distinct())
                pools[lvl] = (await _placement.GetPoolAsync(lvl, 300)).ToList();

            var assigned = QuizSectionBuilder.AssignSections(wordList.Count, chosen);
            var questions = new List<PracticeQuestionDto>();

            for (int i = 0; i < wordList.Count && questions.Count < count; i++)
            {
                var q = wordList[i];
                var info = new WordInfo(q.WordId, q.Headword, q.PartOfSpeech, q.TurkishMeaning, q.Definition, q.Example);

                // Kurulamazsa sadece seçilen bölümler arasında başka bölüm dener
                var built = QuizSectionBuilder.BuildWithFallback(assigned[i], info, pools[q.Level], null, chosen);
                if (built == null) continue;   // bu kelimeyle düzgün soru kurulamadı: atla

                q.Section = built.Section;
                q.QuestionType = built.QuestionType;
                q.ChoiceType = built.ChoiceType;
                q.Prompt = built.Prompt;
                q.Options = built.Options;
                q.Audio = built.Audio;
                q.Hint = built.Hint;
                if (built.QuestionType == QuestionTypes.Cloze) q.ClozeSentence = built.Prompt;
                q.CleanMeaning = ChoiceQuestionBuilder.ShortMeaning(q.TurkishMeaning);

                questions.Add(q);
            }

            // Bölümler sırayla gelsin: okuma, dinleme, yazma, konuşma
            return Ok(questions.OrderBy(q => Array.IndexOf(QuizSections.All, q.Section)));
        }

        // POST api/Quiz/answer → yanlışsa kelime Zorlandıklarım'a eklenir
        [HttpPost("answer")]
        public async Task<IActionResult> Answer([FromBody] PracticeAnswerDto dto)
        {
            int userId = GetUserId();

            bool correct = dto.QuestionType == QuestionTypes.Choice && dto.ChosenWordId.HasValue
                ? dto.ChosenWordId == dto.WordId   // çoktan seçmeli: sunucu kendisi kontrol ediyor 
                : dto.IsCorrect;                   // yazma, dinleme, konuşma: tarayıcının dediğine güveniyor 

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