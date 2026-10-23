namespace WordDeck.Dtos
{
    // Bir seviyedeki tema kelimesi (üniteleri oluşturmak için)
    public class PathWordRow
    {
        public int ThemeId { get; set; }
        public string ThemeName { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int WordId { get; set; }
    }

    public class UnitProgressRow
    {
        public int ThemeId { get; set; }
        public int Part { get; set; }
        public int BestScore { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class PathUnitDto
    {
        public int Order { get; set; }
        public int ThemeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int Part { get; set; }
        public int PartCount { get; set; }
        public int WordCount { get; set; }
        public string Status { get; set; } = "locked";   // completed, current, locked
        public int? BestScore { get; set; }
    }

    public class PathDto
    {
        public string Level { get; set; } = string.Empty;
        public List<PathUnitDto> Units { get; set; } = new();
        public int CompletedCount { get; set; }
    }

    public class PathUnitWordDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public int? Box { get; set; }
    }

    public class PathUnitDetailDto
    {
        public PathUnitDto Unit { get; set; } = new();
        public List<PathUnitWordDto> Words { get; set; } = new();
    }

    public class PathResultRequest
    {
        public int Correct { get; set; }
        public int Total { get; set; }
    }

    public class PathResultDto
    {
        public int Score { get; set; }
        public bool Passed { get; set; }
        public int BestScore { get; set; }
        public bool NextUnlocked { get; set; }
    }
}