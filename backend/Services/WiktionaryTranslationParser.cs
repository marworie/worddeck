using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Wiktionary ham metnindeki çeviri tablosundan Türkçe karşılıkları bulur:
    //   * Turkish: {{t+|tr|lezzetli}}, {{t+|tr|tatlı}}, {{t|tr|leziz}}
    // Kelimenin türüne (noun, verb...) uyan bölümün ilk tablosu tercih edilir:
    // Wiktionary'de ilk tablo en yaygın anlamın çevirisidir. Veritabanına dokunmaz, kolayca test edilir.
    public static class WiktionaryTranslationParser
    {
        public const int MaxTerms = 3;

        // ===Noun===, ====Verb==== gibi tür başlıkları
        private static readonly Regex PosHeader = new(
            @"^={3,5}\s*(Noun|Verb|Adjective|Adverb|Preposition|Pronoun|Conjunction|Determiner|Interjection|Numeral|Article)\s*={3,5}\s*$",
            RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // "* Turkish: ..." satırı
        private static readonly Regex TurkishLine = new(@"^\*\s*Turkish\s*:(.*)$", RegexOptions.Multiline | RegexOptions.Compiled);

        // {{t|tr|kelime}}, {{t+|tr|kelime}}, {{tt|tr|...}}, {{tt+|tr|...}} → "kelime"
        private static readonly Regex TurkishTerm = new(@"\{\{tt?\+?\|tr\|([^|}]+)", RegexOptions.Compiled);

        public static string? FindTurkish(string englishSection, string partOfSpeech)
        {
            // Metni tür bölümlerine ayır
            var headers = PosHeader.Matches(englishSection);
            var blocks = new List<(string Pos, string Text)>();
            for (int i = 0; i < headers.Count; i++)
            {
                int start = headers[i].Index;
                int end = i + 1 < headers.Count ? headers[i + 1].Index : englishSection.Length;
                blocks.Add((headers[i].Groups[1].Value, englishSection[start..end]));
            }
            if (blocks.Count == 0) blocks.Add(("", englishSection));

            // Önce türü eşleşen bölümler, sonra diğerleri
            var ordered = blocks.Where(b => b.Pos.Equals(partOfSpeech, StringComparison.OrdinalIgnoreCase))
                .Concat(blocks.Where(b => !b.Pos.Equals(partOfSpeech, StringComparison.OrdinalIgnoreCase)));

            foreach (var block in ordered)
            {
                var line = TurkishLine.Match(block.Text);   // bölümdeki ilk Türkçe satırı = ilk anlamın tablosu
                if (!line.Success) continue;

                var terms = TurkishTerm.Matches(line.Groups[1].Value)
                    .Select(m => m.Groups[1].Value.Trim())
                    .Where(t => t.Length > 0)
                    .Distinct()
                    .Take(MaxTerms)
                    .ToList();

                if (terms.Count > 0) return string.Join(", ", terms);
            }
            return null;
        }
    }
}