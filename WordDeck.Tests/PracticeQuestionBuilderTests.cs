using WordDeck.Services;

namespace WordDeck.Tests
{
    public class PracticeQuestionBuilderTests
    {
        [Fact]
        public void Cloze_KelimeyiBoslukYapar()
        {
            var result = PracticeQuestionBuilder.MakeCloze("I just got back from my morning run.", "run");

            Assert.Equal("I just got back from my morning _____.", result);
        }

        [Fact]
        public void Cloze_CekimliHaliDeYakalar()
        {
            var result = PracticeQuestionBuilder.MakeCloze("She runs every morning.", "run");

            Assert.Equal("She _____ every morning.", result);
        }

        [Fact]
        public void Cloze_KelimeninIcindeGecenBaskaKelimeyiYakalamaz()
        {
            // "brunch" içinde "run" geçiyor ama ayrı bir kelime değil
            var result = PracticeQuestionBuilder.MakeCloze("We had brunch together.", "run");

            Assert.Null(result);
        }

        [Fact]
        public void Cloze_OrnekYoksa_Null()
        {
            Assert.Null(PracticeQuestionBuilder.MakeCloze(null, "run"));
        }

        [Theory]
        [InlineData(HardState.Hard, 0, true, "choice")]
        [InlineData(HardState.Hard, 1, true, "cloze")]
        [InlineData(HardState.Hard, 1, false, "listening")]   // örnek cümle yoksa dinlemeye geç
        [InlineData(HardState.Hard, 2, true, "typing")]
        [InlineData(HardState.Strengthening, 0, true, "listening")]
        [InlineData(HardState.Strengthening, 1, true, "speaking")]
        [InlineData(HardState.Mastered, 0, true, "typing")]
        public void SoruTipi_DurumaVeSeriyeGore(HardState state, int streak, bool hasCloze, string expected)
        {
            Assert.Equal(expected, PracticeQuestionBuilder.PickType(state, streak, hasCloze));
        }

        [Fact]
        public void RastgeleTip_OrnekYoksa_AsalBoslukDoldurmaGelmez()
        {
            var rng = new Random(42);   // sabit tohum: test her seferinde aynı sırayla çalışsın

            for (int i = 0; i < 200; i++)
            {
                string type = PracticeQuestionBuilder.PickRandomType(hasCloze: false, rng);
                Assert.NotEqual(QuestionTypes.Cloze, type);
                Assert.Contains(type, QuestionTypes.All);
            }
        }

    }
}