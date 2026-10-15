using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Wiktionary ham metninden kelime ailesini ayıklar ("Derived terms" ve "Related terms" bölümleri).
    // İnternete çıkmaz, sadece metin işler: kolayca test edilir.
    public static class WordFamilyParser
    {
        // ====Derived terms==== ya da ====Related terms==== (3+ eşittir işaretli başlıklar)
        private static readonly Regex FamilyHeading =
            new(@"^={3,}\s*(Derived terms|Related terms)\s*={3,}\s*$", RegexOptions.Multiline);

        // Herhangi bir başlık: bölümün nerede bittiğini bulmak için
        private static readonly Regex AnyHeading = new(@"^={2,}[^=].*?={2,}\s*$", RegexOptions.Multiline);

        // {{col|en|decidable|decided}}, {{der3|en|...}}, {{rel4|en|...}} gibi liste şablonları
        private static readonly Regex ListTemplate = new(@"\{\{(?:col|der|rel)[\w-]*\|en\|([^{}]*)\}\}");

        // * {{l|en|decision}} gibi tekli bağlantılar
        private static readonly Regex LinkTemplate = new(@"\{\{l\|en\|([^|{}]+)");

        public static List<string> Parse(string wikitext, string headword)
        {
            var english = WiktionaryClient.EnglishSection(wikitext);
            if (english == null) return new List<string>();

            var found = new List<string>();

            foreach (Match heading in FamilyHeading.Matches(english))
            {
                // Bölümün gövdesi: başlıktan bir sonraki başlığa kadar
                int bodyStart = heading.Index + heading.Length;
                var next = AnyHeading.Match(english, bodyStart);
                string body = next.Success ? english[bodyStart..next.Index] : english[bodyStart..];

                foreach (Match m in ListTemplate.Matches(body))
                    foreach (var part in m.Groups[1].Value.Split('|'))
                        AddWord(part);

                foreach (Match m in LinkTemplate.Matches(body))
                    AddWord(m.Groups[1].Value);
            }

            return found
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Where(w => !w.Equals(headword, StringComparison.OrdinalIgnoreCase))
                .ToList();

            // Şablondaki tek bir parçayı temizleyip listeye ekle
            void AddWord(string raw)
            {
                if (raw.Contains('=')) return;   // title=..., sort=... gibi şablon ayarları kelime değil

                // decidability<q:rare> → decidability,  [[decision]] → decision
                string word = Regex.Replace(raw, "<[^>]*>", "").Replace("[[", "").Replace("]]", "").Trim();

                // Tek kelimelik olanlar (aile için "make a decision" gibi deyimler fazla)
                if (word.Length > 1 && !word.Contains(' ')) found.Add(word);
            }
        }
    }
}