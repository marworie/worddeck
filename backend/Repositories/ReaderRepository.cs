using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IReaderRepository
    {
        Task<IEnumerable<ReaderWordRow>> FindHeadwordsAsync(int userId, IEnumerable<string> headwords);
    }

    public class ReaderRepository : BaseRepository, IReaderRepository
    {
        public ReaderRepository(IConfiguration configuration) : base(configuration) { }

        // Aynı kelimenin birden fazla türü olabilir (noun/verb): kullanıcının çalıştığı, yoksa en düşük seviyeli seçilir.
        // Kelimeler tek parametrede virgülle gönderilir; SQL Server'ın 2100 parametre sınırına takılmaz.
        public Task<IEnumerable<ReaderWordRow>> FindHeadwordsAsync(int userId, IEnumerable<string> headwords) =>
            QueryAsync<ReaderWordRow>(
                @"WITH c AS (
                      SELECT w.Id AS WordId, w.Headword, w.PartOfSpeech, w.Level,
                             COALESCE(uw.CustomMeaning, w.TurkishMeaning) AS TurkishMeaning,
                             CAST(uw.Box AS INT) AS Box,
                             ROW_NUMBER() OVER (PARTITION BY w.Headword
                                 ORDER BY CASE WHEN uw.WordId IS NULL THEN 1 ELSE 0 END, w.Level, w.Id) AS rn
                      FROM Words w
                      LEFT JOIN UserWords uw ON uw.WordId = w.Id AND uw.UserId = @UserId
                      WHERE w.Headword IN (SELECT value FROM STRING_SPLIT(@Heads, ','))
                  )
                  SELECT WordId, Headword, PartOfSpeech, Level, TurkishMeaning, Box
                  FROM c WHERE rn = 1",
                new { UserId = userId, Heads = string.Join(',', headwords) });
    }
}