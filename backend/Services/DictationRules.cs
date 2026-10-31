using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Dikte: kullanıcının yazdığını doğru cümleyle kelime kelime karşılaştırır
    public record DictationToken(string Word, string Status, string? Typed);   // Status: ok, wrong, missing, extra

    public static class DictationRules
    {
        public const int MinWords = 4;
        public const int MaxWords = 14;

        // Dikteye uygun cümle: çok kısa ya da çok uzun olmasın
        public static bool Suitable(string? sentence)
        {
            if (string.IsNullOrWhiteSpace(sentence)) return false;
            int n = Tokens(sentence).Count;
            return n >= MinWords && n <= MaxWords;
        }

        // Kelimeler (noktalamasıyla birlikte, ekranda gösterilecek hâli)
        public static List<string> Tokens(string text) =>
            text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => Key(t).Length > 0)
                .ToList();

        // Karşılaştırma anahtarı: küçük harf, baştaki/sondaki noktalama yok, ’ → '
        public static string Key(string token) =>
            Regex.Replace(token.Replace('’', '\'').ToLowerInvariant(), @"^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$", "");

        public static List<DictationToken> Compare(string expected, string typed)
        {
            var e = Tokens(expected);
            var t = Tokens(typed ?? "");
            var ek = e.Select(Key).ToArray();
            var tk = t.Select(Key).ToArray();
            int n = ek.Length, m = tk.Length;

            // dp[i,j]: e[i..] ile t[j..] arasındaki en uzun ortak kelime dizisi (LCS)
            var dp = new int[n + 1, m + 1];
            for (int i = n - 1; i >= 0; i--)
                for (int j = m - 1; j >= 0; j--)
                    dp[i, j] = ek[i] == tk[j] ? dp[i + 1, j + 1] + 1 : Math.Max(dp[i + 1, j], dp[i, j + 1]);

            var result = new List<DictationToken>();
            var pendingE = new List<int>();   // eşleşmeyen doğru kelimeler
            var pendingT = new List<int>();   // eşleşmeyen yazılan kelimeler

            // İki doğru kelime arasındaki eşleşmeyenler: karşılıklı olanlar "yanlış", kalanlar eksik/fazla
            void Flush()
            {
                int k = 0;
                for (; k < pendingE.Count && k < pendingT.Count; k++)
                    result.Add(new DictationToken(e[pendingE[k]], "wrong", t[pendingT[k]]));
                for (int x = k; x < pendingE.Count; x++) result.Add(new DictationToken(e[pendingE[x]], "missing", null));
                for (int x = k; x < pendingT.Count; x++) result.Add(new DictationToken(t[pendingT[x]], "extra", null));
                pendingE.Clear();
                pendingT.Clear();
            }

            int a = 0, b = 0;
            while (a < n && b < m)
            {
                if (ek[a] == tk[b]) { Flush(); result.Add(new DictationToken(e[a], "ok", null)); a++; b++; }
                else if (dp[a + 1, b] >= dp[a, b + 1]) pendingE.Add(a++);
                else pendingT.Add(b++);
            }
            while (a < n) pendingE.Add(a++);
            while (b < m) pendingT.Add(b++);
            Flush();

            return result;
        }

        // Puan: doğru cümledeki kelimelerin yüzde kaçı doğru yazıldı (fazla kelimeler puanı düşürmez)
        public static int Score(List<DictationToken> tokens)
        {
            int total = tokens.Count(t => t.Status != "extra");
            return total == 0 ? 0 : (int)Math.Round(100.0 * tokens.Count(t => t.Status == "ok") / total);
        }
    }
}