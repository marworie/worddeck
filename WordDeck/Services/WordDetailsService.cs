using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Detay çekme sonucu. Complete = false ise kaynaklardan biri hata verdi, sonra tekrar denenmeli
    public record WordDetailsResult(bool Complete, string? TurkishMeaning, string? Definition, string? DefinitionTr, string? Example);

    // Bir kelimenin Türkçe anlamını (MyMemory), İngilizce tanımını ve örnek cümlesini (Wiktionary)
    // dış API'lerden çeker; tanımın Türkçe çevirisini de MyMemory'den alır.
    public class WordDetailsService
    {
        private static readonly CultureInfo Turkish = new("tr-TR");

        // <style>...</style> ve <script>...</script> bloklarını içerikleriyle birlikte sil
        private static readonly Regex StyleBlocks = new("<(style|script)[^>]*>.*?</\\1>",
            RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

        // Kalan HTML etiketlerini (<a>, <i> gibi) sil, içlerindeki yazı kalsın
        private static readonly Regex HtmlTags = new("<[^>]+>", RegexOptions.Compiled);

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<WordDetailsService> _logger;
        private readonly string? _myMemoryEmail;   // varsa günlük çeviri sınırı 5 bin → 50 bin karakter

        public WordDetailsService(IHttpClientFactory httpClientFactory, ILogger<WordDetailsService> logger, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _myMemoryEmail = configuration["MyMemoryEmail"];
        }

        // Kelime çevirisi ve sözlük aynı anda, birbirinden bağımsız çekilir;
        // tanım gelirse onun Türkçesi de çevrilir
        public async Task<WordDetailsResult> FetchAsync(string headword, string partOfSpeech)
        {
            var meaningTask = TryAsync(() => FetchTurkishAsync(headword, partOfSpeech), "MyMemory", headword);            var dictTask = TryAsync(() => FetchDefinitionAsync(headword, partOfSpeech), "Wiktionary", headword);
            await Task.WhenAll(meaningTask, dictTask);

            var (meaningOk, meaning) = meaningTask.Result;
            var (dictOk, dict) = dictTask.Result;

            // Tanımı çevirmek için önce tanımın gelmesi lazım, o yüzden bu adım sırayla
            bool defTrOk = true;
            string? definitionTr = null;
            if (dict.Definition != null)
            {
                (defTrOk, definitionTr) = await TryAsync(() => TranslateSentenceAsync(dict.Definition), "MyMemory (tanım)", headword);
            }

            return new WordDetailsResult(meaningOk && dictOk && defTrOk, meaning, dict.Definition, definitionTr, dict.Example);
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

        // ============ MyMemory (çeviri) ============

        // MyMemory adresi: e-posta tanımlıysa ekle (günlük sınır artsın)
        private string BuildMyMemoryUrl(string text)
        {
            var url = $"https://api.mymemory.translated.net/get?q={Uri.EscapeDataString(text)}&langpair=en|tr";
            return string.IsNullOrWhiteSpace(_myMemoryEmail) ? url : $"{url}&de={Uri.EscapeDataString(_myMemoryEmail)}";
        }

        // Kota dolduysa MyMemory hata kodu yerine bu uyarıyı çeviri olarak döndürüyor
        private static void ThrowIfQuotaExceeded(string? text)
        {
            if (text != null && text.Contains("MYMEMORY WARNING", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("MyMemory günlük kotası doldu.");
        }

        // Tek kelime çevirisi: tüm eşleşmelere bakıp tam bu kelimeye ait, en yüksek puanlı, anlamlı çeviriyi seçer
        // Tek kelime çevirisi: en yüksek puanlı, birbirinden farklı en fazla 3 anlamı döndürür.
        // Fiilleri "to run" şeklinde soruyoruz: hem mastar halinde ("koşmak") hem daha doğru çeviri geliyor
        private async Task<string?> FetchTurkishAsync(string headword, string partOfSpeech)
        {
            bool isVerb = partOfSpeech.Contains("verb", StringComparison.OrdinalIgnoreCase)
                       && !partOfSpeech.Contains("adverb", StringComparison.OrdinalIgnoreCase)
                       && !partOfSpeech.Contains("modal", StringComparison.OrdinalIgnoreCase);   // "to can" olmasın
            string query = isVerb ? $"to {headword}" : headword;

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            var response = await client.GetAsync(BuildMyMemoryUrl(query));
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;

            var candidates = new List<(string Text, double Score)>();

            // 1) Çeviri hafızasındaki eşleşmeler: sadece kaynağı tam olarak bizim sorduğumuz olanlar
            if (root.TryGetProperty("matches", out var matches) && matches.ValueKind == JsonValueKind.Array)
            {
                foreach (var m in matches.EnumerateArray())
                {
                    string? segment = m.TryGetProperty("segment", out var s) ? s.GetString() : null;
                    string? translation = m.TryGetProperty("translation", out var t) ? t.GetString() : null;
                    double score = m.TryGetProperty("match", out var sc) && sc.ValueKind == JsonValueKind.Number
                        ? sc.GetDouble() : 0;

                    if (translation != null && segment != null &&
                        segment.Trim().Equals(query, StringComparison.OrdinalIgnoreCase))
                    {
                        candidates.Add((translation, score));
                    }
                }
            }

            // 2) Ana sonuç da bir aday (en yüksek öncelikli: MyMemory'nin kendi seçimi)
            string? main = root.GetProperty("responseData").GetProperty("translatedText").GetString();
            ThrowIfQuotaExceeded(main);
            if (main != null) candidates.Add((main, 2.0));

            // Puana göre sırala, aynı anlamları tekrarlama, en fazla 3 tane al
            var meanings = candidates
                .Where(c => IsUsableTranslation(c.Text, headword) && IsUsableTranslation(c.Text, query))
                .OrderByDescending(c => c.Score)
                .Select(c => c.Text.Trim().TrimEnd('.').ToLower(Turkish))   // Türkçe kurallarıyla küçült
                .Distinct()
                .Take(3)
                .ToList();

            return meanings.Count > 0 ? string.Join(", ", meanings) : null;
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

        // Cümle çevirisi (tanım için): eşleşme aramaya gerek yok, ana sonucu al
        private async Task<string?> TranslateSentenceAsync(string text)
        {
            if (text.Length > 450) return null;   // MyMemory uzun metinleri kabul etmiyor

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            var response = await client.GetAsync(BuildMyMemoryUrl(text));
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            string? translated = doc.RootElement.GetProperty("responseData").GetProperty("translatedText").GetString();
            ThrowIfQuotaExceeded(translated);

            return string.IsNullOrWhiteSpace(translated) ? null : translated.Trim();
        }

        // ============ Wiktionary (tanım + örnek) ============

        private static string CleanHtml(string html) =>
            WebUtility.HtmlDecode(HtmlTags.Replace(StyleBlocks.Replace(html, ""), "")).Trim();

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

                        // Wiktionary'de en yaygın anlamlar en üstte. Sadece ilk 3 anlam içinde örneği olanı tercih et,
            // yoksa çok aşağıdaki nadir bir anlamı seçmek yerine en üstteki anlamı al
            var withExample = pool.Take(3).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s.Example));
            return withExample.Definition != null
                ? (withExample.Definition, withExample.Example)
                : (pool[0].Definition, null);
        }
    }
}