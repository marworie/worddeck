using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Çalışma oturumunda frontend'e giden tek bir kart
    public class StudyCardDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }   // kullanıcı düzelttiyse onunki, yoksa genel çeviri
        public string? Definition { get; set; }
        public string? DefinitionTr { get; set; }         // İngilizce tanımın Türkçe çevirisi
        public string? Example { get; set; }
        public int? Box { get; set; }                 // yeni kelimede null
        public bool IsNew { get; set; }
    }

    // Kullanıcının bir karta verdiği cevap
    public class AnswerDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Geçersiz kelime.")]
        public int WordId { get; set; }

        public bool Known { get; set; }   // true = Biliyorum, false = Bilmiyorum
    }

    // İlerleme sayfası: bir seviyenin durumu
    public class LevelProgressDto
    {
        public string Level { get; set; } = string.Empty;
        public int Total { get; set; }      // o seviyedeki toplam kelime
        public int Learned { get; set; }    // 6. kutudakiler
        public int Learning { get; set; }   // 1-5. kutudakiler
        public int DueToday { get; set; }   // bugün tekrar zamanı gelenler
    }

    // İlerleme sayfasının tamamı
    public class ProgressDto
    {
        public List<LevelProgressDto> Levels { get; set; } = new();
        public int Streak { get; set; }
    }

    public class SettingsDto
    {
        [Range(1, 50, ErrorMessage = "Yeni kelime sayısı 1 ile 50 arasında olmalı.")]
        public int DailyNewWords { get; set; }
    }

    // Geçerli seviyeler tek yerde
    public static class Levels
    {
        public static readonly string[] All = { "A1", "A2", "B1", "B2", "C1" };
    }
    // Kullanıcının bir kelimeye yazdığı kendi Türkçe anlamı (boş = otomatik çeviriye dön)
    public class MeaningDto
    {
        [MaxLength(300, ErrorMessage = "Anlam en fazla 300 karakter olabilir.")]
        public string? Meaning { get; set; }
    }
}