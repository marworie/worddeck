using WordDeck.Services;

namespace WordDeck.Tests
{
    public class TranslationFilterTests
    {
        [Theory]
        [InlineData("koşmak", "run")]
        [InlineData("çalışmak, işletmek", "run")]
        [InlineData("ağaç", "tree")]
        [InlineData("İstanbul", "Istanbul city")]
        public void TurkceCeviriler_Gecer(string text, string source)
        {
            Assert.True(TranslationFilter.IsUsableWord(text, source));
        }

        [Theory]
        [InlineData("आपका अच्छा नाम", "hi")]        // Hintçe
        [InlineData("مرحبا", "hello")]               // Arapça
        [InlineData("привет", "hello")]              // Kiril
        [InlineData("na", "tie")]                    // çöp
        [InlineData("run", "run")]                   // kelimenin kendisi
        [InlineData("see http://edu.kde.org", "else")]   // link
        [InlineData("<g id=\"1\">kravat</g>", "tie")]    // HTML kalıntısı
        [InlineData("bu çok ama çok uzun bir cümle olduğu için kelime değil", "x")]
        public void BozukCeviriler_Reddedilir(string text, string source)
        {
            Assert.False(TranslationFilter.IsUsableWord(text, source));
        }

        [Fact]
        public void CumleCevirisi_BaskaAlfabeIceriyorsa_Reddedilir()
        {
            Assert.True(TranslationFilter.IsUsableSentence("Bu telefonun yazılımı kablosuz olarak yükseltilebilir."));
            Assert.False(TranslationFilter.IsUsableSentence("Bu telefon 这是 güncellenebilir."));
            Assert.False(TranslationFilter.IsUsableSentence("MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS"));
            Assert.False(TranslationFilter.IsUsableSentence(""));
        }

        [Fact]
        public void CumleCevirisi_UcNoktaVeKivrikTirnakGecer()
        {
            Assert.True(TranslationFilter.IsUsableSentence("… bir görev – kişinin ’asıl’ işi"));
        }
    }
}