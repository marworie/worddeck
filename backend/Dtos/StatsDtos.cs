namespace WordDeck.Dtos
{
    // Bir günde çalışılan kart sayısı (grafik için)
    public class DailyCountDto
    {
        public DateTime Date { get; set; }
        public int Count { get; set; }
    }

    // Bir Leitner kutusundaki kelime sayısı
    public class BoxCountDto
    {
        public int Box { get; set; }
        public int Count { get; set; }
    }

    // En çok unutulan kelimeler listesindeki bir satır
    public class ForgottenWordDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public int WrongCount { get; set; }
        public int CorrectCount { get; set; }
    }

    // Veritabanından toplamlar (yardımcı)
    public class StatsTotalsRow
    {
        public int TotalStudied { get; set; }
        public int Known { get; set; }
        public int Learned { get; set; }
        public int Correct { get; set; }
        public int Wrong { get; set; }
    }

    // İstatistik sayfasının tamamı
    public class StatsDto
    {
        public int TotalStudied { get; set; }
        public int Known { get; set; }  // en az bir kez Biliyorum / Çok kolay denmiş (2. kutu ve üstü)
        public int Learned { get; set; }
        public int TotalReviews { get; set; }
        public int CurrentStreak { get; set; }
        public int LongestStreak { get; set; }
        public int? SuccessRate { get; set; }   // kartlarda "biliyorum" oranı (%), hiç cevap yoksa null
        public List<DailyCountDto> Daily { get; set; } = new();
        public List<BoxCountDto> Boxes { get; set; } = new();
        public List<ForgottenWordDto> MostForgotten { get; set; } = new();
        public List<QuizResultDto> Quizzes { get; set; } = new();
    }

    // Kartın cevaptan önceki hali (geri alma için)
    public class UserWordSnapshot
    {
        public int Box { get; set; }
        public DateTime NextReviewDate { get; set; }
        public DateTime? LastReviewedAt { get; set; }
        public int CorrectCount { get; set; }
        public int WrongCount { get; set; }
        public int HardState { get; set; }
        public int HardStreak { get; set; }
        public DateTime? HardStateSince { get; set; }
        public DateTime? HardNextCheck { get; set; }
    }
}
