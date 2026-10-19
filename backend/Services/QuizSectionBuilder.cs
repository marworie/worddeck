using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Sınav bölümleri (bu sırayla gelir)
    public static class QuizSections
    {
        public const string Reading = "reading";
        public const string Listening = "listening";
        public const string Writing = "writing";
        public const string Speaking = "speaking";

        public static readonly string[] All = { Reading, Listening, Writing, Speaking };
    }

    // Bir kelime için hazırlanan sınav sorusu.
    // Audio: seslendirilecek metin (dinleme), Hint: yazmada gösterilecek temiz Türkçe ipucu
    public record QuizQuestion(string Section, string QuestionType, string? ChoiceType, string? Prompt,
                               List<ChoiceOption>? Options, string? Audio, string? Hint);

    // Sınavı okuma / dinleme / yazma / konuşma bölümlerine göre kurar. Veritabanına dokunmaz.
    public static class QuizSectionBuilder
    {
        // 10 soru → okuma 3, dinleme 3, yazma 2, konuşma 2; bölüm sırasına göre dizilir
        public static List<string> AssignSections(int count) =>
            Enumerable.Range(0, count)
                .Select(i => QuizSections.All[i % QuizSections.All.Length])
                .OrderBy(s => Array.IndexOf(QuizSections.All, s))
                .ToList();

        // Ekranda gösterilebilecek temiz Türkçe anlam: kısa, bozuk değil, cevabı ele vermiyor
        public static string? CleanMeaning(WordInfo w) =>
            ChoiceQuestionBuilder.ShortMeaning(w.TurkishMeaning) is string m && !ChoiceQuestionBuilder.LooksAlike(m, w.Headword)
                ? m : null;

        // İstenen bölümde soru kurulamazsa sırayla diğer bölümleri dener; hiçbiri olmazsa null
        public static QuizQuestion? BuildWithFallback(string section, WordInfo w, List<WordInfo> pool, Random? rng = null)
        {
            rng ??= Random.Shared;
            foreach (var s in QuizSections.All.OrderBy(s => s == section ? 0 : 1))
            {
                var q = Build(s, w, pool, rng);
                if (q != null) return q;
            }
            return null;
        }

        public static QuizQuestion? Build(string section, WordInfo w, List<WordInfo> pool, Random rng) => section switch
        {
            QuizSections.Reading => Reading(w, pool, rng),
            QuizSections.Listening => Listening(w, pool, rng),
            QuizSections.Writing => Writing(w),
            QuizSections.Speaking => Speaking(w),
            _ => null
        };

        // Okuma: seviye testindeki çoktan seçmeli sorular
        private static QuizQuestion? Reading(WordInfo w, List<WordInfo> pool, Random rng)
        {
            var q = ChoiceQuestionBuilder.Build(w, pool, rng);
            return q == null ? null
                : new QuizQuestion(QuizSections.Reading, QuestionTypes.Choice, q.Type, q.Prompt, q.Options, null, null);
        }

        // Dinleme: örnek cümle (yoksa kelime) seslendirilir, duyulan kelime 4 şıktan seçilir
        private static QuizQuestion? Listening(WordInfo w, List<WordInfo> pool, Random rng)
        {
            bool useSentence = ChoiceQuestionBuilder.GoodCloze(w.Example, w.Headword) != null;
            string audio = useSentence ? w.Example! : w.Headword;

            // Cümlede geçen bir kelime şık olmasın: o da "duyulmuş" olur
            var usablePool = pool.Where(p =>
                !Regex.IsMatch(audio, $@"\b{Regex.Escape(p.Headword)}\b", RegexOptions.IgnoreCase));

            var distractors = ChoiceQuestionBuilder.PickDistractors(w, ChoiceTypes.TrToEn, usablePool, 3, rng);
            if (distractors.Count < 3) return null;

            var options = distractors.Append(w)
                .OrderBy(_ => rng.Next())
                .Select(d => new ChoiceOption(d.WordId, d.Headword))
                .ToList();

            return new QuizQuestion(QuizSections.Listening, QuestionTypes.Choice, ChoiceTypes.Listen, null, options, audio, null);
        }

        // Yazma: önce boşluklu cümle (bağlamda üretme), yoksa temiz Türkçe anlamdan
        private static QuizQuestion? Writing(WordInfo w)
        {
            string? meaning = CleanMeaning(w);
            string? cloze = ChoiceQuestionBuilder.GoodCloze(w.Example, w.Headword);

            if (cloze != null)
                return new QuizQuestion(QuizSections.Writing, QuestionTypes.Cloze, null, cloze, null, null, meaning);
            if (meaning != null)
                return new QuizQuestion(QuizSections.Writing, QuestionTypes.Typing, null, meaning, null, null, null);
            return null;
        }

        // Konuşma: temiz Türkçe anlam verilir, kelime söylenir; anlam yoksa boşluklu cümle
        private static QuizQuestion? Speaking(WordInfo w)
        {
            string? prompt = CleanMeaning(w) ?? ChoiceQuestionBuilder.GoodCloze(w.Example, w.Headword);
            return prompt == null ? null
                : new QuizQuestion(QuizSections.Speaking, QuestionTypes.Speaking, null, prompt, null, null, null);
        }
    }
}