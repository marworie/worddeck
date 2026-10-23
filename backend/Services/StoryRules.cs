using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Hikaye metni işlemleri: Gutenberg temizliği, sayfalara bölme, seviye tahmini
    public static class StoryRules
    {
        public const int MaxPages = 50;
        public static readonly string[] Levels = { "A1", "A2", "B1", "B2", "C1" };

        // Düşük seviyede sayfalar daha kısa
        public static int WordsPerPage(string level) => level switch { "A1" => 100, "A2" => 120, _ => 150 };

        public static int CountWords(string text) =>
            text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;

        // Gutenberg dosyasından hikayeyi keser: başlangıç cümlesinden bitiş metnine kadar
        public static string? Extract(string raw, string start, string? end)
        {
            int from = raw.IndexOf("*** START OF", StringComparison.OrdinalIgnoreCase);
            int s = raw.IndexOf(start, Math.Max(from, 0), StringComparison.Ordinal);
            if (s < 0) return null;

            int e = end != null
                ? raw.IndexOf(end, s + start.Length, StringComparison.Ordinal)
                : raw.IndexOf("*** END OF", s, StringComparison.OrdinalIgnoreCase);
            if (end != null && e < 0) return null;
            if (e < 0) e = raw.Length;

            return raw[s..e];
        }

        public static string? ExtractByTitle(string raw, string title, string? nextTitle)
        {
            var lines = raw.Replace("\r\n", "\n").Split('\n'); //kitabin tamamini satırlara böl

            for (int i = 0; i < lines.Length; i++) // satir satir gez
            {
                // "The Red Shoes" başlığı İLK OLARAK içindekiler listesinde bulunuyor (dosyanın başında).
                // Hikayenin asıl başlığı ise çok aşağıda, ona henüz gelmedik.
                if (!SameHeading(lines[i], title)) continue; // aradigimiz satir baslik degilse gec

                int end = lines.Length; // hikayenin nerede bittigini bul varsayilan dosyanin sonu
                for (int j = i + 1; j < lines.Length; j++)
                    // İki şeyden biri bitiş sayılır:
                    //   1) Gutenberg'in kitap sonu satırı "*** END OF ..."
                    //   2) Bir sonraki hikayenin başlığı (nextTitle)
                    // Red Shoes kitaptaki SON hikaye olduğu için nextTitle = null.
                    // Yani tek bitiş "*** END OF" satırı, o da kitabın en sonunda.
                    if (lines[j].StartsWith("*** END OF", StringComparison.OrdinalIgnoreCase)
                        || (nextTitle != null && SameHeading(lines[j], nextTitle)))
                    {
                        end = j;
                        break;
                    }

                // Başlıktan sonraki satırdan bitişe kadar olan metni al.
                // Red Shoes'ta: içindekiler listesindeki başlıktan kitabın sonuna kadar,
                // yani BÜTÜN KİTAP alınıyor.
                var text = string.Join("\n", lines[(i + 1)..end]);

                // "Arada en az 100 kelime varsa burası içindekiler değil, gerçek hikayedir" varsayımı.
                // Diğer hikayelerde işe yarıyor: listede bir alt satırda nextTitle var,
                // arada metin kalmıyor, bu yer atlanıyor.
                // AMA Red Shoes'ta arada bütün kitap var (binlerce kelime), kontrol geçiyor
                // ve yanlış metin döndürülüyor. Asıl başlığa hiç ulaşılmıyor.
                // SORUN BURADA: 474 sayfa böyle çıkıyor.
                if (CountWords(text) >= 100) return text;

                // 100 kelimeden azsa burası içindekiler listesiydi,
                // döngü devam edip başlığın bir sonraki geçtiği yere bakar.
            }

            // Başlık hiç bulunamadı
            return null;
        }

   

        // "THE SELFISH GIANT." ile "The Selfish Giant" aynı başlık
        private static bool SameHeading(string line, string title) => HeadingKey(line) == HeadingKey(title);

        private static string HeadingKey(string s) =>
            Regex.Replace(s.Replace('’', '\'').Trim().TrimEnd('.').ToUpperInvariant(), @"\s+", " ");

        // Gutenberg satırları ~70 karakterde kırar; paragraflar boş satırla ayrılır.
        // Satırları birleştirir, _italik_ işaretlerini siler.
        public static string Clean(string raw)
        {
            var paragraphs = Regex.Split(raw.Replace("\r\n", "\n"), @"\n\s*\n")
                .Select(p => Regex.Replace(p, @"\s*\n\s*", " ").Replace("_", "").Trim())
                .Where(p => p.Length > 0);
            return string.Join("\n\n", paragraphs);
        }

        // Paragrafları bozmadan sayfalara böler; sayfadan uzun paragraf cümlelerden bölünür
        public static List<string> Paginate(string body, int wordsPerPage)
        {
            var pages = new List<string>();
            var current = new List<string>();
            int count = 0;

            foreach (var para in body.Split("\n\n", StringSplitOptions.RemoveEmptyEntries))
            {
                foreach (var piece in SplitLong(para, wordsPerPage))
                {
                    int n = CountWords(piece);
                    if (count > 0 && count + n > wordsPerPage)
                    {
                        pages.Add(string.Join("\n\n", current));
                        current.Clear();
                        count = 0;
                    }
                    current.Add(piece);
                    count += n;
                }
            }

            if (current.Count > 0) pages.Add(string.Join("\n\n", current));
            return pages;
        }

        private static IEnumerable<string> SplitLong(string para, int max)
        {
            if (CountWords(para) <= max) { yield return para; yield break; }

            var buffer = new List<string>();
            int count = 0;
            foreach (var sentence in Regex.Split(para, @"(?<=[.!?][""”’]?)\s+"))
            {
                int n = CountWords(sentence);
                if (count > 0 && count + n > max)
                {
                    yield return string.Join(" ", buffer);
                    buffer.Clear();
                    count = 0;
                }
                buffer.Add(sentence);
                count += n;
            }
            if (buffer.Count > 0) yield return string.Join(" ", buffer);
        }

        // Hikayedeki farklı kelimelerin %90'ı hangi seviyede ya da altındaysa hikaye o seviyededir
        public static string EstimateLevel(IEnumerable<string> wordLevels)
        {
            var ranks = wordLevels
                .Select(l => Array.IndexOf(Levels, l))
                .Where(r => r >= 0)
                .OrderBy(r => r)
                .ToList();

            if (ranks.Count == 0) return "A1";
            int index = (int)Math.Ceiling(ranks.Count * 0.9) - 1;
            return Levels[ranks[index]];
        }
    }
}