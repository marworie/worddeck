using WordDeck.Repositories;

namespace WordDeck.Services
{
    // Arka planda, Türkçe anlamı boş kelimeleri MyMemory'den sırayla çevirip kaydeder.
    // Günlük kotanın bir kısmını kullanır; kalanı kullanıcının açtığı kelimeler için boş kalır.
    public class MeaningBackfillService : BackgroundService
    {
        private static readonly TimeSpan Delay = TimeSpan.FromSeconds(1);
        private static readonly TimeSpan ErrorDelay = TimeSpan.FromMinutes(30);   // hata ya da kota: uzun dinlen
        private const int DailyCharLimit = 30_000;   // 50 binlik günlük kotanın 30 binini kullanılır

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MeaningBackfillService> _logger;
        private readonly bool _enabled;

        public MeaningBackfillService(IServiceScopeFactory scopeFactory, ILogger<MeaningBackfillService> logger, IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _enabled = configuration.GetValue("MeaningBackfill", true);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled) return;
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            int done = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                var wait = Delay;
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var words = scope.ServiceProvider.GetRequiredService<IWordRepository>();
                    var details = scope.ServiceProvider.GetRequiredService<WordDetailsService>();
                    var usage = scope.ServiceProvider.GetRequiredService<IApiUsageRepository>();

                    var today = AppClock.Today;
                    int usedToday = await usage.GetCharsAsync("MyMemory", today);
                    bool quotaLeft = usedToday < DailyCharLimit;

                    // Kota dolduysa sadece anlamı olan kelimeleri sözlükten yenile (kota harcamaz)
                    var word = await words.GetNextForMeaningAsync(onlyWithMeaning: !quotaLeft);

                    if (word == null)
                    {
                        if (quotaLeft)
                        {
                            _logger.LogInformation("Anlam doldurma bitti ({Count} kelime).", done);
                            return;
                        }
                        wait = TimeSpan.FromHours(1);   // bugünlük yapılacak kalmadı: boş kelimeler için yarını bekle
                    }
                    else
                    {
                        // MyMemory sadece anlamı hiç olmayan kelimede ve kota varken kullanılır
                        bool allowMyMemory = word.TurkishMeaning == null && quotaLeft;
                        var (ok, meaning, usedMyMemory) = await details.FetchMeaningOnlyAsync(word.Headword, word.PartOfSpeech, allowMyMemory);

                        if (usedMyMemory)
                            await usage.AddCharsAsync("MyMemory", today, word.Headword.Length + 3);   // fiillerde "to " da gidiyor

                        if (!ok)
                        {
                            wait = ErrorDelay;   // işaretleme: sonra tekrar denensin
                        }
                        else
                        {
                            await words.SaveMeaningAsync(word.Id, meaning);   // yeni anlam yoksa eskisi korunur (COALESCE)
                            if (++done % 100 == 0)
                                _logger.LogInformation("Anlam doldurma: {Count} kelime (bugün MyMemory {Used} karakter).", done, usedToday);
                        }
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning("Anlam doldurma hatası: {Message}", ex.Message);
                    wait = ErrorDelay;
                }

                await Task.Delay(wait, stoppingToken);
            }
        }
    }
}