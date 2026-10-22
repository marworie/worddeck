using WordDeck.Services;

namespace WordDeck.Tests
{
    public class StoryRulesTests
    {
        [Fact]
        public void Clean_JoinsWrappedLines_KeepsParagraphs()
        {
            var raw = "One dollar and\neighty-seven cents.\n\nThat was _all_.";
            Assert.Equal("One dollar and eighty-seven cents.\n\nThat was all.", StoryRules.Clean(raw));
        }

        [Fact]
        public void Extract_TakesTextBetweenMarkers()
        {
            var raw = "header *** START OF BOOK *** Title. Once upon a time. The end. NEXT STORY";
            Assert.Equal("Once upon a time. The end. ", StoryRules.Extract(raw, "Once upon", "NEXT STORY"));
        }

        [Fact]
        public void Extract_MissingStart_ReturnsNull()
        {
            Assert.Null(StoryRules.Extract("*** START OF *** text", "not here", null));
        }

        [Fact]
        public void Paginate_RespectsWordLimit()
        {
            var body = string.Join("\n\n", Enumerable.Repeat("one two three four five", 10));   // 50 kelime
            var pages = StoryRules.Paginate(body, 20);

            Assert.Equal(3, pages.Count);
            Assert.All(pages, p => Assert.True(StoryRules.CountWords(p) <= 20));
        }

        [Fact]
        public void Paginate_SplitsLongParagraphBySentence()
        {
            var body = string.Join(" ", Enumerable.Repeat("This is a sentence.", 10));   // 40 kelime, tek paragraf
            var pages = StoryRules.Paginate(body, 12);

            Assert.True(pages.Count >= 4);
            Assert.All(pages, p => Assert.EndsWith(".", p));
        }

        [Fact]
        public void EstimateLevel_Uses90thPercentile()
        {
            var levels = Enumerable.Repeat("A1", 9).Append("C1");   // %90 A1
            Assert.Equal("A1", StoryRules.EstimateLevel(levels));

            var harder = Enumerable.Repeat("A1", 8).Concat(new[] { "B1", "C1" });
            Assert.Equal("B1", StoryRules.EstimateLevel(harder));
        }

        [Fact]
        public void ExtractByTitle_SkipsTableOfContents()
        {
            var body = string.Join(" ", Enumerable.Repeat("word", 120));
            var raw = "CONTENTS\n\nThe Giant\nThe Friend\n\n\nTHE GIANT.\n\n" + body + "\n\nThe Friend.\n\nother story";

            var result = StoryRules.ExtractByTitle(raw, "The Giant", "The Friend");

            Assert.NotNull(result);
            Assert.Contains(body, result);
            Assert.DoesNotContain("other story", result);
        }
    }
}