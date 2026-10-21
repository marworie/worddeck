using WordDeck.Repositories;

namespace WordDeck.Services
{
    // Arka planda, Türkçe anlamı boş kelimeleri MyMemory'den sırayla çevirip kaydeder.
    // Günlük kotanın bir kısmını kullanır; kalanı kullanıcının açtığı kelimeler için boş kalır.
    public class MeaningBackfillService : BackgroundService
    {
        private static readonly TimeSpan Delay = TimeSpan.FromSeconds(3);
        private static readonly TimeSpan ErrorDelay = TimeSpan.FromMinutes(30);   // hata ya da kota: uzun dinlen
        private const int DailyCharLimit = 30_000;   // 50 binlik günlük kotanın 30 binini kullan

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

            // TODO: Günlük kota sayacı bellekte tutuluyor. Uygulama gün içinde yeniden başlarsa
            // sıfırlanıyor ve kota aşılabilir. Kalıcı olarak nerede tutulmalı? (iş yerinde sorulacak)
            DateTime day = AppClock.Today;
            int usedToday = 0, done = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                // Gün değiştiyse sayaç sıfırlansın
                if (AppClock.Today != day) { day = AppClock.Today; usedToday = 0; }

                // Bugünkü payını kullandıysa bir saat sonra tekrar bak
                if (usedToday >= DailyCharLimit)
                {
                    await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                    continue;
                }

                var wait = Delay;
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var words = scope.ServiceProvider.GetRequiredService<IWordRepository>();
                    var details = scope.ServiceProvider.GetRequiredService<WordDetailsService>();

                    var word = await words.GetNextForMeaningAsync();
                    if (word == null)
                    {
                        _logger.LogInformation("Anlam doldurma bitti ({Count} kelime).", done);
                        return;
                    }

                    var (ok, meaning) = await details.FetchMeaningOnlyAsync(word.Headword, word.PartOfSpeech);
                    usedToday += word.Headword.Length + 3;   // fiillerde "to " da gönderiliyor

                    if (ok)
                    {
                        await words.SaveMeaningAsync(word.Id, meaning);
                        if (++done % 100 == 0)
                            _logger.LogInformation("Anlam doldurma: {Count} kelime (bugün {Used} karakter).", done, usedToday);
                    }
                    else
                    {
                        wait = ErrorDelay;   // işaretleme: sonra tekrar denensin
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