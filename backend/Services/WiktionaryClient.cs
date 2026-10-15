using System.Text.Json;
using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Wiktionary'den bir sayfanın ham metnini (wikitext) çeker.
    // Fonetik ve kelime ailesi aynı sayfadan okunuyor, kod tek yerde dursun diye ayrı sınıf.
    public class WiktionaryClient
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public WiktionaryClient(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

        // Sayfa yoksa null döner; ağ hatasında exception fırlatır (çağıran yakalasın)
        public async Task<string?> GetWikitextAsync(string headword)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("WordDeck/1.0 (https://github.com/marworie/worddeck)");

            var url = "https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content" +
                      $"&rvslots=main&format=json&formatversion=2&titles={Uri.EscapeDataString(headword)}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var page = doc.RootElement.GetProperty("query").GetProperty("pages")[0];
            if (page.TryGetProperty("missing", out _)) return null;

            return page.GetProperty("revisions")[0]
                .GetProperty("slots").GetProperty("main").GetProperty("content").GetString();
        }

        // Sayfada birçok dil var: sadece "==English==" başlığından bir sonraki dil başlığına kadar olan kısım
        public static string? EnglishSection(string wikitext)
        {
            int start = wikitext.IndexOf("==English==", StringComparison.Ordinal);
            if (start < 0) return null;

            int bodyStart = start + "==English==".Length;
            var nextLanguage = Regex.Match(wikitext[bodyStart..], @"^==[^=]", RegexOptions.Multiline);
            return nextLanguage.Success
                ? wikitext.Substring(start, "==English==".Length + nextLanguage.Index)
                : wikitext[start..];
        }
    }
}