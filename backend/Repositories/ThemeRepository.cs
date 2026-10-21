using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface IThemeRepository
    {
        Task<IEnumerable<ThemeDto>> GetThemesAsync(int userId);
        Task<bool> ExistsAsync(int themeId);
        Task<IEnumerable<WordSummaryDto>> GetThemeWordsAsync(int userId, int themeId);
        Task<IEnumerable<PracticeQuestionDto>> GetQuizWordsAsync(int userId, int themeId, string? level, int count);
        Task<int> AddToStudyAsync(int userId, int themeId, string? level, DateTime today);
    }

    public class ThemeRepository : BaseRepository, IThemeRepository
    {
        public ThemeRepository(IConfiguration configuration) : base(configuration) { }

        // Temalar + kullanıcının her temadaki ilerlemesi
        public Task<IEnumerable<ThemeDto>> GetThemesAsync(int userId) =>
            QueryAsync<ThemeDto>(
                @"SELECT t.Id, t.Slug, t.Name, t.Icon,
                         COUNT(tw.WordId) AS WordCount,
                         COUNT(uw.WordId) AS StudiedCount,
                         ISNULL(SUM(CASE WHEN uw.Box >= @KnownBox THEN 1 ELSE 0 END), 0) AS KnownCount,
                         ISNULL(SUM(CASE WHEN uw.Box >= @LearnedBox THEN 1 ELSE 0 END), 0) AS LearnedCount
                  FROM Themes t
                  LEFT JOIN ThemeWords tw ON tw.ThemeId = t.Id
                  LEFT JOIN UserWords uw ON uw.WordId = tw.WordId AND uw.UserId = @UserId
                  GROUP BY t.Id, t.Slug, t.Name, t.Icon, t.SortOrder
                  ORDER BY t.SortOrder",
                new { UserId = userId, LearnedBox = LeitnerService.LearnedBox, KnownBox = LeitnerService.KnownBox });

        public async Task<bool> ExistsAsync(int themeId) =>
            await ExecuteScalarAsync<int>("SELECT COUNT(1) FROM Themes WHERE Id = @Id", new { Id = themeId }) > 0;

        // Temadaki kelimeler (arama ve listelerdeki satırlarla aynı sütunlar): seviyeye, sonra alfabeye göre
        public Task<IEnumerable<WordSummaryDto>> GetThemeWordsAsync(int userId, int themeId) =>
            QueryAsync<WordSummaryDto>(
                $@"SELECT {WordListRepository.SummaryColumns}
                   FROM ThemeWords tw
                   INNER JOIN Words w ON w.Id = tw.WordId
                   LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                   WHERE tw.ThemeId = @ThemeId
                   ORDER BY w.Level, w.Headword",
                new { UserId = userId, ThemeId = themeId });

        // Temadan sınav: rastgele kelimeler (istenirse tek seviye)
        public Task<IEnumerable<PracticeQuestionDto>> GetQuizWordsAsync(int userId, int themeId, string? level, int count) =>
            QueryAsync<PracticeQuestionDto>(
                @"SELECT TOP (@Count) w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         w.Definition, w.DefinitionTr, w.Example,
                         CAST(ISNULL(uw.HardState, 0) AS INT) AS HardState,
                         CAST(ISNULL(uw.HardStreak, 0) AS INT) AS HardStreak
                  FROM ThemeWords tw
                  INNER JOIN Words w ON w.Id = tw.WordId
                  LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                  WHERE tw.ThemeId = @ThemeId AND (@Level IS NULL OR w.Level = @Level)
                  ORDER BY NEWID()",
                new { UserId = userId, ThemeId = themeId, Level = level, Count = count });

        // Temadaki (henüz çalışılmayan) kelimeleri çalışmaya ekle: 1. kutu, bugün. Kaç tane eklendiğini döndürür
        public Task<int> AddToStudyAsync(int userId, int themeId, string? level, DateTime today) =>
            ExecuteScalarAsync<int>(
                @"INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate)
                  SELECT @UserId, tw.WordId, 1, @Today
                  FROM ThemeWords tw
                  INNER JOIN Words w ON w.Id = tw.WordId
                  WHERE tw.ThemeId = @ThemeId
                    AND (@Level IS NULL OR w.Level = @Level)
                    AND NOT EXISTS (SELECT 1 FROM UserWords uw WHERE uw.UserId = @UserId AND uw.WordId = tw.WordId);
                  SELECT @@ROWCOUNT;",
                new { UserId = userId, ThemeId = themeId, Level = level, Today = today });
    }
}