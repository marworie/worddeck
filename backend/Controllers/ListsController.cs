using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WordDeck.Dtos;
using WordDeck.Repositories;

namespace WordDeck.Controllers
{
    // Kelime defteri: listeler, favoriler, listedeki kelimeler
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ListsController : ControllerBase
    {
        private readonly IWordListRepository _lists;
        private readonly IWordRepository _words;

        public ListsController(IWordListRepository lists, IWordRepository words)
        {
            _lists = lists;
            _words = words;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET api/Lists → tüm listeler (favoriler yoksa oluşturulur, hep görünsün)
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            int userId = GetUserId();
            await _lists.GetOrCreateFavoritesAsync(userId);
            return Ok(await _lists.GetListsAsync(userId));
        }

        // POST api/Lists   { "name": "İş İngilizcesi" }
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] WordListNameDto dto)
        {
            int userId = GetUserId();
            string name = dto.Name.Trim();

            if (await _lists.NameExistsAsync(userId, name))
                return BadRequest(new { message = "Bu isimde bir listen zaten var." });

            int id = await _lists.CreateListAsync(userId, name);
            return Ok(new { id });
        }

        // PUT api/Lists/5   { "name": "Yeni ad" }
        [HttpPut("{id}")]
        public async Task<IActionResult> Rename(int id, [FromBody] WordListNameDto dto)
        {
            int userId = GetUserId();
            var list = await _lists.GetListAsync(userId, id);
            if (list == null) return NotFound(new { message = "Liste bulunamadı." });
            if (list.IsFavorites) return BadRequest(new { message = "Favoriler listesinin adı değiştirilemez." });

            string name = dto.Name.Trim();
            if (await _lists.NameExistsAsync(userId, name, id))
                return BadRequest(new { message = "Bu isimde bir listen zaten var." });

            await _lists.RenameListAsync(id, name);
            return NoContent();
        }

        // DELETE api/Lists/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var list = await _lists.GetListAsync(GetUserId(), id);
            if (list == null) return NotFound(new { message = "Liste bulunamadı." });
            if (list.IsFavorites) return BadRequest(new { message = "Favoriler listesi silinemez." });

            await _lists.DeleteListAsync(id);
            return NoContent();
        }

        // GET api/Lists/5/words
        [HttpGet("{id}/words")]
        public async Task<IActionResult> GetWords(int id)
        {
            int userId = GetUserId();
            var list = await _lists.GetListAsync(userId, id);
            if (list == null) return NotFound(new { message = "Liste bulunamadı." });

            return Ok(new { list, words = await _lists.GetListWordsAsync(userId, id) });
        }

        // POST api/Lists/5/words/123 → listeye ekle
        [HttpPost("{id}/words/{wordId}")]
        public async Task<IActionResult> AddWord(int id, int wordId)
        {
            if (await _lists.GetListAsync(GetUserId(), id) == null)
                return NotFound(new { message = "Liste bulunamadı." });
            if (await _words.GetByIdAsync(wordId) == null)
                return NotFound(new { message = "Kelime bulunamadı." });

            await _lists.AddToListAsync(id, wordId);
            return NoContent();
        }

        // DELETE api/Lists/5/words/123 → listeden çıkar
        [HttpDelete("{id}/words/{wordId}")]
        public async Task<IActionResult> RemoveWord(int id, int wordId)
        {
            if (await _lists.GetListAsync(GetUserId(), id) == null)
                return NotFound(new { message = "Liste bulunamadı." });

            await _lists.RemoveFromListAsync(id, wordId);
            return NoContent();
        }

        // POST api/Lists/favorites/123 → favoriyse çıkar, değilse ekle
        [HttpPost("favorites/{wordId}")]
        public async Task<IActionResult> ToggleFavorite(int wordId)
        {
            if (await _words.GetByIdAsync(wordId) == null)
                return NotFound(new { message = "Kelime bulunamadı." });

            int favId = await _lists.GetOrCreateFavoritesAsync(GetUserId());
            bool isFavorite = await _lists.IsInListAsync(favId, wordId);

            if (isFavorite) await _lists.RemoveFromListAsync(favId, wordId);
            else await _lists.AddToListAsync(favId, wordId);

            return Ok(new { isFavorite = !isFavorite });
        }
    }
}