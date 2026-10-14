using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using WordDeck.Dtos;
using WordDeck.Repositories;

namespace WordDeck.Services
{
    // Datamuse API'den kelime ağı: eş/zıt anlamlılar, ilişkili kelimeler, sık birlikte kullanılanlar.
    // Ücretsiz, anahtar gerektirmiyor. Sonuçlar değişmediği için 1 gün önbellekte tutuluyor.
    public class WordNetworkService
    {
        private static readonly TimeSpan CacheDuration = TimeSpan.FromDays(1);

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<WordNetworkService> _logger;
        private readonly IWordRepository _words;

        public WordNetworkService(IHttpClientFactory httpClientFactory, IMemoryCache cache,
            ILogger<WordNetworkService> logger, IWordRepository words)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
            _words = words;
        }

        // Datamuse cevabındaki tek bir sonuç
        private class DatamuseItem
        {
            public string Word { get; set; } = string.Empty;
        }

        public async Task<WordNetworkDto> GetNetworkAsync(string headword, string partOfSpeech)
        {
            string key = $"network:{headword.ToLowerInvariant()}:{partOfSpeech.ToLowerInvariant()}";
            if (_cache.TryGetValue(key, out WordNetworkDto? cached) && cached != null)
                return cached;

            string w = Uri.EscapeDataString(headword);
            string pos = partOfSpeech.ToLowerInvariant();

            // Kelimenin türüne göre "birlikte kullanılanlar" sorgusu:
            //   isim   → onu niteleyen sıfatlar (rel_jjb):   "narrow lane"   → sıfat ÖNCE gelir
            //   sıfat  → nitelediği isimler (rel_jja):       "happy ending"  → isim SONRA gelir
            //   diğer  → hemen arkasından gelenler (lc):     "run out"       → kelime SONRA gelir
            (string collocationQuery, string position) = pos switch
            {
                "noun" => ($"rel_jjb={w}", "before"),
                "adjective" => ($"rel_jja={w}", "after"),
                _ => ($"lc={w}", "after")
            };

            // Dört isteği aynı anda gönder
            var synTask = FetchAsync($"rel_syn={w}");
            var antTask = FetchAsync($"rel_ant={w}");
            var trgTask = FetchAsync($"rel_trg={w}");
            var colTask = FetchAsync(collocationQuery);
            await Task.WhenAll(synTask, antTask, trgTask, colTask);

            // Eş anlamlı bulunamadıysa "anlamca benzer" kelimelere bak (road, path, alley gibi)
            var synonyms = synTask.Result.Count > 0
                ? synTask.Result
                : await FetchAsync($"ml={w}");

            // Eş anlamlı ve ilişkilileri bizim listemizle süz: özel isimler ve nadir kelimeler elensin
            var known = await _words.FilterKnownAsync(synonyms.Concat(trgTask.Result).Concat(colTask.Result));
            bool IsKnown(string s) => known.Contains(s.ToLowerInvariant()) && !s.Equals(headword, StringComparison.OrdinalIgnoreCase);

            var result = new WordNetworkDto
            {
                Synonyms = synonyms.Where(IsKnown).Take(6).ToList(),
                Antonyms = antTask.Result,
                Associated = trgTask.Result.Where(IsKnown).Take(6).ToList(),
                Collocations = colTask.Result.Where(IsKnown).Take(6).ToList(),
                CollocationPosition = position
            };

            _cache.Set(key, result, CacheDuration);
            return result;
        }

        // Tek bir Datamuse sorgusu. Hata olursa boş liste (kelime ağı olmazsa da uygulama çalışsın)
        private async Task<List<string>> FetchAsync(string query)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(6);

                var json = await client.GetStringAsync($"https://api.datamuse.com/words?{query}&max=8");
                var items = JsonSerializer.Deserialize<List<DatamuseItem>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

                return items.Select(i => i.Word).Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Datamuse hatası ({Query}): {Message}", query, ex.Message);
                return new List<string>();
            }
        }
    }
}