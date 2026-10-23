using System.Net.Http.Json;
using System.Text.Json;
using WordDeck.Dtos;

namespace WordDeck.Services
{
    // LanguageTool ücretsiz API'si ile dil bilgisi kontrolü (dakikada 20 istek sınırı var)
    public class LanguageToolService
    {
        private const string Url = "https://api.languagetool.org/v2/check";
        private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

        // LanguageTool'un kategori kimlikleri → Türkçe
        private static readonly Dictionary<string, string> Categories = new()
        {
            ["GRAMMAR"] = "Dil bilgisi",
            ["TYPOS"] = "Yazım",
            ["PUNCTUATION"] = "Noktalama",
            ["CASING"] = "Büyük/küçük harf",
            ["STYLE"] = "Üslup",
            ["CONFUSED_WORDS"] = "Karıştırılan kelime",
            ["COLLOCATIONS"] = "Kelime uyumu",
            ["TYPOGRAPHY"] = "Yazım düzeni"
        };

        private readonly IHttpClientFactory _http;
        private readonly ILogger<LanguageToolService> _logger;

        public LanguageToolService(IHttpClientFactory http, ILogger<LanguageToolService> logger)
        {
            _http = http;
            _logger = logger;
        }

        // Hatalar; servis cevap vermezse null (kontrol yapılamadı)
        public async Task<List<SentenceIssueDto>?> CheckAsync(string text)
        {
            try
            {
                var client = _http.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var form = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["text"] = text,
                    ["language"] = "en-US",
                });

                var response = await client.PostAsync(Url, form);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("LanguageTool {Status} döndü", (int)response.StatusCode);
                    return null;
                }

                var data = await response.Content.ReadFromJsonAsync<LtResponse>(Json);
                return (data?.Matches ?? new())
                    .Select(m => new SentenceIssueDto
                    {
                        Offset = m.Offset,
                        Length = m.Length,
                        Message = m.Message,
                        Category = Categories.GetValueOrDefault(m.Rule?.Category?.Id ?? "", m.Rule?.Category?.Name ?? "Diğer"),
                        Replacements = (m.Replacements ?? new()).Take(3).Select(r => r.Value).ToList()
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "LanguageTool'a ulaşılamadı");
                return null;
            }
        }

        // LanguageTool cevabının kullandığımız kısmı
        private record LtResponse(List<LtMatch>? Matches);
        private record LtMatch(string Message, int Offset, int Length, List<LtReplacement>? Replacements, LtRule? Rule);
        private record LtReplacement(string Value);
        private record LtRule(string Id, LtCategory? Category);
        private record LtCategory(string Id, string Name);
    }
}