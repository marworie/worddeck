using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WordsController : ControllerBase
    {
        private readonly IWordRepository _words;
        private readonly WordDetailsService _details;

        public WordsController(IWordRepository words, WordDetailsService details)
        {
            _words = words;
            _details = details;
        }

        // GET api/Words/15/details
        // Bilgiler daha önce çekildiyse veritabanından, çekilmediyse dış API'lerden getirir ve kaydeder
        [HttpGet("{id}/details")]
        public async Task<IActionResult> GetDetails(int id)
        {
            var word = await _words.GetByIdAsync(id);
            if (word == null) return NotFound(new { message = "Kelime bulunamadı." });

            if (word.DetailsFetchedAt == null)
            {
                var result = await _details.FetchAsync(word.Headword, word.PartOfSpeech);

                // Gelen ne varsa kaydet; ikisi de başarılıysa "tamamlandı" işaretle
                await _words.SaveDetailsAsync(id, result.TurkishMeaning, result.Definition, result.Example, result.Complete);

                word.TurkishMeaning = result.TurkishMeaning ?? word.TurkishMeaning;
                word.Definition = result.Definition ?? word.Definition;
                word.Example = result.Example ?? word.Example;
            }

            return Ok(new
            {
                word.Id,
                word.Headword,
                word.TurkishMeaning,
                word.Definition,
                word.Example
            });
        }
    }
}