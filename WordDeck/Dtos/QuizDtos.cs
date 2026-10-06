using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Sınav bitince frontend'in gönderdiği sonuç
    public class QuizFinishDto : IValidatableObject
    {
        [Required]
        [RegularExpression("^(A1|A2|B1|B2|C1)$", ErrorMessage = "Geçersiz seviye.")]
        public string Level { get; set; } = string.Empty;

        [Range(1, 50)]
        public int TotalQuestions { get; set; }

        [Range(0, 50)]
        public int CorrectAnswers { get; set; }

        [Range(0, 36000)]   // en fazla 10 saat
        public int DurationSeconds { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext context)
        {
            if (CorrectAnswers > TotalQuestions)
                yield return new ValidationResult("Doğru sayısı soru sayısından fazla olamaz.", new[] { nameof(CorrectAnswers) });
        }
    }

    // Geçmiş sınavlar listesindeki bir satır
    public class QuizResultDto
    {
        public int Id { get; set; }
        public string Level { get; set; } = string.Empty;
        public int TotalQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public int DurationSeconds { get; set; }
        public DateTime TakenAt { get; set; }
    }
}