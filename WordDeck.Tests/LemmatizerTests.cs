using WordDeck.Services;

namespace WordDeck.Tests
{
    public class LemmatizerTests
    {
        [Theory]
        [InlineData("went", "go")]
        [InlineData("children", "child")]
        [InlineData("better", "good")]
        [InlineData("was", "be")]
        public void Candidates_Irregular_ComesFirst(string word, string expected)
        {
            Assert.Equal(expected, Lemmatizer.Candidates(word)[0]);
        }

        [Theory]
        [InlineData("running", "run")]
        [InlineData("stopped", "stop")]
        [InlineData("studies", "study")]
        [InlineData("goes", "go")]
        [InlineData("happier", "happy")]
        [InlineData("bigger", "big")]
        [InlineData("died", "die")]
        public void Candidates_Regular_ContainsBase(string word, string expected)
        {
            Assert.Contains(expected, Lemmatizer.Candidates(word));
        }

        [Fact]
        public void Candidates_PrefersE_ForShortStems()
        {
            var c = Lemmatizer.Candidates("using");
            Assert.True(c.IndexOf("use") < c.IndexOf("us"));   // using → use, us değil
        }

        [Fact]
        public void Candidates_KeepsDoubleLetter_WhenWordHasIt()
        {
            var c = Lemmatizer.Candidates("added");
            Assert.True(c.IndexOf("add") < c.IndexOf("ad"));
        }

        [Fact]
        public void Candidates_OriginalWordIsIncluded()
        {
            Assert.Contains("water", Lemmatizer.Candidates("water"));   // "-er" ile bitiyor ama kendisi bir kelime
        }

        [Theory]
        [InlineData("Doesn't", "does")]
        [InlineData("John's,", "john")]
        [InlineData("“Hello!”", "hello")]
        [InlineData("can't", "can")]
        [InlineData("42", "")]
        public void Normalize_CleansWord(string raw, string expected)
        {
            Assert.Equal(expected, Lemmatizer.Normalize(raw));
        }
    }
}