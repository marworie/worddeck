using WordDeck.Services;

namespace WordDeck.Tests
{
    public class DictationRulesTests
    {
        [Fact]
        public void Compare_IgnoresCaseAndPunctuation()
        {
            var r = DictationRules.Compare("She has a red car.", "she has a red car");
            Assert.All(r, t => Assert.Equal("ok", t.Status));
            Assert.Equal(100, DictationRules.Score(r));
        }

        [Fact]
        public void Compare_MarksMissingAndWrongWords()
        {
            var r = DictationRules.Compare("She has a red car.", "she has red cars");

            Assert.Equal("missing", r.Single(t => t.Word == "a").Status);
            var car = r.Single(t => t.Word == "car.");
            Assert.Equal("wrong", car.Status);
            Assert.Equal("cars", car.Typed);
            Assert.Equal(60, DictationRules.Score(r));   // 5 kelimeden 3'ü doğru
        }

        [Fact]
        public void Compare_ExtraWordsDoNotLowerScore()
        {
            var r = DictationRules.Compare("I like tea.", "I really like tea");
            Assert.Equal("extra", r.Single(t => t.Word == "really").Status);
            Assert.Equal(100, DictationRules.Score(r));
        }

        [Fact]
        public void Compare_EmptyAnswer_AllMissing()
        {
            var r = DictationRules.Compare("I like tea.", "");
            Assert.All(r, t => Assert.Equal("missing", t.Status));
            Assert.Equal(0, DictationRules.Score(r));
        }

        [Fact]
        public void Suitable_ChecksWordCount()
        {
            Assert.False(DictationRules.Suitable("Go now."));
            Assert.True(DictationRules.Suitable("Many baby girls have been abandoned on the streets."));
            Assert.False(DictationRules.Suitable(string.Join(" ", Enumerable.Repeat("word", 20))));
        }
    }
}