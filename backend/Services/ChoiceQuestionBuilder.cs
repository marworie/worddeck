using System.Text.RegularExpressions;

namespace WordDeck.Services
{
    // Çoktan seçmeli soru tipleri
    public static class ChoiceTypes
    {
        public const string Cloze = "cloze";             // cümlede boşluk → İngilizce şıklar
        public const string Definition = "definition";   // İngilizce tanım → İngilizce şıklar
        public const string TrToEn = "tr-en";            // Türkçe anlam → İngilizce şıklar
        public const string EnToTr = "en-tr";            // İngilizce kelime → Türkçe şıklar
    }

    // Soru üretmek için gereken kelime bilgisi
    public record WordInfo(int WordId, string Headword, string PartOfSpeech,
                           string? TurkishMeaning, string? Definition, string? Example);

    public record ChoiceOption(int Id, string Text);
    public record ChoiceQuestion(string Type, string Prompt, List<ChoiceOption> Options, int AnswerId);

    // Kaliteli çoktan seçmeli soru kurar. Veritabanına dokunmaz, kolayca test edilir.
    public static class ChoiceQuestionBuilder
    {
        public const int MaxMeaningLength = 25;
        public const int MaxDefinitionLength = 120;
        public const int MaxExampleLength = 140;

        // Soruya uygun türler: edat, zamir, bağlaçla anlamlı soru olmuyor
        public static readonly string[] ContentPos = { "noun", "verb", "adjective", "adverb" };

        // Tanımda bunlar geçiyorsa nadir/eski anlamdır ya da başka kelimeye yönlendiriyordur
        private static readonly Regex BadDefinition = new(
            @"\b(archaic|obsolete|dated|rare|slang|alternative (form|spelling)|misspelling|plural of|form of|past tense|participle of)\b",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // "kitap, defter" → "kitap". Boş, çok uzun ya da "—" ise null
        public static string? ShortMeaning(string? meaning)
        {
            if (string.IsNullOrWhiteSpace(meaning)) return null;
            string first = meaning.Split(',', ';')[0].Trim();
            return first.Length is > 0 and <= MaxMeaningLength && first != "—" ? first : null;
        }

        // Tanım soruya uygun mu: makul uzunlukta, nadir anlam değil, cevabı içinde ele vermiyor
        public static bool IsGoodDefinition(string? definition, string headword)
        {
            if (string.IsNullOrWhiteSpace(definition)) return false;
            if (definition.Length < 15 || definition.Length > MaxDefinitionLength) return false;
            if (BadDefinition.IsMatch(definition)) return false;
            // "run" sorusunda tanımda "running" geçerse cevap ele verilir
            return !Regex.IsMatch(definition, $@"\b{Regex.Escape(headword)}", RegexOptions.IgnoreCase);
        }

        // Boşluklu cümle: çok uzun değilse ve kelime cümlede geçiyorsa
        public static string? GoodCloze(string? example, string headword)
        {
            if (example == null || example.Length > MaxExampleLength) return null;
            return PracticeQuestionBuilder.MakeCloze(example, headword);
        }

        // Kelimeyle kurulabilecek soru tipleri. Bir tip ne kadar çok eklenirse o kadar sık seçilir:
        // gerçek bilgiyi ölçen boşluk ve tanım soruları öne çıksın
        public static List<string> AvailableTypes(WordInfo w)
        {
            var types = new List<string>();
            if (GoodCloze(w.Example, w.Headword) != null)
                types.AddRange(new[] { ChoiceTypes.Cloze, ChoiceTypes.Cloze, ChoiceTypes.Cloze });
            if (IsGoodDefinition(w.Definition, w.Headword))
                types.AddRange(new[] { ChoiceTypes.Definition, ChoiceTypes.Definition });
            if (ShortMeaning(w.TurkishMeaning) != null)
                types.AddRange(new[] { ChoiceTypes.TrToEn, ChoiceTypes.TrToEn, ChoiceTypes.EnToTr });
            return types;
        }

        // Çeldiriciler: aynı türden, cevaptan farklı; Türkçe şıklıysa anlamı temiz ve cevaptan farklı
        public static List<WordInfo> PickDistractors(WordInfo answer, string type, IEnumerable<WordInfo> pool, int count, Random rng)
        {
            string? answerMeaning = ShortMeaning(answer.TurkishMeaning);
            bool turkishOptions = type == ChoiceTypes.EnToTr;

            return pool
                .Where(p => p.WordId != answer.WordId
                         && p.PartOfSpeech == answer.PartOfSpeech
                         && !p.Headword.Equals(answer.Headword, StringComparison.OrdinalIgnoreCase))
                .Where(p => !turkishOptions ||
                            (ShortMeaning(p.TurkishMeaning) is string m &&
                             !m.Equals(answerMeaning, StringComparison.OrdinalIgnoreCase)))
                // Aynı yazılan iki şık olmasın
                .DistinctBy(p => turkishOptions ? ShortMeaning(p.TurkishMeaning)!.ToLowerInvariant() : p.Headword.ToLowerInvariant())
                .OrderBy(_ => rng.Next())
                .Take(count)
                .ToList();
        }

        // Soruyu kurar. Seçilen tipte yeterli çeldirici yoksa sıradaki tipi dener; hiçbiri olmazsa null
        public static ChoiceQuestion? Build(WordInfo w, IEnumerable<WordInfo> pool, Random? rng = null)
        {
            rng ??= Random.Shared;
            var poolList = pool.ToList();

            // Karıştır, tekrarları at: ağırlığı fazla olan tip öne gelme şansını korur
            foreach (var type in AvailableTypes(w).OrderBy(_ => rng.Next()).Distinct())
            {
                var distractors = PickDistractors(w, type, poolList, 3, rng);
                if (distractors.Count < 3) continue;

                bool turkishOptions = type == ChoiceTypes.EnToTr;
                var options = distractors.Append(w)
                    .OrderBy(_ => rng.Next())
                    .Select(d => new ChoiceOption(d.WordId, turkishOptions ? ShortMeaning(d.TurkishMeaning)! : d.Headword))
                    .ToList();

                string prompt = type switch
                {
                    ChoiceTypes.Cloze => GoodCloze(w.Example, w.Headword)!,
                    ChoiceTypes.Definition => w.Definition!,
                    ChoiceTypes.TrToEn => ShortMeaning(w.TurkishMeaning)!,
                    _ => w.Headword
                };

                return new ChoiceQuestion(type, prompt, options, w.WordId);
            }
            return null;
        }
    }
}