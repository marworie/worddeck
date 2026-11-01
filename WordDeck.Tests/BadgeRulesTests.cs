using WordDeck.Services;

namespace WordDeck.Tests
{
    public class BadgeRulesTests
    {
        [Fact]
        public void NewUser_HasNoBadges()
        {
            var badges = BadgeRules.Evaluate(new BadgeStats());
            Assert.DoesNotContain(badges, b => b.Earned);
        }

        [Fact]
        public void EarnsBadge_WhenTargetReached()
        {
            var badges = BadgeRules.Evaluate(new BadgeStats { StreakDays = 7 });

            Assert.True(badges.Single(b => b.Id == "streak-3").Earned);
            Assert.True(badges.Single(b => b.Id == "streak-7").Earned);
            Assert.False(badges.Single(b => b.Id == "streak-30").Earned);
        }

        [Fact]
        public void Progress_IsCappedAtTarget()
        {
            var badge = BadgeRules.Evaluate(new BadgeStats { LearnedWords = 250 }).Single(b => b.Id == "words-100");
            Assert.Equal(100, badge.Current);   // ilerleme çubuğu %100'ü geçmesin
        }

        [Fact]
        public void BadgeIds_AreUnique()
        {
            var ids = BadgeRules.Evaluate(new BadgeStats()).Select(b => b.Id).ToList();
            Assert.Equal(ids.Count, ids.Distinct().Count());
        }

        private static readonly DateTime Today = new(2026, 11, 1);

        [Fact]
        public void Streak_CountsConsecutiveDays()
        {
            var dates = new[] { Today, Today.AddDays(-1), Today.AddDays(-2), Today.AddDays(-5) };
            Assert.Equal(3, BadgeRules.Streak(dates, Today));
        }

        [Fact]
        public void Streak_StillAlive_IfNotStudiedToday()
        {
            // Bugün henüz çalışmadın ama dün çalıştın: seri bozulmadı
            var dates = new[] { Today.AddDays(-1), Today.AddDays(-2) };
            Assert.Equal(2, BadgeRules.Streak(dates, Today));
        }

        [Fact]
        public void Streak_Broken_ReturnsZero()
        {
            Assert.Equal(0, BadgeRules.Streak(new[] { Today.AddDays(-3) }, Today));
            Assert.Equal(0, BadgeRules.Streak(Array.Empty<DateTime>(), Today));
        }
    }
}