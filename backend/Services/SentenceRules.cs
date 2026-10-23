using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Cümle kurma kontrolleri: hedef kelime kullanılmış mı, cümle yeterince uzun mu
    public static class SentenceRules
    {
        public const int MinWords = 4;
        public const int MaxLength = 300;

        private static readonly Regex WordPattern = new(@"[A-Za-z’'-]+");

        public static List<string> Words(string sentence) =>
            WordPattern.Matches(sentence)
                .Select(m => Lemmatizer.Normalize(m.Value))
                .Where(w => w.Length > 0)
                .ToList();

        // "go" için "went", "run" için "running" da kabul edilir
        public static bool UsesWord(string sentence, string headword)
        {
            var target = headword.Trim().ToLowerInvariant();

            // Birden fazla kelimeli ifade ("ice cream"): cümlede aynen geçmeli
            if (target.Contains(' '))
                return sentence.ToLowerInvariant().Contains(target);

            return Words(sentence).Any(w => Lemmatizer.Candidates(w).Contains(target));
        }
    }
}