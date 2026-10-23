using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface ISentenceRepository
    {
        Task<List<SentenceWordDto>> GetPracticeWordsAsync(int userId, int count);
        Task<string?> GetHeadwordAsync(int wordId);
    }

    public class SentenceRepository : BaseRepository, ISentenceRepository
    {
        public SentenceRepository(IConfiguration configuration) : base(configuration) { }

        private const string Columns =
            @"w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level, w.Example,
              COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning";

        // Önce çalışılan (henüz öğrenilmemiş) kelimeler; yetmezse A1–A2'den yeni kelimeler
        public async Task<List<SentenceWordDto>> GetPracticeWordsAsync(int userId, int count)
        {
            var words = (await QueryAsync<SentenceWordDto>(
                $@"SELECT TOP (@Count) {Columns}
                   FROM UserWords uw
                   INNER JOIN Words w ON w.Id = uw.WordId
                   WHERE uw.UserId = @UserId AND uw.Box < @LearnedBox
                   ORDER BY NEWID()",
                new { UserId = userId, Count = count, LearnedBox = LeitnerService.LearnedBox })).ToList();

            if (words.Count < count)
            {
                words.AddRange(await QueryAsync<SentenceWordDto>(
                    $@"SELECT TOP (@Count) {Columns}
                       FROM Words w
                       LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                       WHERE uw.WordId IS NULL AND w.Level IN ('A1', 'A2') AND w.TurkishMeaning IS NOT NULL
                       ORDER BY NEWID()",
                    new { UserId = userId, Count = count - words.Count }));
            }

            foreach (var w in words) w.TurkishMeaning = ChoiceQuestionBuilder.ShortMeaning(w.TurkishMeaning);
            return words;
        }

        public async Task<string?> GetHeadwordAsync(int wordId) =>
            (await QueryAsync<string>("SELECT Headword FROM Words WHERE Id = @Id", new { Id = wordId }))
            .FirstOrDefault();
    }
}