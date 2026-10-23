using WordDeck.Services;

namespace WordDeck.Tests
{
    public class SentenceRulesTests
    {
        [Theory]
        [InlineData("She went home early.", "go")]
        [InlineData("I am running in the park.", "run")]
        [InlineData("My children love cats.", "child")]
        [InlineData("We ate ice cream yesterday.", "ice cream")]
        public void UsesWord_AcceptsInflectedForms(string sentence, string headword)
        {
            Assert.True(SentenceRules.UsesWord(sentence, headword));
        }

        [Fact]
        public void UsesWord_MissingWord_IsFalse()
        {
            Assert.False(SentenceRules.UsesWord("He likes cats very much.", "dog"));
        }

        [Fact]
        public void Words_CountsOnlyWords()
        {
            Assert.Equal(4, SentenceRules.Words("I don't like it!").Count);
        }
    }
}