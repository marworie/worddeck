using WordDeck.Services;

namespace WordDeck.Tests
{
    public class LeitnerAndStreakTests
    {
        private static readonly DateTime Today = new(2026, 10, 5);

        // ============ Leitner ============

        [Fact]
        public void YeniKelime_Biliyorum_Kutu2_IkiGunSonra()
        {
            var (box, next) = LeitnerService.Next(null, known: true, Today);

            Assert.Equal(2, box);
            Assert.Equal(Today.AddDays(2), next);
        }

        [Fact]
        public void YeniKelime_Bilmiyorum_Kutu1_YarinTekrar()
        {
            var (box, next) = LeitnerService.Next(null, known: false, Today);

            Assert.Equal(1, box);
            Assert.Equal(Today.AddDays(1), next);
        }

        [Theory]
        [InlineData(1, 2, 2)]
        [InlineData(2, 3, 4)]
        [InlineData(3, 4, 8)]
        [InlineData(4, 5, 16)]
        [InlineData(5, 6, 60)]   // 5. kutuyu da bilirse öğrenildi
        public void Biliyorum_BirUstKutuyaCikar(int current, int expectedBox, int expectedDays)
        {
            var (box, next) = LeitnerService.Next(current, known: true, Today);

            Assert.Equal(expectedBox, box);
            Assert.Equal(Today.AddDays(expectedDays), next);
        }

        [Theory]
        [InlineData(2)]
        [InlineData(5)]
        [InlineData(6)]   // öğrenilmiş kelimeyi unutursa da başa döner
        public void Bilmiyorum_HerZamanKutu1eDoner(int current)
        {
            var (box, _) = LeitnerService.Next(current, known: false, Today);

            Assert.Equal(1, box);
        }

        [Fact]
        public void OgrenilmisKelime_Biliyorum_6daKalir()
        {
            var (box, _) = LeitnerService.Next(6, known: true, Today);

            Assert.Equal(6, box);
        }

        // ============ Streak ============

        [Fact]
        public void HicCalismamis_Seri0()
        {
            Assert.Equal(0, StreakCalculator.Calculate(Array.Empty<DateTime>(), Today));
        }

        [Fact]
        public void UcGunAralıksız_BugunDahil_Seri3()
        {
            var dates = new[] { Today, Today.AddDays(-1), Today.AddDays(-2) };

            Assert.Equal(3, StreakCalculator.Calculate(dates, Today));
        }

        [Fact]
        public void BugunHenuzCalismamis_DundenSayar()
        {
            var dates = new[] { Today.AddDays(-1), Today.AddDays(-2) };

            Assert.Equal(2, StreakCalculator.Calculate(dates, Today));
        }

        [Fact]
        public void AradaBosGunVar_SeriKirilir()
        {
            var dates = new[] { Today, Today.AddDays(-2), Today.AddDays(-3) };

            Assert.Equal(1, StreakCalculator.Calculate(dates, Today));
        }
    }
}