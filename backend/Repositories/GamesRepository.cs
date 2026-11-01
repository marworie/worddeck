using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface IGamesRepository
    {
        Task<IEnumerable<GameWordDto>> GetMyWordsAsync(int userId, int count);
        Task<IEnumerable<GameWordDto>> GetLevelWordsAsync(string level, int count);
    }

    public class GamesRepository : BaseRepository, IGamesRepository
    {
        public GamesRepository(IConfiguration configuration) : base(configuration) { }

        // Kullanıcının çalıştığı kelimeler (kendi yazdığı anlam varsa o)
        public Task<IEnumerable<GameWordDto>> GetMyWordsAsync(int userId, int count) =>
            QueryAsync<GameWordDto>(
                @"SELECT TOP (@Count) w.Id AS WordId, w.Headword,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS Meaning
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND COALESCE(uw.CustomMeaning, w.TurkishMeaning) IS NOT NULL
                  ORDER BY NEWID()",
                new { UserId = userId, Count = count });

        public Task<IEnumerable<GameWordDto>> GetLevelWordsAsync(string level, int count) =>
            QueryAsync<GameWordDto>(
                @"SELECT TOP (@Count) Id AS WordId, Headword, TurkishMeaning AS Meaning
                  FROM Words
                  WHERE Level = @Level AND TurkishMeaning IS NOT NULL
                  ORDER BY NEWID()",
                new { Level = level, Count = count });
    }
}