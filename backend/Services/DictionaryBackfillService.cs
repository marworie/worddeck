using WordDeck.Repositories;

namespace WordDeck.Services
{
    // Uygulama çalışırken arka planda, detayı hiç çekilmemiş kelimelerin tanımını ve
    // örnek cümlesini Wiktionary'den sırayla doldurur. Sınav ve seviye testi bunlarla soru üretir.
    public class DictionaryBackfillService : BackgroundService
    {
        private static readonly TimeSpan Delay = TimeSpan.FromSeconds(2);        // Wiktionary'yi yormamak için
        private static readonly TimeSpan ErrorDelay = TimeSpan.FromMinutes(1);   // hata olursa biraz dinlen

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DictionaryBackfillService> _logger;
        private readonly bool _enabled;

        public DictionaryBackfillService(IServiceScopeFactory scopeFactory, ILogger<DictionaryBackfillService> logger, IConfiguration configuration)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            // appsettings'te "DictionaryBackfill": false yazılırsa çalışmaz
            _enabled = configuration.GetValue("DictionaryBackfill", true);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled) return;

            // Uygulama açılışını yavaşlatmasın, biraz sonra başla
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            int done = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                var wait = Delay;
                try
                {
                    // Repository "scoped": her tur için yeni bir kapsam aç
                    using var scope = _scopeFactory.CreateScope();
                    var words = scope.ServiceProvider.GetRequiredService<IWordRepository>();
                    var details = scope.ServiceProvider.GetRequiredService<WordDetailsService>();

                    var word = await words.GetNextForBackfillAsync();
                    if (word == null)
                    {
                        _logger.LogInformation("Sözlük doldurma bitti ({Count} kelime).", done);
                        return;
                    }

                    var (ok, definition, example) = await details.FetchDictionaryOnlyAsync(word.Headword, word.PartOfSpeech);
                    await words.SaveDictionaryAsync(word.Id, definition, example);   // hata olsa da işaretle: takılıp kalmasın
                    if (!ok) wait = ErrorDelay;

                    if (++done % 100 == 0)
                        _logger.LogInformation("Sözlük doldurma: {Count} kelime işlendi.", done);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning("Sözlük doldurma hatası: {Message}", ex.Message);
                    wait = ErrorDelay;
                }

                await Task.Delay(wait, stoppingToken);
            }
        }
    }
}