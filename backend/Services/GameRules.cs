using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    public class GameWordDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = "";
        public string Meaning { get; set; } = "";
        public string? Level { get; set; } = "";

    }

    // Oyunlar için kelime hazırlama
    public static class GameRules
    {
        public const int MaxMeaningLength = 28;

        // "bırakmak, terk etmek (bir yeri)" → "bırakmak": kartlara sığsın diye ilk anlam
        public static string ShortMeaning(string? meaning)
        {
            if (string.IsNullOrWhiteSpace(meaning)) return "";
            var noParens = Regex.Replace(meaning, @"\([^)]*\)", "");
            var first = noParens.Split(new[] { ',', ';', '/' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(s => s.Trim())
                                .FirstOrDefault(s => s.Length > 0) ?? "";
            return first.Length > MaxMeaningLength ? first[..MaxMeaningLength].TrimEnd() + "…" : first;
        }

        // Eşleştirmede karışıklık olmasın: anlamı ya da kelimesi aynı olan ikinci kelime alınmaz
        public static List<GameWordDto> PickPairs(IEnumerable<GameWordDto> words, int count)
        {
            var meanings = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var heads = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var result = new List<GameWordDto>();

            foreach (var w in words)
            {
                var m = ShortMeaning(w.Meaning);
                if (m.Length == 0 || !meanings.Add(m) || !heads.Add(w.Headword)) continue;
                result.Add(new GameWordDto { WordId = w.WordId, Headword = w.Headword, Meaning = m });
                if (result.Count == count) break;
            }
            return result;
        }

        // Sadece İngilizce küçük harflerden oluşan, istenen uzunlukta kelime mi?
        public static bool IsLetters(string? word, int min, int max) =>
            word != null && word.Length >= min && word.Length <= max && word.All(c => c is >= 'a' and <= 'z');

        // Günün kelimesi: aynı gün herkese aynı kelime, her gün farklı
        public static T DailyPick<T>(IReadOnlyList<T> items, DateOnly day)
        {
            if (items.Count == 0) throw new ArgumentException("Liste boş", nameof(items));
            long hash = day.DayNumber * 2654435761L;   // ardışık günleri listeye dağıtır
            return items[(int)(hash % items.Count)];
        }

        // Kelime zinciri kuralı: hata varsa mesajı, yoksa null döner
        public static string? ChainError(string? prev, string word, IEnumerable<string> used)
        {
            if (!IsLetters(word, 2, 20)) return "Sadece İngilizce harf kullan";
            if (!string.IsNullOrEmpty(prev) && word[0] != prev[^1]) return $"'{char.ToUpper(prev[^1])}' harfiyle başlamalı";
            if (used.Contains(word, StringComparer.OrdinalIgnoreCase)) return "Bu kelime zaten kullanıldı";
            return null;
        }
    }
}