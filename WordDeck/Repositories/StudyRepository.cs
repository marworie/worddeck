using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IStudyRepository
    {
        Task<IEnumerable<StudyCardDto>> GetDueCardsAsync(int userId, string level, DateTime today);
        Task<IEnumerable<StudyCardDto>> GetNewCardsAsync(int userId, string level, int count);
        Task<bool> WordExistsAsync(int wordId);
        Task<int?> GetBoxAsync(int userId, int wordId);
        Task SaveAnswerAsync(int userId, int wordId, int newBox, DateTime nextReviewDate, bool known, DateTime today);
        Task<IEnumerable<LevelProgressDto>> GetProgressAsync(int userId, DateTime today);
        Task<IEnumerable<DateTime>> GetStudyDatesAsync(int userId);
    }

    public class StudyRepository : BaseRepository, IStudyRepository
    {
        public StudyRepository(IConfiguration configuration) : base(configuration) { }

        // Tekrar zamanı gelmiş (bugün ya da daha önce), henüz öğrenilmemiş kartlar
        public Task<IEnumerable<StudyCardDto>> GetDueCardsAsync(int userId, string level, DateTime today) =>
            QueryAsync<StudyCardDto>(
                @"SELECT TOP 50 w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         w.Definition, w.Example,
                         CAST(uw.Box AS INT) AS Box, CAST(0 AS BIT) AS IsNew
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND w.Level = @Level
                    AND uw.Box < 6 AND uw.NextReviewDate <= @Today
                  ORDER BY uw.NextReviewDate, uw.Box",  // en çok gecikenler ve düşük kutular önce
                new { UserId = userId, Level = level, Today = today });

        // Kullanıcının hiç görmediği kelimelerden rastgele 'count' tane
        public Task<IEnumerable<StudyCardDto>> GetNewCardsAsync(int userId, string level, int count) =>
            QueryAsync<StudyCardDto>(
                @"SELECT TOP (@Count) w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         w.TurkishMeaning, w.Definition, w.Example,
                         CAST(NULL AS INT) AS Box, CAST(1 AS BIT) AS IsNew
                  FROM Words w
                  WHERE w.Level = @Level
                    AND NOT EXISTS (SELECT 1 FROM UserWords uw WHERE uw.UserId = @UserId AND uw.WordId = w.Id)
                  ORDER BY NEWID()",   //-- NEWID(): her seferinde farklı, rastgele sıra
                new { UserId = userId, Level = level, Count = count });

        public async Task<bool> WordExistsAsync(int wordId) =>
            await ExecuteScalarAsync<int>("SELECT COUNT(1) FROM Words WHERE Id = @Id", new { Id = wordId }) > 0;

        // Kelimenin şu anki kutusu (hiç çalışılmadıysa null)
        public Task<int?> GetBoxAsync(int userId, int wordId) =>
            ExecuteScalarAsync<int?>(
                "SELECT CAST(Box AS INT) FROM UserWords WHERE UserId = @UserId AND WordId = @WordId",
                new { UserId = userId, WordId = wordId });

        // Cevabı kaydet: kart varsa güncelle, yoksa ekle (upsert) + bugünün çalışma sayısını artır
        public Task SaveAnswerAsync(int userId, int wordId, int newBox, DateTime nextReviewDate, bool known, DateTime today) =>
            ExecuteAsync(
                @"UPDATE UserWords
                  SET Box = @Box, NextReviewDate = @Next, LastReviewedAt = SYSDATETIME(),
                      CorrectCount = CorrectCount + @Correct, WrongCount = WrongCount + @Wrong
                  WHERE UserId = @UserId AND WordId = @WordId;

                  IF @@ROWCOUNT = 0   -- güncellenecek satır yoksa ilk kez çalışılıyor demektir
                      INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate, LastReviewedAt, CorrectCount, WrongCount)
                      VALUES (@UserId, @WordId, @Box, @Next, SYSDATETIME(), @Correct, @Wrong);

                  UPDATE StudyDays SET CardsReviewed = CardsReviewed + 1
                  WHERE UserId = @UserId AND StudyDate = @Today;

                  IF @@ROWCOUNT = 0
                      INSERT INTO StudyDays (UserId, StudyDate, CardsReviewed) VALUES (@UserId, @Today, 1);",
                new
                {
                    UserId = userId, WordId = wordId, Box = newBox, Next = nextReviewDate,
                    Correct = known ? 1 : 0, Wrong = known ? 0 : 1, Today = today
                });

        // Her seviye için toplam / öğrenilen / öğreniliyor / bugün tekrar
        public Task<IEnumerable<LevelProgressDto>> GetProgressAsync(int userId, DateTime today) =>
            QueryAsync<LevelProgressDto>(
                @"SELECT w.Level,
                         COUNT(*) AS Total,
                         SUM(CASE WHEN uw.Box = 6 THEN 1 ELSE 0 END) AS Learned,
                         SUM(CASE WHEN uw.Box BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS Learning,
                         SUM(CASE WHEN uw.Box < 6 AND uw.NextReviewDate <= @Today THEN 1 ELSE 0 END) AS DueToday
                  FROM Words w
                  LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                  GROUP BY w.Level
                  ORDER BY w.Level",
                new { UserId = userId, Today = today });

        public Task<IEnumerable<DateTime>> GetStudyDatesAsync(int userId) =>
            QueryAsync<DateTime>(
                "SELECT StudyDate FROM StudyDays WHERE UserId = @UserId",
                new { UserId = userId });
    }
}