using WordDeck.Services;

namespace WordDeck.Tests
{
    public class ChoiceQuestionBuilderTests
    {
        private static WordInfo Word(int id, string headword, string pos = "noun",
            string? tr = null, string? def = null, string? ex = null) =>
            new(id, headword, pos, tr, def, ex);

        [Theory]
        [InlineData("kitap, defter", "kitap")]
        [InlineData("koşmak; kaçmak", "koşmak")]
        [InlineData("—", null)]
        [InlineData("", null)]
        [InlineData("çok çok çok uzun bir çeviri metni burada", null)]
        public void ShortMeaning_TakesFirstCleanPart(string input, string? expected)
        {
            Assert.Equal(expected, ChoiceQuestionBuilder.ShortMeaning(input));
        }

        [Theory]
        [InlineData("A building where people borrow books.", true)]
        [InlineData("Short.", false)]                                  // çok kısa
        [InlineData("(archaic) A place where books are kept.", false)] // eski anlam
        [InlineData("The act of running quickly on foot.", false)]     // cevabı ele veriyor
        public void IsGoodDefinition_FiltersBadDefinitions(string definition, bool expected)
        {
            string headword = definition.Contains("running") ? "run" : "library";
            Assert.Equal(expected, ChoiceQuestionBuilder.IsGoodDefinition(definition, headword));
        }

        [Fact]
        public void AvailableTypes_NoData_ReturnsEmpty()
        {
            Assert.Empty(ChoiceQuestionBuilder.AvailableTypes(Word(1, "cat")));
        }

        [Fact]
        public void PickDistractors_OnlySamePosAndDifferentMeaning()
        {
            var answer = Word(1, "cat", tr: "kedi");
            var pool = new[]
            {
                Word(2, "dog", tr: "köpek"),
                Word(3, "run", pos: "verb", tr: "koşmak"),   // farklı tür
                Word(4, "kitty", tr: "kedi"),                // aynı anlam
                Word(5, "bird", tr: "kuş")
            };

            var result = ChoiceQuestionBuilder.PickDistractors(answer, ChoiceTypes.EnToTr, pool, 3, new Random(1));

            Assert.Equal(new[] { 2, 5 }, result.Select(r => r.WordId).OrderBy(i => i));
        }

        [Fact]
        public void Build_NotEnoughDistractors_ReturnsNull()
        {
            var answer = Word(1, "cat", tr: "kedi");
            var pool = new[] { Word(2, "dog", tr: "köpek") };

            Assert.Null(ChoiceQuestionBuilder.Build(answer, pool, new Random(1)));
        }

        [Fact]
        public void Build_HasFourDistinctOptionsIncludingAnswer()
        {
            var answer = Word(1, "cat", tr: "kedi");
            var pool = new[]
            {
                Word(2, "dog", tr: "köpek"), Word(3, "bird", tr: "kuş"),
                Word(4, "fish", tr: "balık"), Word(5, "horse", tr: "at")
            };

            var q = ChoiceQuestionBuilder.Build(answer, pool, new Random(1))!;

            Assert.Equal(4, q.Options.Count);
            Assert.Equal(4, q.Options.Select(o => o.Id).Distinct().Count());
            Assert.Contains(q.Options, o => o.Id == q.AnswerId);
        }

        [Fact]
        public void Build_ClozeQuestion_HidesWordInSentence()
        {
            var answer = Word(1, "cat", ex: "The cat is sleeping on the sofa.");
            var pool = new[] { Word(2, "dog"), Word(3, "bird"), Word(4, "fish") };

            var q = ChoiceQuestionBuilder.Build(answer, pool, new Random(1))!;

            Assert.Equal(ChoiceTypes.Cloze, q.Type);
            Assert.DoesNotContain("cat", q.Prompt);
            Assert.Contains("_____", q.Prompt);
        }

        [Theory]
        [InlineData("dram", "drama", true)]
        [InlineData("taksi", "taxi", true)]
        [InlineData("kedi", "cat", false)]
        public void LooksAlike_DetectsGiveawayTranslations(string tr, string en, bool expected)
        {
            Assert.Equal(expected, ChoiceQuestionBuilder.LooksAlike(tr, en));
        }

        [Fact]
        public void IsGoodDefinition_RejectsSameStem()
        {
            Assert.False(ChoiceQuestionBuilder.IsGoodDefinition("Pertaining to ideas, or to a given idea.", "ideal"));
        }
    }
}