using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;
using WordDeck.Services;

namespace WordDeck.Controllers
{
    // Kelime detayları (anlam, tanım, örnek), kullanıcının kendi anlamı ve kelime ağı
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WordsController : ControllerBase
    {
        private readonly IWordRepository _words;
        private readonly WordDetailsService _details;
        private readonly WordNetworkService _network;
        private readonly IWordListRepository _lists;

        public WordsController(IWordRepository words, WordDetailsService details, WordNetworkService network, IWordListRepository lists)
        {
            _words = words;
            _details = details;
            _network = network;
            _lists = lists;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

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

            // Sonradan eklenen alanlar: eksikse ikisini aynı anda tamamla
            Task<string?> exampleTask = word.Example != null && word.ExampleTr == null
                ? _details.TranslateExampleAsync(word.Example)
                : Task.FromResult<string?>(null);
            Task<(bool Ok, string? Ipa)> phoneticTask = word.Phonetic == null
                ? _details.FetchPhoneticAsync(word.Headword)
                : Task.FromResult<(bool, string?)>((false, null));
            await Task.WhenAll(exampleTask, phoneticTask);

            string? exampleTr = exampleTask.Result;
            string? phonetic = phoneticTask.Result.Ok ? phoneticTask.Result.Ipa : null;   // "" de kaydedilir: bir daha arama

            if (exampleTr != null || phonetic != null)
            {
                await _words.SaveExtrasAsync(id, exampleTr, phonetic);
                word.ExampleTr = exampleTr ?? word.ExampleTr;
                word.Phonetic = phonetic ?? word.Phonetic;
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
                word.Example,
                word.ExampleTr,
                Phonetic = string.IsNullOrEmpty(word.Phonetic) ? null : word.Phonetic
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

        // GET api/Words/15/network → eş/zıt anlamlılar, ilişkili ve birlikte kullanılan kelimeler
        [HttpGet("{id}/network")]
        public async Task<IActionResult> GetNetwork(int id)
        {
            var word = await _words.GetByIdAsync(id);
            if (word == null) return NotFound(new { message = "Kelime bulunamadı." });

            return Ok(await _network.GetNetworkAsync(word.Headword, word.PartOfSpeech));
        }

                // GET api/Words/search?q=abil&level=B1&pos=noun
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] string? level, [FromQuery] string? pos)
        {
            // LIKE'ta % ve _ özel karakter: kullanıcı yazarsa joker gibi davranmasın diye kaçışla
            string? query = string.IsNullOrWhiteSpace(q) ? null
                : q.Trim().Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

            level = string.IsNullOrWhiteSpace(level) ? null : level.ToUpperInvariant();
            pos = string.IsNullOrWhiteSpace(pos) ? null : pos.ToLowerInvariant();

            // Hiç filtre yoksa tüm sözlüğü döndürme
            if (query == null && level == null && pos == null)
                return Ok(Array.Empty<WordSummaryDto>());

            return Ok(await _lists.SearchAsync(GetUserId(), query, level, pos, 40));
        }

        // POST api/Words/123/study → kelimeyi çalışmaya ekle (bugünkü kartlarına girer)
        [HttpPost("{id}/study")]
        public async Task<IActionResult> AddToStudy(int id)
        {
            if (await _words.GetByIdAsync(id) == null)
                return NotFound(new { message = "Kelime bulunamadı." });

            await _lists.AddToStudyAsync(GetUserId(), id, AppClock.Today);
            return NoContent();
        }
    }
}