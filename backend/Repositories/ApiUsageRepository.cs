namespace WordDeck.Repositories
{
    public interface IApiUsageRepository
    {
        Task<int> GetCharsAsync(string service, DateTime date);
        Task AddCharsAsync(string service, DateTime date, int chars);
    }

    // Dış API'lerin günlük karakter kullanımını veritabanında tutar
    public class ApiUsageRepository : BaseRepository, IApiUsageRepository
    {
        public ApiUsageRepository(IConfiguration configuration) : base(configuration) { }

        // Bugün ne kadar kullanıldı (satır yoksa 0)
        public async Task<int> GetCharsAsync(string service, DateTime date) =>
            await ExecuteScalarAsync<int?>(
                "SELECT Chars FROM ApiUsage WHERE Service = @Service AND UsageDate = @Date",
                new { Service = service, Date = date.Date }) ?? 0;

        // Kullanımı artır: bugünün satırı varsa güncelle, yoksa oluştur
        public Task AddCharsAsync(string service, DateTime date, int chars) =>
            ExecuteAsync(
                @"UPDATE ApiUsage SET Chars = Chars + @Chars
                  WHERE Service = @Service AND UsageDate = @Date;

                  IF @@ROWCOUNT = 0
                      INSERT INTO ApiUsage (Service, UsageDate, Chars) VALUES (@Service, @Date, @Chars);",
                new { Service = service, Date = date.Date, Chars = chars });
    }
}