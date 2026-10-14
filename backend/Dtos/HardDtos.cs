using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Zorlandıklarım listesindeki bir kelime
    public class HardWordDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public int HardState { get; set; }        // 1 zor, 2 güçleniyor, 3 ustalaşıldı
        public int HardStreak { get; set; }
        public int WrongCount { get; set; }
        public DateTime? NextCheck { get; set; }
    }

    // Çoktan seçmeli sorudaki bir şık
    public class ChoiceDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
    }

    // Zor kelime çalışmasındaki bir soru
    public class PracticeQuestionDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public string? Definition { get; set; }
        public string? DefinitionTr { get; set; }
        public string? Example { get; set; }
        public int HardState { get; set; }
        public int HardStreak { get; set; }
        public string QuestionType { get; set; } = string.Empty;
        public string? ClozeSentence { get; set; }       // sadece boşluk doldurmada
        public List<ChoiceDto>? Choices { get; set; }    // sadece çoktan seçmelide
    }

    // Zor kelime sorusuna verilen cevap
    public class PracticeAnswerDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Geçersiz kelime.")]
        public int WordId { get; set; }

        [Required]
        [RegularExpression("^(choice|cloze|typing|listening|speaking)$", ErrorMessage = "Geçersiz soru tipi.")]
        public string QuestionType { get; set; } = string.Empty;

        public bool IsCorrect { get; set; }

        // Çoktan seçmelide seçilen şık (yanlışsa "karıştırdıkların"a kaydedilecek)
        public int? ChosenWordId { get; set; }
    }

        // Karıştırılan kelime çifti (karşılaştırma kartı için)
    public class ConfusionDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public string? Definition { get; set; }
        public int OtherWordId { get; set; }
        public string OtherHeadword { get; set; } = string.Empty;
        public string? OtherTurkishMeaning { get; set; }
        public string? OtherDefinition { get; set; }
        public int TimesConfused { get; set; }
    }

    // İçgörüler: türe göre zorlanma (fiil, isim...)
    public class PosStatDto
    {
        public string PartOfSpeech { get; set; } = string.Empty;
        public int HardCount { get; set; }      // bu türden kaç zor kelime var
        public int TotalWrong { get; set; }     // toplam yanlış sayısı
    }

    // İçgörüler: son 7 günde soru tiplerine göre başarı
    public class QuestionTypeStatDto
    {
        public string QuestionType { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Correct { get; set; }
    }

    // İçgörüler sayfasının tamamı
    public class InsightsDto
    {
        public int HardCount { get; set; }
        public int StrengtheningCount { get; set; }
        public int MasteredCount { get; set; }
        public int MasteredThisWeek { get; set; }
        public List<PosStatDto> ByPartOfSpeech { get; set; } = new();
        public List<QuestionTypeStatDto> ByQuestionType { get; set; } = new();
        public List<ConfusionDto> TopConfusions { get; set; } = new();
    }

    // Veritabanından durum sayıları (içgörüler için yardımcı)
    public class StateCountsRow
    {
        public int Hard { get; set; }
        public int Strengthening { get; set; }
        public int Mastered { get; set; }
        public int MasteredThisWeek { get; set; }
    }

    // Kelime ağı (Datamuse)
    public class WordNetworkDto
    {
        public List<string> Synonyms { get; set; } = new();      // eş anlamlılar
        public List<string> Antonyms { get; set; } = new();      // zıt anlamlılar
        public List<string> Associated { get; set; } = new();    // akla gelen ilişkili kelimeler
        public List<string> Collocations { get; set; } = new();  // sık birlikte kullanılanlar
        public string CollocationPosition { get; set; } = "after";  // "before": ___ lane, "after": run ___
    }
}