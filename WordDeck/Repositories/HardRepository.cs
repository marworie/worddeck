using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Repositories
{
    // Veritabanından okunan zor kelime durumu (Dapper sayıları buraya doldurur)
    public class HardProgressRow
    {
        public int HardState { get; set; }
        public int HardStreak { get; set; }
        public DateTime? HardStateSince { get; set; }
        public DateTime? HardNextCheck { get; set; }

        public HardProgress ToProgress() =>
            new((Services.HardState)HardState, HardStreak, HardStateSince, HardNextCheck);
    }

    public interface IHardRepository
    {
        Task<IEnumerable<HardWordDto>> GetHardWordsAsync(int userId);
        Task<IEnumerable<PracticeQuestionDto>> GetPracticeWordsAsync(int userId, string level, DateTime today);
        Task<IEnumerable<ChoiceDto>> GetDistractorsAsync(string level, string partOfSpeech, int excludeWordId, int count);
        Task<HardProgressRow?> GetProgressAsync(int userId, int wordId);
        Task SaveAnswerAsync(int userId, int wordId, HardProgress progress, string questionType, bool isCorrect);
        Task AddConfusionAsync(int userId, int wordId, int confusedWithWordId);
    }

    public class HardRepository : BaseRepository, IHardRepository
    {
        public HardRepository(IConfiguration configuration) : base(configuration) { }

        // Zor listesindeki tüm kelimeler: seviyeye, duruma ve en çok yanlış yapılana göre sıralı
        public Task<IEnumerable<HardWordDto>> GetHardWordsAsync(int userId) =>
            QueryAsync<HardWordDto>(
                @"SELECT w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         CAST(uw.HardState AS INT) AS HardState, CAST(uw.HardStreak AS INT) AS HardStreak,
                         uw.WrongCount, uw.HardNextCheck AS NextCheck
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND uw.HardState > 0
                  ORDER BY w.Level, uw.HardState, uw.WrongCount DESC",
                new { UserId = userId });

        // Bugün çalışılacak zor kelimeler:
        //  🔴 hepsi, 🟡 sadece bugünden ÖNCE güçlenmeye başlayanlar (aynı gün sayılmıyor),
        //  🟢 sadece kontrol tarihi gelenler
        public Task<IEnumerable<PracticeQuestionDto>> GetPracticeWordsAsync(int userId, string level, DateTime today) =>
            QueryAsync<PracticeQuestionDto>(
                @"SELECT TOP 20 w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         w.Definition, w.DefinitionTr, w.Example,
                         CAST(uw.HardState AS INT) AS HardState, CAST(uw.HardStreak AS INT) AS HardStreak
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND w.Level = @Level
                    AND (    uw.HardState = 1
                          OR (uw.HardState = 2 AND uw.HardStateSince < @Today)
                          OR (uw.HardState = 3 AND uw.HardNextCheck <= @Today))
                  ORDER BY uw.HardState, uw.WrongCount DESC, NEWID()",
                new { UserId = userId, Level = level, Today = today });

        // Çoktan seçmeli için çeldiriciler: aynı seviye ve aynı türden rastgele kelimeler
        public Task<IEnumerable<ChoiceDto>> GetDistractorsAsync(string level, string partOfSpeech, int excludeWordId, int count) =>
            QueryAsync<ChoiceDto>(
                @"SELECT TOP (@Count) Id AS WordId, Headword
                  FROM Words
                  WHERE Level = @Level AND PartOfSpeech = @Pos AND Id <> @Exclude
                  ORDER BY NEWID()",
                new { Level = level, Pos = partOfSpeech, Exclude = excludeWordId, Count = count });

        public Task<HardProgressRow?> GetProgressAsync(int userId, int wordId) =>
            QuerySingleOrDefaultAsync<HardProgressRow>(
                @"SELECT CAST(HardState AS INT) AS HardState, CAST(HardStreak AS INT) AS HardStreak,
                         HardStateSince, HardNextCheck
                  FROM UserWords
                  WHERE UserId = @UserId AND WordId = @WordId",
                new { UserId = userId, WordId = wordId });

        // Yeni durumu kaydet + cevabı geçmişe yaz (içgörüler için)
        public Task SaveAnswerAsync(int userId, int wordId, HardProgress progress, string questionType, bool isCorrect) =>
            ExecuteAsync(
                @"UPDATE UserWords
                  SET HardState = @State, HardStreak = @Streak,
                      HardStateSince = @Since, HardNextCheck = @NextCheck
                  WHERE UserId = @UserId AND WordId = @WordId;

                  INSERT INTO PracticeAnswers (UserId, WordId, QuestionType, IsCorrect)
                  VALUES (@UserId, @WordId, @QuestionType, @IsCorrect);",
                new
                {
                    UserId = userId, WordId = wordId,
                    State = (byte)progress.State, Streak = (byte)progress.Streak,
                    Since = progress.StateSince, NextCheck = progress.NextCheck,
                    QuestionType = questionType, IsCorrect = isCorrect
                });

        // Karıştırma kaydı: daha önce varsa sayıyı artır, yoksa ekle (upsert)
        public Task AddConfusionAsync(int userId, int wordId, int confusedWithWordId) =>
            ExecuteAsync(
                @"UPDATE Confusions
                  SET TimesConfused = TimesConfused + 1, LastConfusedAt = SYSDATETIME()
                  WHERE UserId = @UserId AND WordId = @WordId AND ConfusedWithWordId = @OtherId;

                  IF @@ROWCOUNT = 0
                      INSERT INTO Confusions (UserId, WordId, ConfusedWithWordId)
                      VALUES (@UserId, @WordId, @OtherId);",
                new { UserId = userId, WordId = wordId, OtherId = confusedWithWordId });
    }
}