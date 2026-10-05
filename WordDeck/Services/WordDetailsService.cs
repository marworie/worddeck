using System.Text.Json;
using System.Globalization;

namespace WordDeck.Services
{
    // Bir kelimenin Türkçe anlamını (MyMemory), İngilizce tanımını ve örnek cümlesini
    // (Free Dictionary) dış API'lerden çeker.
    public class WordDetailsService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WordDetailsService> _logger;

        public WordDetailsService(IHttpClientFactory httpClientFactory, ILogger<WordDetailsService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        // Success = false ise ağ hatası vardır, sonuç kaydedilmemeli (sonra tekrar denensin)
        public async Task<(bool Success, string? TurkishMeaning, string? Definition, string? Example)>
            FetchAsync(string headword, string partOfSpeech)
        {
            try
            {
                // İki isteği aynı anda gönder, ikisini birden bekle
                var meaningTask = FetchTurkishAsync(headword);
                var dictTask = FetchDefinitionAsync(headword, partOfSpeech);
                await Task.WhenAll(meaningTask, dictTask);

                var (definition, example) = dictTask.Result;
                return (true, meaningTask.Result, definition, example);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Kelime detayları alınamadı: {Word}", headword);
                return (false, null, null, null);
            }
        }

        private static readonly CultureInfo Turkish = new("tr-TR");

        // MyMemory: İngilizce → Türkçe çeviri.
        // Tüm eşleşmelere bakıp tam bu kelimeye ait, en yüksek puanlı, anlamlı çeviriyi seçer.
        private async Task<string?> FetchTurkishAsync(string headword)
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(headword)}&langpair=en|tr";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();   // hata kodunda exception fırlatır → Success = false

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            var candidates = new List<(string Text, double Score)>();

            // 1) Çeviri hafızasındaki eşleşmeler: sadece kaynağı tam olarak bu kelime olanlar
            if (root.TryGetProperty("matches", out var matches) && matches.ValueKind == JsonValueKind.Array)
            {
                foreach (var m in matches.EnumerateArray())
                {
                    string? segment = m.TryGetProperty("segment", out var s) ? s.GetString() : null;
                    string? translation = m.TryGetProperty("translation", out var t) ? t.GetString() : null;
                    double score = m.TryGetProperty("match", out var sc) && sc.ValueKind == JsonValueKind.Number
                        ? sc.GetDouble() : 0;

                    if (translation != null && segment != null &&
                        segment.Trim().Equals(headword, StringComparison.OrdinalIgnoreCase))
                    {
                        candidates.Add((translation, score));
                    }
                }
            }

            // 2) Ana sonuç da bir aday (düşük öncelikli)
            string? main = root.GetProperty("responseData").GetProperty("translatedText").GetString();
            if (main != null)
            {
                // Günlük ücretsiz kota dolduysa bu mesaj geliyor: hata say ki kaydedilmesin, sonra tekrar denensin
                if (main.Contains("MYMEMORY WARNING", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("MyMemory günlük kotası doldu.");
                candidates.Add((main, 0.5));
            }

            return candidates
                .Where(c => IsUsableTranslation(c.Text, headword))
                .OrderByDescending(c => c.Score)
                .Select(c => c.Text.Trim().ToLower(Turkish))   // Türkçe kurallarıyla küçült (İ → i)
                .FirstOrDefault();
        }

        // Çöp çevirileri ele: boş, çok kısa, kelimenin kendisi, "na" gibi
        private static bool IsUsableTranslation(string text, string headword)
        {
            text = text.Trim();
            if (text.Length < 2) return false;
            if (text.Equals(headword, StringComparison.OrdinalIgnoreCase)) return false;

            string[] junk = { "na", "n/a", "-", "..." };
            return !junk.Contains(text.ToLowerInvariant());
        }

        // Free Dictionary: İngilizce tanım ve örnek cümle
        private async Task<(string? Definition, string? Example)> FetchDefinitionAsync(string headword, string partOfSpeech)
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"https://api.dictionaryapi.dev/api/v2/entries/en/{Uri.EscapeDataString(headword)}";

            var response = await client.GetAsync(url);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                return (null, null);              // sözlükte yok: hata değil, sadece bilgi yok
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            // Tüm anlamları tek listede topla: (tür, tanım, örnek)
            var senses = new List<(string Pos, string Definition, string? Example)>();
            foreach (var entry in doc.RootElement.EnumerateArray())
            {
                foreach (var meaning in entry.GetProperty("meanings").EnumerateArray())
                {
                    string pos = meaning.GetProperty("partOfSpeech").GetString() ?? "";
                    foreach (var def in meaning.GetProperty("definitions").EnumerateArray())
                    {
                        string text = def.GetProperty("definition").GetString() ?? "";
                        string? exampleText = def.TryGetProperty("example", out var ex) ? ex.GetString() : null;
                        senses.Add((pos, text, exampleText));
                    }
                }
            }

            if (senses.Count == 0) return (null, null);

            // Listemizdeki türle (noun, verb...) eşleşen anlamları tercih et, yoksa hepsini kullan
            var matching = senses.Where(s => s.Pos.Equals(partOfSpeech, StringComparison.OrdinalIgnoreCase)).ToList();
            var pool = matching.Count > 0 ? matching : senses;

            // Örnek cümlesi olan anlamı tercih et: tanım ve örnek aynı anlama ait olsun
            var withExample = pool.FirstOrDefault(s => !string.IsNullOrWhiteSpace(s.Example));
            return withExample.Definition != null
                ? (withExample.Definition, withExample.Example)
                : (pool[0].Definition, null);
        }
    }
}