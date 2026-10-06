using WordDeck.Services;

namespace WordDeck.Tests
{
    public class HardWordRulesTests
    {
        private static readonly DateTime Today = new(2026, 10, 6);

        private static HardProgress Hard(int streak = 0) => new(HardState.Hard, streak, Today, null);

        [Fact]
        public void Bilinemeyen_Zora_Duser_SeriSifir()
        {
            var p = HardWordRules.MarkUnknown(Today);

            Assert.Equal(HardState.Hard, p.State);
            Assert.Equal(0, p.Streak);
            Assert.Equal(Today, p.StateSince);
        }

        [Fact]
        public void Zor_IkiDogru_HalaZor()
        {
            var p = HardWordRules.Answer(Hard(1), correct: true, Today);

            Assert.Equal(HardState.Hard, p.State);
            Assert.Equal(2, p.Streak);
        }

        [Fact]
        public void Zor_UcuncuDogru_Gucleniyora_Gecer()
        {
            var p = HardWordRules.Answer(Hard(2), correct: true, Today);

            Assert.Equal(HardState.Strengthening, p.State);
            Assert.Equal(0, p.Streak);          // yeni durumda seri baştan
            Assert.Equal(Today, p.StateSince);
        }

        [Fact]
        public void Gucleniyor_AyniGunDogru_Sayilmaz()
        {
            var start = new HardProgress(HardState.Strengthening, 0, Today, null);

            var p = HardWordRules.Answer(start, correct: true, Today);

            Assert.Equal(HardState.Strengthening, p.State);
            Assert.Equal(0, p.Streak);
        }

        [Fact]
        public void Gucleniyor_ErtesiGunUcDogru_Ustalasir()
        {
            var p = new HardProgress(HardState.Strengthening, 0, Today, null);
            var tomorrow = Today.AddDays(1);

            p = HardWordRules.Answer(p, true, tomorrow);
            p = HardWordRules.Answer(p, true, tomorrow);
            p = HardWordRules.Answer(p, true, tomorrow);

            Assert.Equal(HardState.Mastered, p.State);
            Assert.Equal(tomorrow.AddDays(14), p.NextCheck);
        }

        [Theory]
        [InlineData(HardState.Hard)]
        [InlineData(HardState.Strengthening)]
        [InlineData(HardState.Mastered)]
        public void HerDurumda_Yanlis_ZoraDondurur(HardState state)
        {
            var start = new HardProgress(state, 2, Today.AddDays(-5), null);

            var p = HardWordRules.Answer(start, correct: false, Today);

            Assert.Equal(HardState.Hard, p.State);
            Assert.Equal(0, p.Streak);
        }

        [Fact]
        public void Ustalasilmis_KontroluGecer_14GunSonraTekrar()
        {
            var start = new HardProgress(HardState.Mastered, 0, Today.AddDays(-14), Today);

            var p = HardWordRules.Answer(start, correct: true, Today);

            Assert.Equal(HardState.Mastered, p.State);
            Assert.Equal(Today.AddDays(14), p.NextCheck);
        }
    }
}