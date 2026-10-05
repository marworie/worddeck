using WordDeck.Models;

namespace WordDeck.Repositories
{
    public interface IWordRepository
    {
        Task<Word?> GetByIdAsync(int id);
        // interface:
        Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? example, bool markFetched);    }

    public class WordRepository : BaseRepository, IWordRepository
    {
        public WordRepository(IConfiguration configuration) : base(configuration) { }

        public Task<Word?> GetByIdAsync(int id) =>
            QuerySingleOrDefaultAsync<Word>("SELECT * FROM Words WHERE Id = @Id", new { Id = id });

        // Gelen bilgileri kaydet. COALESCE: null gelen alan eski değerini korusun.
        // markFetched = false ise tarihi yazma ki eksik kısım sonra tekrar denensin
        public Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? example, bool markFetched) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET TurkishMeaning = COALESCE(@TurkishMeaning, TurkishMeaning),
                      Definition = COALESCE(@Definition, Definition),
                      Example = COALESCE(@Example, Example),
                      DetailsFetchedAt = CASE WHEN @MarkFetched = 1 THEN SYSDATETIME() ELSE DetailsFetchedAt END
                  WHERE Id = @Id",
                new { Id = id, TurkishMeaning = turkishMeaning, Definition = definition, Example = example, MarkFetched = markFetched });
    }
}