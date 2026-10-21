using WordDeck.Models;
using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IWordRepository
    {
        Task<Word?> GetByIdAsync(int id);
        Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? definitionTr, string? example, bool markFetched);
        Task<string?> GetCustomMeaningAsync(int userId, int wordId);
        Task SaveCustomMeaningAsync(int userId, int wordId, string? meaning, DateTime today);
        Task<HashSet<string>> FilterKnownAsync(IEnumerable<string> words);
        Task SaveExtrasAsync(int id, string? exampleTr, string? phonetic);
        Task<IEnumerable<FamilyMemberDto>> GetByHeadwordsAsync(IEnumerable<string> headwords);
        Task<Word?> GetNextForBackfillAsync();
        Task SaveDictionaryAsync(int id, string? definition, string? example);
        Task SaveMeaningAsync(int id, string? meaning);
        Task<Word?> GetNextForMeaningAsync(bool onlyWithMeaning = false);
    }

    public class WordRepository : BaseRepository, IWordRepository
    {
        public WordRepository(IConfiguration configuration) : base(configuration) { }

        public Task<Word?> GetByIdAsync(int id) =>
            QuerySingleOrDefaultAsync<Word>("SELECT * FROM Words WHERE Id = @Id", new { Id = id });

        // Gelen bilgileri kaydet. COALESCE: null gelen alan eski değerini korusun.
        // markFetched = false ise tarihi yazma ki eksik kısım sonra tekrar denensin
        public Task SaveDetailsAsync(int id, string? turkishMeaning, string? definition, string? definitionTr, string? example, bool markFetched) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET TurkishMeaning = COALESCE(@TurkishMeaning, TurkishMeaning),
                      Definition = COALESCE(@Definition, Definition),
                      DefinitionTr = COALESCE(@DefinitionTr, DefinitionTr),
                      Example = COALESCE(@Example, Example),
                      DetailsFetchedAt = CASE WHEN @MarkFetched = 1 THEN SYSDATETIME() ELSE DetailsFetchedAt END
                  WHERE Id = @Id",
                new
                {
                    Id = id, TurkishMeaning = turkishMeaning, Definition = definition,
                    DefinitionTr = definitionTr, Example = example, MarkFetched = markFetched
                });
                // Kullanıcının bu kelime için kendi yazdığı anlam (yoksa null)
        public Task<string?> GetCustomMeaningAsync(int userId, int wordId) =>
            ExecuteScalarAsync<string?>(
                "SELECT CustomMeaning FROM UserWords WHERE UserId = @UserId AND WordId = @WordId",
                new { UserId = userId, WordId = wordId });

        // Kendi anlamını kaydet. Kelime henüz hiç çalışılmadıysa UserWords'te satırı yok,
        // o zaman 1. kutuda, bugün tekrar edilecek şekilde oluştur (upsert)
        public Task SaveCustomMeaningAsync(int userId, int wordId, string? meaning, DateTime today) =>
            ExecuteAsync(
                @"UPDATE UserWords SET CustomMeaning = @Meaning
                  WHERE UserId = @UserId AND WordId = @WordId;

                  IF @@ROWCOUNT = 0
                      INSERT INTO UserWords (UserId, WordId, Box, NextReviewDate, CustomMeaning)
                      VALUES (@UserId, @WordId, 1, @Today, @Meaning);",
                new { UserId = userId, WordId = wordId, Meaning = meaning, Today = today });
        
        // Verilen kelimelerden sadece bizim listemizde olanları döndürür (küçük harfle)
        public async Task<HashSet<string>> FilterKnownAsync(IEnumerable<string> words)
        {
            var list = words.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (list.Count == 0) return new HashSet<string>();

            // Dapper "IN @Words" yazınca listeyi kendisi (@Words1, @Words2...) diye açıyor
            var known = await QueryAsync<string>(
                "SELECT DISTINCT Headword FROM Words WHERE Headword IN @Words",
                new { Words = list });

            return known.Select(k => k.ToLowerInvariant()).ToHashSet();
        }
                // Sonradan eklenen alanlar (örnek çevirisi, fonetik): null gelen alan eski değerini korur
        public Task SaveExtrasAsync(int id, string? exampleTr, string? phonetic) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET ExampleTr = COALESCE(@ExampleTr, ExampleTr),
                      Phonetic = COALESCE(@Phonetic, Phonetic)
                  WHERE Id = @Id",
                new { Id = id, ExampleTr = exampleTr, Phonetic = phonetic });

        // Verilen kelimelerden bizim listemizde olanlar (aynı kelimenin birden fazla türü olabilir)
        public async Task<IEnumerable<FamilyMemberDto>> GetByHeadwordsAsync(IEnumerable<string> headwords)
        {
            var list = headwords.ToList();
            if (list.Count == 0) return Enumerable.Empty<FamilyMemberDto>();

            return await QueryAsync<FamilyMemberDto>(
                @"SELECT Id AS WordId, Headword, PartOfSpeech, Level, TurkishMeaning
                  FROM Words
                  WHERE Headword IN @Words
                  ORDER BY Level, Headword",
                new { Words = list });
        }
        
        // Sıradaki doldurulacak kelime. Sıra numarası TÜM kelimeler üzerinden verilir (sabit kalsın),
        // filtre sonra uygulanır: böylece seviyeler sırayla gelir (A1, A2, B1, B2, C1, A1, ...)
        public Task<Word?> GetNextForBackfillAsync() =>
            QuerySingleOrDefaultAsync<Word>(
                @"SELECT TOP 1 * FROM (
                      SELECT *, ROW_NUMBER() OVER (PARTITION BY Level ORDER BY Id) AS Rn
                      FROM Words
                  ) x
                  WHERE DictionaryFetchedAt IS NULL AND Definition IS NULL
                  ORDER BY Rn, Level");

        // Tanım ve örneği kaydet, kelimeyi "denendi" diye işaretle (sözlükte yoksa da)
        public Task SaveDictionaryAsync(int id, string? definition, string? example) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET Definition = COALESCE(@Definition, Definition),
                      Example = COALESCE(@Example, Example),
                      DictionaryFetchedAt = SYSDATETIME()
                  WHERE Id = @Id",
                new { Id = id, Definition = definition, Example = example });
        
        // Sıradaki kelime: önce tema kelimeleri, sonra anlamı boş olanlar, sonra seviye sırası.
        // onlyWithMeaning: kota dolunca sadece anlamı olanlar (sözlükten yenilenir, kota harcamaz)
        public Task<Word?> GetNextForMeaningAsync(bool onlyWithMeaning = false) =>
            QuerySingleOrDefaultAsync<Word>(
                @"SELECT TOP 1 w.* FROM Words w
                  WHERE w.MeaningFetchedAt IS NULL
                    AND (@OnlyWithMeaning = 0 OR w.TurkishMeaning IS NOT NULL)
                  ORDER BY CASE WHEN EXISTS (SELECT 1 FROM ThemeWords tw WHERE tw.WordId = w.Id) THEN 0 ELSE 1 END,
                           CASE WHEN w.TurkishMeaning IS NULL THEN 0 ELSE 1 END,
                           w.Level, w.Id",
                new { OnlyWithMeaning = onlyWithMeaning });

        // Anlamı kaydet ve "denendi" diye işaretle
        public Task SaveMeaningAsync(int id, string? meaning) =>
            ExecuteAsync(
                @"UPDATE Words
                  SET TurkishMeaning = COALESCE(@Meaning, TurkishMeaning), MeaningFetchedAt = SYSDATETIME()
                  WHERE Id = @Id",
                new { Id = id, Meaning = meaning });
    }

}