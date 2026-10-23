using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IPathRepository
    {
        Task<IEnumerable<PathWordRow>> GetLevelWordsAsync(string level);
        Task<IEnumerable<UnitProgressRow>> GetProgressAsync(int userId, string level);
        Task SaveResultAsync(int userId, string level, int themeId, int part, int score, bool passed);
        Task<IEnumerable<PathUnitWordDto>> GetWordsAsync(int userId, IEnumerable<int> ids);
        Task<int> AddToStudyAsync(int userId, IEnumerable<int> ids, DateTime today);
    }

    public class PathRepository : BaseRepository, IPathRepository
    {
        public PathRepository(IConfiguration configuration) : base(configuration) { }

        // Seviyedeki bütün tema kelimeleri
        public Task<IEnumerable<PathWordRow>> GetLevelWordsAsync(string level) =>
            QueryAsync<PathWordRow>(
                @"SELECT tw.ThemeId, t.Name AS ThemeName, t.Icon, w.Id AS WordId
                  FROM ThemeWords tw
                  INNER JOIN Themes t ON t.Id = tw.ThemeId
                  INNER JOIN Words w ON w.Id = tw.WordId
                  WHERE w.Level = @Level",
                new { Level = level });

        public Task<IEnumerable<UnitProgressRow>> GetProgressAsync(int userId, string level) =>
            QueryAsync<UnitProgressRow>(
                @"SELECT ThemeId, Part, BestScore, CompletedAt
                  FROM UserUnitProgress WHERE UserId = @UserId AND Level = @Level",
                new { UserId = userId, Level = level });

        // En iyi puan korunur; tamamlanma anı sadece ilk geçişte yazılır
        public Task SaveResultAsync(int userId, string level, int themeId, int part, int score, bool passed) =>
            ExecuteAsync(
                @"UPDATE UserUnitProgress
                  SET BestScore = CASE WHEN @Score > BestScore THEN @Score ELSE BestScore END,
                      Attempts = Attempts + 1,
                      CompletedAt = CASE WHEN CompletedAt IS NULL AND @Passed = 1 THEN SYSUTCDATETIME() ELSE CompletedAt END,
                      UpdatedAt = SYSUTCDATETIME()
                  WHERE UserId = @UserId AND Level = @Level AND ThemeId = @ThemeId AND Part = @Part;
                  IF @@ROWCOUNT = 0
                      INSERT INTO UserUnitProgress (UserId, Level, ThemeId, Part, BestScore, Attempts, CompletedAt)
                      VALUES (@UserId, @Level, @ThemeId, @Part, @Score, 1,
                              CASE WHEN @Passed = 1 THEN SYSUTCDATETIME() END);",
                new { UserId = userId, Level = level, ThemeId = themeId, Part = part, Score = score, Passed = passed });

        public Task<IEnumerable<PathUnitWordDto>> GetWordsAsync(int userId, IEnumerable<int> ids) =>
            QueryAsync<PathUnitWordDto>(
                @"SELECT w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         CAST(uw.Box AS INT) AS Box
                  FROM Words w
                  LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                  WHERE w.Id IN @Ids
                  ORDER BY w.Headword",
                new { UserId = userId, Ids = ids.ToList() });

        // Ünitenin henüz çalışılmayan kelimelerini çalışmaya ekler; eklenen sayısını döner
        public async Task<int> AddToStudyAsync(int userId, IEnumerable<int> ids, DateTime today) =>
            (await QueryAsync<int>(
                @"INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate)
                  SELECT @UserId, w.Id, 1, @Today
                  FROM Words w
                  WHERE w.Id IN @Ids
                    AND NOT EXISTS (SELECT 1 FROM UserWords uw WHERE uw.UserId = @UserId AND uw.WordId = w.Id);
                  SELECT @@ROWCOUNT;",
                new { UserId = userId, Ids = ids.ToList(), Today = today }))
            .Single();
    }
}