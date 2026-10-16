using WordDeck.Services;

namespace WordDeck.Tests
{
    public class PlacementRulesTests
    {
        [Theory]
        [InlineData("A1", 5, "A2")]   // tam puan → üst seviye
        [InlineData("A1", 4, "A2")]   // sınırda geçme
        [InlineData("B1", 4, "B2")]
        public void Decide_Passed_GoesToNextLevel(string level, int correct, string expected)
        {
            var result = PlacementRules.Decide(level, correct);

            Assert.False(result.Finished);
            Assert.Equal(expected, result.Level);
        }

        [Theory]
        [InlineData("A1", 3)]   // sınırda kalma
        [InlineData("B1", 0)]   // hiç bilmedi
        [InlineData("B2", 2)]
        public void Decide_Failed_FinishesAtSameLevel(string level, int correct)
        {
            var result = PlacementRules.Decide(level, correct);

            Assert.True(result.Finished);
            Assert.Equal(level, result.Level);
        }

        [Fact]
        public void Decide_PassedLastLevel_FinishesAtLastLevel()
        {
            var result = PlacementRules.Decide("C1", 5);

            Assert.True(result.Finished);
            Assert.Equal("C1", result.Level);
        }

        [Fact]
        public void Decide_InvalidLevel_Throws()
        {
            Assert.Throws<ArgumentException>(() => PlacementRules.Decide("X9", 5));
        }
    }
}