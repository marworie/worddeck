using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IDictationRepository
    {
        Task<IEnumerable<DictationSentenceDto>> GetRandomAsync(string level, int count);
    }

    public class DictationRepository : BaseRepository, IDictationRepository
    {
        public DictationRepository(IConfiguration configuration) : base(configuration) { }

        // Seviyedeki örnek cümlelerden rastgele seçer (uzunluk filtresi controller'da)
        public Task<IEnumerable<DictationSentenceDto>> GetRandomAsync(string level, int count) =>
            QueryAsync<DictationSentenceDto>(
                @"SELECT TOP (@Count) Id AS WordId, Headword, Example, ExampleTr
                  FROM Words
                  WHERE Level = @Level AND Example IS NOT NULL AND LEN(Example) BETWEEN 15 AND 120
                  ORDER BY NEWID()",
                new { Level = level, Count = count });
    }
}