using WordDeck.Models;

namespace WordDeck.Repositories
{
    public interface IWordRepository
    {
        Task<Word?> GetByIdAsync(int id);
        Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? example);
    }

    public class WordRepository : BaseRepository, IWordRepository
    {
        public WordRepository(IConfiguration configuration) : base(configuration) { }

        public Task<Word?> GetByIdAsync(int id) =>
            QuerySingleOrDefaultAsync<Word>("SELECT * FROM Words WHERE Id = @Id", new { Id = id });

        // Dış API'lerden gelen bilgileri kaydet; bir daha çekilmesin diye tarihi de yaz
        public Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? example) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET TurkishMeaning = @TurkishMeaning, Definition = @Definition,
                      Example = @Example, DetailsFetchedAt = SYSDATETIME()
                  WHERE Id = @Id",
                new { Id = id, TurkishMeaning = turkishMeaning, Definition = definition, Example = example });
    }
}