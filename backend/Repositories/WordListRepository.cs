using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IWordListRepository
    {
        Task<IEnumerable<WordSummaryDto>> SearchAsync(int userId, string? query, string? level, string? pos, int limit);
        Task<IEnumerable<WordListDto>> GetListsAsync(int userId);
        Task<WordListDto?> GetListAsync(int userId, int listId);
        Task<bool> NameExistsAsync(int userId, string name, int? exceptListId = null);
        Task<int> CreateListAsync(int userId, string name);
        Task RenameListAsync(int listId, string name);
        Task DeleteListAsync(int listId);
        Task<IEnumerable<WordSummaryDto>> GetListWordsAsync(int userId, int listId);
        Task AddToListAsync(int listId, int wordId);
        Task RemoveFromListAsync(int listId, int wordId);
        Task<bool> IsInListAsync(int listId, int wordId);
        Task<int> GetOrCreateFavoritesAsync(int userId);
        Task AddToStudyAsync(int userId, int wordId, DateTime today);
    }

    public class WordListRepository : BaseRepository, IWordListRepository
    {
        public WordListRepository(IConfiguration configuration) : base(configuration) { }

        // Arama ve liste ekranlarında ortak sütunlar: kelime + kullanıcının o kelimeyle durumu.
        // Favori mi: kullanıcının favoriler listesinde var mı diye alt sorguyla bakıyoruz
        private const string SummaryColumns = @"
            w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
            COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
            CAST(uw.Box AS INT) AS Box,
            CAST(uw.HardState AS INT) AS HardState,
            CAST(CASE WHEN EXISTS (
                SELECT 1 FROM WordListItems fi
                INNER JOIN WordLists fl ON fl.Id = fi.ListId
                WHERE fl.UserId = @UserId AND fl.IsFavorites = 1 AND fi.WordId = w.Id
            ) THEN 1 ELSE 0 END AS BIT) AS IsFavorite";

        // İngilizce kelimenin başıyla ya da Türkçe anlamın herhangi bir yeriyle arama.
        // Sıralama: tam eşleşme → baştan eşleşme → anlamda geçenler
        public Task<IEnumerable<WordSummaryDto>> SearchAsync(int userId, string? query, string? level, string? pos, int limit) =>
            QueryAsync<WordSummaryDto>(
                $@"SELECT TOP (@Limit) {SummaryColumns}
                   FROM Words w
                   LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                   WHERE (@Query IS NULL
                          OR w.Headword LIKE @Query + '%'
                          OR w.TurkishMeaning LIKE '%' + @Query + '%'
                          OR uw.CustomMeaning LIKE '%' + @Query + '%')
                     AND (@Level IS NULL OR w.Level = @Level)
                     AND (@Pos IS NULL OR w.PartOfSpeech = @Pos)
                   ORDER BY CASE WHEN w.Headword = @Query THEN 0
                                 WHEN w.Headword LIKE @Query + '%' THEN 1
                                 ELSE 2 END,
                            w.Headword",
                new { UserId = userId, Query = query, Level = level, Pos = pos, Limit = limit });

        // Listeler + kelime sayıları; favoriler her zaman en üstte
        public Task<IEnumerable<WordListDto>> GetListsAsync(int userId) =>
            QueryAsync<WordListDto>(
                @"SELECT l.Id, l.Name, l.IsFavorites, COUNT(li.WordId) AS WordCount
                  FROM WordLists l
                  LEFT JOIN WordListItems li ON li.ListId = l.Id
                  WHERE l.UserId = @UserId
                  GROUP BY l.Id, l.Name, l.IsFavorites, l.CreatedAt
                  ORDER BY l.IsFavorites DESC, l.CreatedAt",
                new { UserId = userId });

        // Tek liste: sadece bu kullanıcıya aitse döner (başkasının listesine erişilemesin)
        public Task<WordListDto?> GetListAsync(int userId, int listId) =>
            QuerySingleOrDefaultAsync<WordListDto>(
                @"SELECT l.Id, l.Name, l.IsFavorites,
                         (SELECT COUNT(*) FROM WordListItems WHERE ListId = l.Id) AS WordCount
                  FROM WordLists l
                  WHERE l.Id = @ListId AND l.UserId = @UserId",
                new { UserId = userId, ListId = listId });

        public async Task<bool> NameExistsAsync(int userId, string name, int? exceptListId = null) =>
            await ExecuteScalarAsync<int>(
                @"SELECT COUNT(1) FROM WordLists
                  WHERE UserId = @UserId AND Name = @Name AND (@Except IS NULL OR Id <> @Except)",
                new { UserId = userId, Name = name, Except = exceptListId }) > 0;

        public Task<int> CreateListAsync(int userId, string name) =>
            ExecuteScalarAsync<int>(
                @"INSERT INTO WordLists (UserId, Name) VALUES (@UserId, @Name);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new { UserId = userId, Name = name });

        public Task RenameListAsync(int listId, string name) =>
            ExecuteAsync("UPDATE WordLists SET Name = @Name WHERE Id = @Id", new { Id = listId, Name = name });

        // Listeyi sil: içindeki kayıtlar ON DELETE CASCADE ile kendiliğinden silinir
        public Task DeleteListAsync(int listId) =>
            ExecuteAsync("DELETE FROM WordLists WHERE Id = @Id", new { Id = listId });

        public Task<IEnumerable<WordSummaryDto>> GetListWordsAsync(int userId, int listId) =>
            QueryAsync<WordSummaryDto>(
                $@"SELECT {SummaryColumns}
                   FROM WordListItems li
                   INNER JOIN Words w ON w.Id = li.WordId
                   LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                   WHERE li.ListId = @ListId
                   ORDER BY li.AddedAt DESC",
                new { UserId = userId, ListId = listId });

        // Zaten varsa ekleme (iki kez eklenirse birincil anahtar hatası vermesin)
        public Task AddToListAsync(int listId, int wordId) =>
            ExecuteAsync(
                @"IF NOT EXISTS (SELECT 1 FROM WordListItems WHERE ListId = @ListId AND WordId = @WordId)
                      INSERT INTO WordListItems (ListId, WordId) VALUES (@ListId, @WordId);",
                new { ListId = listId, WordId = wordId });

        public Task RemoveFromListAsync(int listId, int wordId) =>
            ExecuteAsync(
                "DELETE FROM WordListItems WHERE ListId = @ListId AND WordId = @WordId",
                new { ListId = listId, WordId = wordId });

        public async Task<bool> IsInListAsync(int listId, int wordId) =>
            await ExecuteScalarAsync<int>(
                "SELECT COUNT(1) FROM WordListItems WHERE ListId = @ListId AND WordId = @WordId",
                new { ListId = listId, WordId = wordId }) > 0;

        // Favoriler listesi ilk kullanımda otomatik oluşur
        public async Task<int> GetOrCreateFavoritesAsync(int userId)
        {
            int? id = await ExecuteScalarAsync<int?>(
                "SELECT Id FROM WordLists WHERE UserId = @UserId AND IsFavorites = 1",
                new { UserId = userId });

            return id ?? await ExecuteScalarAsync<int>(
                @"INSERT INTO WordLists (UserId, Name, IsFavorites) VALUES (@UserId, N'Favoriler', 1);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new { UserId = userId });
        }

        // Kelimeyi çalışmaya ekle: 1. kutuda, bugün tekrar edilecek şekilde (zaten çalışılıyorsa dokunma)
        public Task AddToStudyAsync(int userId, int wordId, DateTime today) =>
            ExecuteAsync(
                @"IF NOT EXISTS (SELECT 1 FROM UserWords WHERE UserId = @UserId AND WordId = @WordId)
                      INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate)
                      VALUES (@UserId, @WordId, 1, @Today);",
                new { UserId = userId, WordId = wordId, Today = today });
    }
}