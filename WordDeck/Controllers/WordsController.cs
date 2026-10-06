using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;
using System.Security.Claims;
using WordDeck.Dtos;

namespace WordDeck.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WordsController : ControllerBase
    {
        private readonly IWordRepository _words;
        private readonly WordDetailsService _details;
        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        public WordsController(IWordRepository words, WordDetailsService details)
        {
            _words = words;
            _details = details;
        }

        // GET api/Words/15/details
        // Bilgiler daha önce (tam) çekildiyse veritabanından, çekilmediyse dış API'lerden getirir ve kaydeder
        [HttpGet("{id}/details")]
        public async Task<IActionResult> GetDetails(int id)
        {
            var word = await _words.GetByIdAsync(id);
            if (word == null) return NotFound(new { message = "Kelime bulunamadı." });

            if (word.DetailsFetchedAt == null)
            {
                var result = await _details.FetchAsync(word.Headword, word.PartOfSpeech);

                // Gelen ne varsa kaydet; hepsi başarılıysa "tamamlandı" işaretle
                await _words.SaveDetailsAsync(id, result.TurkishMeaning, result.Definition,
                    result.DefinitionTr, result.Example, result.Complete);

                word.TurkishMeaning = result.TurkishMeaning ?? word.TurkishMeaning;
                word.Definition = result.Definition ?? word.Definition;
                word.DefinitionTr = result.DefinitionTr ?? word.DefinitionTr;
                word.Example = result.Example ?? word.Example;
            }

            // Kullanıcı bu kelimenin anlamını kendisi düzelttiyse onu göster
            string? customMeaning = await _words.GetCustomMeaningAsync(GetUserId(), id);

            return Ok(new
            {
                word.Id,
                word.Headword,
                TurkishMeaning = customMeaning ?? word.TurkishMeaning,
                IsCustomMeaning = customMeaning != null,
                word.Definition,
                word.DefinitionTr,
                word.Example
            });
        }

                // PUT api/Words/15/meaning   { "meaning": "koşmak" }   (boş gönderilirse otomatik çeviriye döner)
        [HttpPut("{id}/meaning")]
        public async Task<IActionResult> SetMeaning(int id, [FromBody] MeaningDto dto)
        {
            var word = await _words.GetByIdAsync(id);
            if (word == null) return NotFound(new { message = "Kelime bulunamadı." });

            string? meaning = string.IsNullOrWhiteSpace(dto.Meaning) ? null : dto.Meaning.Trim();
            await _words.SaveCustomMeaningAsync(GetUserId(), id, meaning, AppClock.Today);

            return Ok(new { turkishMeaning = meaning ?? word.TurkishMeaning, isCustomMeaning = meaning != null });
        }
    }
}