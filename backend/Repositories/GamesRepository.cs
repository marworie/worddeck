using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface IGamesRepository
    {
        Task<IEnumerable<GameWordDto>> GetMyWordsAsync(int userId, int count);
        Task<IEnumerable<GameWordDto>> GetLevelWordsAsync(string level, int count);
        Task<IEnumerable<GameWordDto>> GetFiveLetterAsync();
        Task<GameWordDto?> FindAnyAsync(IEnumerable<string> words);
        Task<GameWordDto?> RandomStartingWithAsync(string letter, string used);
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
        
        // Günün kelimesi için 5 harfli bütün kelimeler
        public Task<IEnumerable<GameWordDto>> GetFiveLetterAsync() =>
            QueryAsync<GameWordDto>(
                @"SELECT Id AS WordId, LOWER(Headword) AS Headword, ISNULL(TurkishMeaning, '') AS Meaning, Level
                  FROM Words
                  WHERE LEN(Headword) = 5 AND Headword NOT LIKE '%[^a-z]%'");

        // Kelime zinciri: yazılan kelime (ya da kökü) sözlükte var mı?
        public async Task<GameWordDto?> FindAnyAsync(IEnumerable<string> words) =>
            (await QueryAsync<GameWordDto>(
                @"SELECT TOP 1 Id AS WordId, Headword, ISNULL(TurkishMeaning, '') AS Meaning, Level
                  FROM Words
                  WHERE Headword IN @Words
                  ORDER BY CASE WHEN TurkishMeaning IS NULL THEN 1 ELSE 0 END",
                new { Words = words.ToList() }))
            .FirstOrDefault();

        // Kelime zinciri: bilgisayarın hamlesi (kolay seviyelerden, kullanılmamış bir kelime)
        public async Task<GameWordDto?> RandomStartingWithAsync(string letter, string used) =>
            (await QueryAsync<GameWordDto>(
                @"SELECT TOP 1 Id AS WordId, LOWER(Headword) AS Headword, TurkishMeaning AS Meaning, Level
                  FROM Words
                  WHERE Headword LIKE @Prefix AND Headword NOT LIKE '%[^a-z]%'
                    AND LEN(Headword) BETWEEN 3 AND 9
                    AND Level IN ('A1', 'A2', 'B1') AND TurkishMeaning IS NOT NULL
                    AND Headword NOT IN (SELECT value FROM STRING_SPLIT(@Used, ','))
                  ORDER BY NEWID()",
                new { Prefix = letter + "%", Used = used }))
            .FirstOrDefault();
    }
}