namespace WordDeck.Dtos
{
    public class ReaderAnalyzeRequest
    {
        public List<string> Words { get; set; } = new();
    }

    // Veritabanından gelen satır
    public class ReaderWordRow
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public int? Box { get; set; }   // null: hiç çalışılmamış
    }

    // Metindeki bir kelimenin karşılığı
    public class ReaderWordDto
    {
        public string Word { get; set; } = string.Empty;       // metindeki hali (went)
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;   // sözlükteki hali (go)
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? Meaning { get; set; }
        public string Status { get; set; } = "new";            // new, studying, known, learned
    }
}