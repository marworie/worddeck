using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IQuizRepository
    {
        Task<IEnumerable<PracticeQuestionDto>> GetQuizWordsAsync(int userId, string level, int count);
        Task LogAnswerAsync(int userId, int wordId, string questionType, bool isCorrect);
        Task MarkHardAsync(int userId, int wordId, DateTime today);
        Task<int> SaveResultAsync(int userId, QuizFinishDto dto);
        Task<IEnumerable<QuizResultDto>> GetHistoryAsync(int userId, int top);
    }

    public class QuizRepository : BaseRepository, IQuizRepository
    {
        public QuizRepository(IConfiguration configuration) : base(configuration) { }

        // Sınav soruları: bu seviyede kullanıcının daha önce çalıştığı kelimelerden rastgele
        // (Zorlandıklarım'daki PracticeQuestionDto'yu tekrar kullanıyoruz)
        public Task<IEnumerable<PracticeQuestionDto>> GetQuizWordsAsync(int userId, string level, int count) =>
            QueryAsync<PracticeQuestionDto>(
                @"SELECT TOP (@Count) w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                         COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                         w.Definition, w.DefinitionTr, w.Example,
                         CAST(uw.HardState AS INT) AS HardState, CAST(uw.HardStreak AS INT) AS HardStreak
                  FROM UserWords uw
                  INNER JOIN Words w ON w.Id = uw.WordId
                  WHERE uw.UserId = @UserId AND w.Level = @Level
                  ORDER BY NEWID()",
                new { UserId = userId, Level = level, Count = count });

        // Cevabı geçmişe yaz (içgörülerdeki "son 7 gün" istatistiğine sınav cevapları da girsin)
        public Task LogAnswerAsync(int userId, int wordId, string questionType, bool isCorrect) =>
            ExecuteAsync(
                @"INSERT INTO PracticeAnswers (UserId, WordId, QuestionType, IsCorrect)
                  VALUES (@UserId, @WordId, @QuestionType, @IsCorrect)",
                new { UserId = userId, WordId = wordId, QuestionType = questionType, IsCorrect = isCorrect });

        // Sınavda bilinemeyen kelimeyi Zorlandıklarım'a gönder (🔴, seri sıfır)
        public Task MarkHardAsync(int userId, int wordId, DateTime today) =>
            ExecuteAsync(
                @"UPDATE UserWords
                  SET HardState = 1, HardStreak = 0, HardStateSince = @Today, HardNextCheck = NULL
                  WHERE UserId = @UserId AND WordId = @WordId",
                new { UserId = userId, WordId = wordId, Today = today });

        public Task<int> SaveResultAsync(int userId, QuizFinishDto dto) =>
            ExecuteScalarAsync<int>(
                @"INSERT INTO QuizResults (UserId, Level, TotalQuestions, CorrectAnswers, DurationSeconds)
                  VALUES (@UserId, @Level, @TotalQuestions, @CorrectAnswers, @DurationSeconds);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new { UserId = userId, dto.Level, dto.TotalQuestions, dto.CorrectAnswers, dto.DurationSeconds });

        public Task<IEnumerable<QuizResultDto>> GetHistoryAsync(int userId, int top) =>
            QueryAsync<QuizResultDto>(
                @"SELECT TOP (@Top) Id, Level, TotalQuestions, CorrectAnswers, DurationSeconds, TakenAt
                  FROM QuizResults
                  WHERE UserId = @UserId
                  ORDER BY TakenAt DESC",
                new { UserId = userId, Top = top });
    }
}