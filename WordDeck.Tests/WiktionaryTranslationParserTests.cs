using WordDeck.Services;

namespace WordDeck.Tests
{
    public class WiktionaryTranslationParserTests
    {
        private const string Delicious = @"
===Adjective===
'''delicious'''
====Translations====
{{trans-top|pleasing to taste}}
* Russian: {{t+|ru|вкусный}}
* Turkish: {{t+|tr|lezzetli}}, {{t+|tr|tatlı}}, {{t+|tr|leziz}}, {{t+|tr|enfes}}
{{trans-bottom}}";

        private const string Brush = @"
===Noun===
====Translations====
* Turkish: {{t+|tr|fırça}}
===Verb===
====Translations====
* Turkish: {{t+|tr|fırçalamak}}, {{t|tr|taramak}}";

        [Fact]
        public void FindTurkish_TakesFirstThreeTerms()
        {
            Assert.Equal("lezzetli, tatlı, leziz", WiktionaryTranslationParser.FindTurkish(Delicious, "adjective"));
        }

        [Theory]
        [InlineData("noun", "fırça")]
        [InlineData("verb", "fırçalamak, taramak")]
        public void FindTurkish_PrefersMatchingPartOfSpeech(string pos, string expected)
        {
            Assert.Equal(expected, WiktionaryTranslationParser.FindTurkish(Brush, pos));
        }

        [Fact]
        public void FindTurkish_NoTurkishLine_ReturnsNull()
        {
            Assert.Null(WiktionaryTranslationParser.FindTurkish("===Noun===\n* Russian: {{t|ru|слово}}", "noun"));
        }
    }
}