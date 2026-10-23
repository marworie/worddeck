namespace WordDeck.Dtos
{
    public class SentenceWordDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public string? Example { get; set; }
    }

    public class SentenceCheckRequest
    {
        public int WordId { get; set; }
        public string Sentence { get; set; } = string.Empty;
    }

    public class SentenceIssueDto
    {
        public int Offset { get; set; }          // hatanın cümledeki başlangıcı
        public int Length { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public List<string> Replacements { get; set; } = new();
    }

    public class SentenceCheckResult
    {
        public bool UsesWord { get; set; }
        public int WordCount { get; set; }
        public bool TooShort { get; set; }
        public bool GrammarChecked { get; set; }  // LanguageTool cevap verdi mi
        public List<SentenceIssueDto> Issues { get; set; } = new();
        public bool Ok { get; set; }
    }
}