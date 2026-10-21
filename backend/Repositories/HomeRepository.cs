using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface IHomeRepository
    {
        Task<IEnumerable<JourneyLevelDto>> GetJourneyAsync(int userId);
        Task<WordOfDayDto?> GetWordOfDayAsync(int userId, string level, DateTime today);
        Task<IEnumerable<WordSummaryDto>> GetDiscoverWordsAsync(int userId, string level, int count);
    }

    public class HomeRepository : BaseRepository, IHomeRepository
    {
        public HomeRepository(IConfiguration configuration) : base(configuration) { }

        // Her seviyede toplam / çalışılan / bilinen / kalıcı öğrenilen kelime sayısı
        public Task<IEnumerable<JourneyLevelDto>> GetJourneyAsync(int userId) =>
            QueryAsync<JourneyLevelDto>(
                @"SELECT w.Level,
                         COUNT(*) AS Total,
                         COUNT(uw.WordId) AS Studied,
                         ISNULL(SUM(CASE WHEN uw.Box >= @KnownBox THEN 1 ELSE 0 END), 0) AS Known,
                         ISNULL(SUM(CASE WHEN uw.Box >= @LearnedBox THEN 1 ELSE 0 END), 0) AS Learned
                  FROM Words w
                  LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                  GROUP BY w.Level
                  ORDER BY w.Level",
                new { UserId = userId, KnownBox = LeitnerService.KnownBox, LearnedBox = LeitnerService.LearnedBox });

        // Günün kelimesi: kullanıcının seviyesinden, örnek cümlesi ve temiz anlamı olan bir kelime.
        // Sıralama gün + kullanıcıya göre sabit: gün boyu aynı kelime gelir, ertesi gün değişir.
        // Bugün kartlarına eklediği kelime (1. kutu) yine gelsin diye sadece daha ileri kutudakiler elenir
        public async Task<WordOfDayDto?> GetWordOfDayAsync(int userId, string level, DateTime today)
        {
            int seed = today.Year * 1000 + today.DayOfYear + userId;

            var candidates = await QueryAsync<WordOfDayDto>(
                @"SELECT TOP 30 w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level, w.TurkishMeaning, w.Example,
                         CAST(CASE WHEN EXISTS (SELECT 1 FROM UserWords uw WHERE uw.UserId = @UserId AND uw.WordId = w.Id)
                              THEN 1 ELSE 0 END AS BIT) AS InStudy
                  FROM Words w
                  WHERE w.Level = @Level
                    AND w.Example IS NOT NULL AND w.TurkishMeaning IS NOT NULL
                    AND w.PartOfSpeech IN @Pos
                    AND NOT EXISTS (SELECT 1 FROM UserWords uw WHERE uw.UserId = @UserId AND uw.WordId = w.Id AND uw.Box > 1)
                  ORDER BY ABS(CHECKSUM(w.Id, @Seed))",
                new { UserId = userId, Level = level, Seed = seed, Pos = ChoiceQuestionBuilder.ContentPos });

            // Sınavdaki süzgecin aynısı: kısa ve temiz anlam, kelimenin geçtiği makul uzunlukta cümle
            var word = candidates.FirstOrDefault(c =>
                ChoiceQuestionBuilder.ShortMeaning(c.TurkishMeaning) is string m &&
                !ChoiceQuestionBuilder.LooksAlike(m, c.Headword) &&
                ChoiceQuestionBuilder.GoodCloze(c.Example, c.Headword) != null);

            if (word != null) word.TurkishMeaning = ChoiceQuestionBuilder.ShortMeaning(word.TurkishMeaning);
            return word;
        }

        // Keşfet: seviyeden, anlamı olan ve henüz çalışılmayan rastgele kelimeler
        public Task<IEnumerable<WordSummaryDto>> GetDiscoverWordsAsync(int userId, string level, int count) =>
            QueryAsync<WordSummaryDto>(
                $@"SELECT TOP (@Count) {WordListRepository.SummaryColumns}
                   FROM Words w
                   LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                   WHERE w.Level = @Level AND w.TurkishMeaning IS NOT NULL AND uw.WordId IS NULL
                     AND w.PartOfSpeech IN @Pos
                   ORDER BY NEWID()",
                new { UserId = userId, Level = level, Count = count, Pos = ChoiceQuestionBuilder.ContentPos });
    }
}