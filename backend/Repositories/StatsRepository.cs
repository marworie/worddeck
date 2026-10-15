using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IStatsRepository
    {
        Task<StatsTotalsRow> GetTotalsAsync(int userId);
        Task<int> GetTotalReviewsAsync(int userId);
        Task<IEnumerable<DailyCountDto>> GetDailyAsync(int userId, DateTime from);
        Task<IEnumerable<BoxCountDto>> GetBoxesAsync(int userId);
        Task<IEnumerable<ForgottenWordDto>> GetMostForgottenAsync(int userId, int top);
    }

    public class StatsRepository : BaseRepository, IStatsRepository
    {
        public StatsRepository(IConfiguration configuration) : base(configuration) { }

        // Çalışılan, öğrenilen, toplam doğru/yanlış (ISNULL: hiç kelime yoksa SUM null döner)
        public async Task<StatsTotalsRow> GetTotalsAsync(int userId) =>
            await QuerySingleOrDefaultAsync<StatsTotalsRow>(
                @"SELECT COUNT(*) AS TotalStudied,
                         ISNULL(SUM(CASE WHEN Box = 6 THEN 1 ELSE 0 END), 0) AS Learned,
                         ISNULL(SUM(CorrectCount), 0) AS Correct,
                         ISNULL(SUM(WrongCount), 0) AS Wrong
                  FROM UserWords
                  WHERE UserId = @UserId",
                new { UserId = userId }) ?? new StatsTotalsRow();

        public Task<int> GetTotalReviewsAsync(int userId) =>
            ExecuteScalarAsync<int>(
                "SELECT ISNULL(SUM(CardsReviewed), 0) FROM StudyDays WHERE UserId = @UserId",
                new { UserId = userId });

        public Task<IEnumerable<DailyCountDto>> GetDailyAsync(int userId, DateTime from) =>
            QueryAsync<DailyCountDto>(
                @"SELECT StudyDate AS Date, CardsReviewed AS Count
                  FROM StudyDays
                  WHERE UserId = @UserId AND StudyDate >= @From
                  ORDER BY StudyDate",
                new { UserId = userId, From = from });

        public Task<IEnumerable<BoxCountDto>> GetBoxesAsync(int userId) =>
            QueryAsync<BoxCountDto>(
                @"SELECT CAST(Box AS INT) AS Box, COUNT(*) AS Count
                  FROM UserWords
                  WHERE UserId = @UserId
                  GROUP BY Box",
                new { UserId = userId });

        public Task<IEnumerable<ForgottenWordDto>> GetMostForgottenAsync(int userId, int top) =>
            QueryAsync<ForgottenWordDto>(
                @"SELECT TOP (@Top) w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         uw.WrongCount, uw.CorrectCount
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND uw.WrongCount > 0
                  ORDER BY uw.WrongCount DESC, uw.CorrectCount",
                new { UserId = userId, Top = top });
    }
}