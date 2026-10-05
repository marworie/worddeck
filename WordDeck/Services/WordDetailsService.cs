using System.Text.Json;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Bir kelimenin Türkçe anlamını (MyMemory), İngilizce tanımını ve örnek cümlesini
    // (Wiktionaryy) dış API'lerden çeker.
    public class WordDetailsService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WordDetailsService> _logger;

        public WordDetailsService(IHttpClientFactory httpClientFactory, ILogger<WordDetailsService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        // İki kaynağa aynı anda, birbirinden bağımsız istek atar:
        // biri hata verirse diğerinin sonucu yine kullanılır
        public async Task<WordDetailsResult> FetchAsync(string headword, string partOfSpeech)
        {
            var meaningTask = TryAsync(() => FetchTurkishAsync(headword), "MyMemory", headword);
            var dictTask = TryAsync(() => FetchDefinitionAsync(headword, partOfSpeech), "Wiktionary", headword);
            await Task.WhenAll(meaningTask, dictTask);

            var (meaningOk, meaning) = meaningTask.Result;
            var (dictOk, dict) = dictTask.Result;

            return new WordDetailsResult(meaningOk && dictOk, meaning, dict.Definition, dict.Example);
        }

        // Bir isteği çalıştırır; hata olursa uygulamayı çökertmez, loglayıp "başarısız" döner
        private async Task<(bool Ok, T? Value)> TryAsync<T>(Func<Task<T>> action, string source, string headword)
        {
            try
            {
                return (true, await action());
            }
            catch (Exception ex)
            {
                _logger.LogWarning("{Source} hatası ({Word}): {Message}", source, headword, ex.Message);
                return (false, default);
            }
        }

        private static readonly CultureInfo Turkish = new("tr-TR");
        
        // Detay çekme sonucu. Complete = false ise kaynaklardan biri hata verdi, sonra tekrar denenmeli
        public record WordDetailsResult(bool Complete, string? TurkishMeaning, string? Definition, string? Example);

        // MyMemory: İngilizce → Türkçe çeviri.
        // Tüm eşleşmelere bakıp tam bu kelimeye ait, en yüksek puanlı, anlamlı çeviriyi seçer.
        private async Task<string?> FetchTurkishAsync(string headword)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);   // site yavaşsa 8 saniyede vazgeç
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

        // Wiktionary: İngilizce tanım ve örnek cümle
        private async Task<(string? Definition, string? Example)> FetchDefinitionAsync(string headword, string partOfSpeech)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);
            // Wikimedia, kimin istek attığını belirten bir User-Agent istiyor
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WordDeck/1.0 (https://github.com/marworie/worddeck)");

            // Wiktionary'de sayfa adlarında boşluk yerine alt çizgi kullanılıyor
            var title = Uri.EscapeDataString(headword.Replace(' ', '_'));
            var response = await client.GetAsync($"https://en.wiktionary.org/api/rest_v1/page/definition/{title}");

            if (response.StatusCode == HttpStatusCode.NotFound)
                return (null, null);              // sözlükte yok: hata değil, sadece bilgi yok
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

            // Cevapta dillere göre bölümler var, bize sadece İngilizce ("en") lazım
            if (!doc.RootElement.TryGetProperty("en", out var english))
                return (null, null);

            // Tüm anlamları tek listede topla: (tür, tanım, örnek)
            var senses = new List<(string Pos, string Definition, string? Example)>();
            foreach (var section in english.EnumerateArray())
            {
                string pos = section.TryGetProperty("partOfSpeech", out var p) ? p.GetString() ?? "" : "";
                if (!section.TryGetProperty("definitions", out var defs)) continue;

                foreach (var def in defs.EnumerateArray())
                {
                    string text = CleanHtml(def.TryGetProperty("definition", out var d) ? d.GetString() ?? "" : "");
                    if (text.Length == 0) continue;

                    // Örnekler bir liste halinde geliyor, ilk dolu olanı al
                    string? exampleText = null;
                    if (def.TryGetProperty("examples", out var exs) && exs.ValueKind == JsonValueKind.Array)
                    {
                        exampleText = exs.EnumerateArray()
                            .Where(e => e.ValueKind == JsonValueKind.String)
                            .Select(e => CleanHtml(e.GetString() ?? ""))
                            .FirstOrDefault(e => e.Length > 0);
                    }

                    senses.Add((pos, text, exampleText));
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

        // Wiktionary tanımları HTML içeriyor bunları temizlemek için
        private static readonly Regex HtmlTags = new("<[^>]+>", RegexOptions.Compiled);
        private static string CleanHtml(string html) =>
            WebUtility.HtmlDecode(HtmlTags.Replace(html, "")).Trim();


    }
}