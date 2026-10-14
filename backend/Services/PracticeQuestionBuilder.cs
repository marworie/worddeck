using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Soru tipleri (veritabanında ve frontend'de bu isimlerle)
    public static class QuestionTypes
    {
        public const string Choice = "choice";         // çoktan seçmeli
        public const string Cloze = "cloze";           // boşluk doldurma
        public const string Typing = "typing";         // yazma
        public const string Listening = "listening";   // dinleyip yazma
        public const string Speaking = "speaking";     // söyleme (mikrofon)

        public static readonly string[] All = { Choice, Cloze, Typing, Listening, Speaking };
    }

    // Soru hazırlama kuralları. Veritabanına dokunmaz, kolayca test edilir.
    public static class PracticeQuestionBuilder
    {
        // Kelimenin durumuna ve serisine göre soru tipi: tanımadan üretmeye doğru zorlaşır
        public static string PickType(HardState state, int streak, bool hasCloze) =>
            state switch
            {
                HardState.Hard => streak switch
                {
                    0 => QuestionTypes.Choice,
                    1 => hasCloze ? QuestionTypes.Cloze : QuestionTypes.Listening,
                    _ => QuestionTypes.Typing
                },
                HardState.Strengthening => streak switch
                {
                    0 => QuestionTypes.Listening,
                    1 => QuestionTypes.Speaking,
                    _ => QuestionTypes.Typing
                },
                _ => QuestionTypes.Typing   // ustalaşılmış kelimenin kontrolü: en zoru
            };

        // Örnek cümlede kelimeyi boşlukla değiştirir: "I just got back from my morning _____."
        // Çekimli halleri de yakalar (run → runs, running). Kelime cümlede yoksa null.
        public static string? MakeCloze(string? example, string headword)
        {
            if (string.IsNullOrWhiteSpace(example)) return null;

            // \b: kelime sınırı ("run" içinde geçen "brunch"ı yakalamasın), \w*: ekleri de al
            var regex = new Regex($@"\b{Regex.Escape(headword)}\w*\b", RegexOptions.IgnoreCase);
            if (!regex.IsMatch(example)) return null;

            return regex.Replace(example, "_____", 1);   // sadece ilk geçtiği yeri boşalt
        }

        // Sınav için rastgele soru tipi. Çoktan seçmeli iki kat şanslı: sınav çok zor olmasın.
        // Boşluk doldurma sadece örnek cümle varsa. rng: testte sabit sonuç alabilmek için dışarıdan verilebilir
        public static string PickRandomType(bool hasCloze, Random? rng = null)
        {
            rng ??= Random.Shared;
            var types = new List<string>
            {
                QuestionTypes.Choice, QuestionTypes.Choice,
                QuestionTypes.Typing, QuestionTypes.Listening, QuestionTypes.Speaking
            };
            if (hasCloze) types.Add(QuestionTypes.Cloze);

            return types[rng.Next(types.Count)];
        }
    }
}