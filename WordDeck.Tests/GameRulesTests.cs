using WordDeck.Services;

namespace WordDeck.Tests
{
    public class GameRulesTests
    {
        [Theory]
        [InlineData("bırakmak, terk etmek", "bırakmak")]
        [InlineData("(bir yeri) terk etmek; bırakmak", "terk etmek")]
        [InlineData("kuzu", "kuzu")]
        [InlineData("", "")]
        public void ShortMeaning_TakesFirstMeaning(string input, string expected)
        {
            Assert.Equal(expected, GameRules.ShortMeaning(input));
        }

        [Fact]
        public void ShortMeaning_CutsLongText()
        {
            var result = GameRules.ShortMeaning(new string('a', 50));
            Assert.True(result.Length <= GameRules.MaxMeaningLength + 1);
            Assert.EndsWith("…", result);
        }

        [Fact]
        public void PickPairs_SkipsSameMeaning()
        {
            var words = new[]
            {
                new GameWordDto { WordId = 1, Headword = "big", Meaning = "büyük" },
                new GameWordDto { WordId = 2, Headword = "large", Meaning = "Büyük, geniş" },   // aynı anlam → atlanır
                new GameWordDto { WordId = 3, Headword = "small", Meaning = "küçük" }
            };

            var pairs = GameRules.PickPairs(words, 5);

            Assert.Equal(new[] { 1, 3 }, pairs.Select(p => p.WordId));
        }

        [Fact]
        public void PickPairs_StopsAtCount()
        {
            var words = Enumerable.Range(1, 10)
                .Select(i => new GameWordDto { WordId = i, Headword = $"w{i}", Meaning = $"m{i}" });
            Assert.Equal(4, GameRules.PickPairs(words, 4).Count);
        }

        [Fact]
        public void DailyPick_SameDaySameWord()
        {
            var items = Enumerable.Range(1, 100).ToList();
            var day = new DateOnly(2026, 11, 3);
            Assert.Equal(GameRules.DailyPick(items, day), GameRules.DailyPick(items, day));
        }

        [Fact]
        public void DailyPick_ChangesAcrossDays()
        {
            var items = Enumerable.Range(1, 100).ToList();
            var start = new DateOnly(2026, 11, 1);
            var picks = Enumerable.Range(0, 30).Select(d => GameRules.DailyPick(items, start.AddDays(d))).Distinct().Count();
            Assert.True(picks >= 20);   // bir ayda kelimeler çok az tekrar etsin
        }

        [Theory]
        [InlineData("apple", "egg", null)]
        [InlineData("apple", "dog", "'E' harfiyle başlamalı")]
        [InlineData("banana", "apple", "Bu kelime zaten kullanıldı")]   // "a" ile bitiyor, apple listede var
        [InlineData("apple", "e-mail", "Sadece İngilizce harf kullan")]
        [InlineData(null, "cat", null)]
        public void ChainError_ChecksRules(string? prev, string word, string? expected)
        {
            Assert.Equal(expected, GameRules.ChainError(prev, word, new[] { "apple" }));
        }
    }
}