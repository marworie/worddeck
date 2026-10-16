using System.Net;
using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Otomatik çevirilerin kullanılabilir olup olmadığına karar verir.
    // İnternete çıkmaz, sadece metne bakar: kolayca test edilir.
    public static class TranslationFilter
    {
        // Sadece Latin alfabesi: temel Latin + Batı Avrupa (â, é) + Genişletilmiş-A (ç, ğ, ı, ş...).
        // Hint, Arap, Kiril, Çin vb. alfabelerden tek bir karakter bile varsa geçmez
        private static readonly Regex LatinOnly = new(
            @"^[\p{IsBasicLatin}\p{IsLatin-1Supplement}\p{IsLatinExtended-A}\p{IsGeneralPunctuation}\s]+$",
            RegexOptions.Compiled);

        private static readonly string[] BadParts = { "http", "www.", "://", "&", "<", ">", "{", "}" };
        private static readonly string[] Junk = { "na", "n/a", "-", "..." };

        public static bool IsLatinScript(string text) => LatinOnly.IsMatch(text);

        // Tek kelimenin çevirisi: kısa olmalı; link, kod, HTML ya da başka alfabe içermemeli
        public static bool IsUsableWord(string text, string source)
        {
            text = WebUtility.HtmlDecode(text).Trim();

            if (text.Length < 2 || text.Length > 40) return false;
            if (text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length > 4) return false;
            if (text.Equals(source, StringComparison.OrdinalIgnoreCase)) return false;
            if (BadParts.Any(p => text.Contains(p, StringComparison.OrdinalIgnoreCase))) return false;
            if (!IsLatinScript(text)) return false;

            return !Junk.Contains(text.ToLowerInvariant());
        }

        // Cümle çevirisi (tanım, örnek): boş olmamalı ve başka alfabe içermemeli
        public static bool IsUsableSentence(string? text) =>
            !string.IsNullOrWhiteSpace(text)
            && IsLatinScript(text)
            && !text.Contains("MYMEMORY", StringComparison.OrdinalIgnoreCase);
    }
}