using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Öğrenme yolu: seviyeye göre sıralı tema üniteleri, ünite testi, kilit açma
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PathController : ControllerBase
    {
        private readonly IPathRepository _path;

        public PathController(IPathRepository path) => _path = path;

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // Seviyenin üniteleri, durumları ve en iyi puanlar
        private async Task<(List<PathUnit> Units, List<PathUnitDto> Dtos)> LoadAsync(int userId, string level)
        {
            var units = PathRules.BuildUnits(await _path.GetLevelWordsAsync(level));
            var progress = (await _path.GetProgressAsync(userId, level)).ToList();

            var completed = progress
                .Where(p => p.CompletedAt != null)
                .Select(p => (p.ThemeId, p.Part))
                .ToHashSet();
            var statuses = PathRules.Statuses(units, completed);

            var dtos = units.Select((u, i) => new PathUnitDto
            {
                Order = u.Order,
                ThemeId = u.ThemeId,
                Name = u.ThemeName,
                Icon = u.Icon,
                Part = u.Part,
                PartCount = u.PartCount,
                WordCount = u.WordIds.Count,
                Status = statuses[i],
                BestScore = progress.FirstOrDefault(p => p.ThemeId == u.ThemeId && p.Part == u.Part)?.BestScore
            }).ToList();

            return (units, dtos);
        }

        // GET api/Path/A2
        [HttpGet("{level}")]
        public async Task<IActionResult> Get(string level)
        {
            if (!PathRules.Levels.Contains(level)) return BadRequest("Geçersiz seviye");
            var (_, dtos) = await LoadAsync(GetUserId(), level);
            return Ok(new PathDto { Level = level, Units = dtos, CompletedCount = dtos.Count(u => u.Status == "completed") });
        }

        // GET api/Path/A2/unit/5/1
        [HttpGet("{level}/unit/{themeId:int}/{part:int}")]
        public async Task<IActionResult> GetUnit(string level, int themeId, int part)
        {
            if (!PathRules.Levels.Contains(level)) return BadRequest("Geçersiz seviye");
            int userId = GetUserId();
            var (units, dtos) = await LoadAsync(userId, level);

            int i = units.FindIndex(u => u.ThemeId == themeId && u.Part == part);
            if (i < 0) return NotFound();
            if (dtos[i].Status == "locked") return StatusCode(403, "Bu ünite henüz kilitli");

            return Ok(new PathUnitDetailDto
            {
                Unit = dtos[i],
                Words = (await _path.GetWordsAsync(userId, units[i].WordIds))
                    .Select(w => { w.TurkishMeaning = ChoiceQuestionBuilder.ShortMeaning(w.TurkishMeaning); return w; })
                    .ToList()
            });
        }

        // POST api/Path/A2/unit/5/1/study
        [HttpPost("{level}/unit/{themeId:int}/{part:int}/study")]
        public async Task<IActionResult> AddToStudy(string level, int themeId, int part)
        {
            if (!PathRules.Levels.Contains(level)) return BadRequest("Geçersiz seviye");
            int userId = GetUserId();
            var (units, _) = await LoadAsync(userId, level);

            var unit = units.FirstOrDefault(u => u.ThemeId == themeId && u.Part == part);
            if (unit == null) return NotFound();

            int added = await _path.AddToStudyAsync(userId, unit.WordIds, AppClock.Today);
            return Ok(new { added });
        }

        // POST api/Path/A2/unit/5/1/result  { "correct": 9, "total": 10 }
        [HttpPost("{level}/unit/{themeId:int}/{part:int}/result")]
        public async Task<IActionResult> SaveResult(string level, int themeId, int part, [FromBody] PathResultRequest req)
        {
            if (!PathRules.Levels.Contains(level)) return BadRequest("Geçersiz seviye");
            int userId = GetUserId();
            var (units, dtos) = await LoadAsync(userId, level);

            int i = units.FindIndex(u => u.ThemeId == themeId && u.Part == part);
            if (i < 0) return NotFound();
            if (dtos[i].Status == "locked") return StatusCode(403, "Bu ünite henüz kilitli");

            int score = PathRules.Score(req.Correct, req.Total);
            bool passed = PathRules.Passed(score);
            bool wasCompleted = dtos[i].Status == "completed";

            await _path.SaveResultAsync(userId, level, themeId, part, score, passed);

            return Ok(new PathResultDto
            {
                Score = score,
                Passed = passed,
                BestScore = Math.Max(score, dtos[i].BestScore ?? 0),
                NextUnlocked = passed && !wasCompleted && i + 1 < units.Count
            });
        }
    }
}