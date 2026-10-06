using WordDeck.Models;

namespace WordDeck.Repositories
{
    public interface IWordRepository
    {
        Task<Word?> GetByIdAsync(int id);
        Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? definitionTr, string? example, bool markFetched);
        Task<string?> GetCustomMeaningAsync(int userId, int wordId);
        Task SaveCustomMeaningAsync(int userId, int wordId, string? meaning, DateTime today);
    }

    public class WordRepository : BaseRepository, IWordRepository
    {
        public WordRepository(IConfiguration configuration) : base(configuration) { }

        public Task<Word?> GetByIdAsync(int id) =>
            QuerySingleOrDefaultAsync<Word>("SELECT * FROM Words WHERE Id = @Id", new { Id = id });

        // Gelen bilgileri kaydet. COALESCE: null gelen alan eski değerini korusun.
        // markFetched = false ise tarihi yazma ki eksik kısım sonra tekrar denensin
        public Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? definitionTr, string? example, bool markFetched) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET TurkishMeaning = COALESCE(@TurkishMeaning, TurkishMeaning),
                      Definition = COALESCE(@Definition, Definition),
                      DefinitionTr = COALESCE(@DefinitionTr, DefinitionTr),
                      Example = COALESCE(@Example, Example),
                      DetailsFetchedAt = CASE WHEN @MarkFetched = 1 THEN SYSDATETIME() ELSE DetailsFetchedAt END
                  WHERE Id = @Id",
                new
                {
                    Id = id, TurkishMeaning = turkishMeaning, Definition = definition,
                    DefinitionTr = definitionTr, Example = example, MarkFetched = markFetched
                });
                // Kullanıcının bu kelime için kendi yazdığı anlam (yoksa null)
        public Task<string?> GetCustomMeaningAsync(int userId, int wordId) =>
            ExecuteScalarAsync<string?>(
                "SELECT CustomMeaning FROM UserWords WHERE UserId = @UserId AND WordId = @WordId",
                new { UserId = userId, WordId = wordId });

        // Kendi anlamını kaydet. Kelime henüz hiç çalışılmadıysa UserWords'te satırı yok,
        // o zaman 1. kutuda, bugün tekrar edilecek şekilde oluştur (upsert)
        public Task SaveCustomMeaningAsync(int userId, int wordId, string? meaning, DateTime today) =>
            ExecuteAsync(
                @"UPDATE UserWords SET CustomMeaning = @Meaning
                  WHERE UserId = @UserId AND WordId = @WordId;

                  IF @@ROWCOUNT = 0
                      INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate, CustomMeaning)
                      VALUES (@UserId, @WordId, 1, @Today, @Meaning);",
                new { UserId = userId, WordId = wordId, Meaning = meaning, Today = today });
    }
}