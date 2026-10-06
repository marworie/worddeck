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
}