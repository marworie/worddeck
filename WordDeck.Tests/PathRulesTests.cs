using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Tests
{
    public class PathRulesTests
    {
        private static IEnumerable<PathWordRow> Theme(int themeId, int count) =>
            Enumerable.Range(1, count).Select(i => new PathWordRow
            {
                ThemeId = themeId, ThemeName = $"t{themeId}", Icon = "x", WordId = themeId * 1000 + i
            });

        [Fact]
        public void BuildUnits_SplitsLargeThemeEvenly()
        {
            var units = PathRules.BuildUnits(Theme(1, 20));

            Assert.Equal(2, units.Count);
            Assert.All(units, u => Assert.Equal(10, u.WordIds.Count));
            Assert.Equal(new[] { 1, 2 }, units.Select(u => u.Part));
        }

        [Fact]
        public void BuildUnits_SkipsSmallThemes()
        {
            var units = PathRules.BuildUnits(Theme(1, 3).Concat(Theme(2, 8)));

            Assert.Single(units);
            Assert.Equal(2, units[0].ThemeId);
        }

        [Fact]
        public void Statuses_UnlocksOneByOne()
        {
            var units = PathRules.BuildUnits(Theme(1, 6).Concat(Theme(2, 6)).Concat(Theme(3, 6)));

            Assert.Equal(new[] { "current", "locked", "locked" },
                PathRules.Statuses(units, new HashSet<(int, int)>()));

            Assert.Equal(new[] { "completed", "current", "locked" },
                PathRules.Statuses(units, new HashSet<(int, int)> { (1, 1) }));
        }

        [Theory]
        [InlineData(8, 10, true)]
        [InlineData(7, 10, false)]
        [InlineData(12, 15, true)]
        public void Passed_Needs80Percent(int correct, int total, bool expected)
        {
            Assert.Equal(expected, PathRules.Passed(PathRules.Score(correct, total)));
        }
    }
}