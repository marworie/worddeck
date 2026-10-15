using WordDeck.Services;

namespace WordDeck.Tests
{
    public class WordFamilyParserTests
    {
        // Gerçek bir Wiktionary sayfasının sadeleştirilmiş hali
        private const string SamplePage = @"
==English==
===Verb===
{{en-verb}}
====Derived terms====
{{col|en|decidable|decided|undecided}}
====Related terms====
* {{l|en|decision}}
* {{l|en|decisive}}
===Anagrams===
* {{l|en|deiced}}
==French==
====Derived terms====
{{col|fr|décidé}}
";

        [Fact]
        public void TuretilmisVeIliskiliTerimleriBulur()
        {
            var family = WordFamilyParser.Parse(SamplePage, "decide");

            Assert.Equal(new[] { "decidable", "decided", "undecided", "decision", "decisive" }, family);
        }

        [Fact]
        public void DigerBolumleriVeDilleriAlmaz()
        {
            var family = WordFamilyParser.Parse(SamplePage, "decide");

            Assert.DoesNotContain("deiced", family);   // Anagrams bölümü
            Assert.DoesNotContain("décidé", family);   // Fransızca bölüm
        }

        [Fact]
        public void SablonAyarlariniVeNitelemeleriTemizler()
        {
            const string page = @"
==English==
====Derived terms====
{{col3|en|title=Terms|decidability<q:rare>|[[indecision]]|make a decision}}
";
            var family = WordFamilyParser.Parse(page, "decide");

            // title=... ayar, "make a decision" çok kelimeli: ikisi de alınmaz
            Assert.Equal(new[] { "decidability", "indecision" }, family);
        }

        [Fact]
        public void IngilizceBolumYoksa_BosListe()
        {
            Assert.Empty(WordFamilyParser.Parse("==French==\n{{col|fr|mot}}", "word"));
        }
    }
}