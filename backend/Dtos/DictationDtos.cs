namespace WordDeck.Dtos
{
    public class DictationSentenceDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = "";
        public string Example { get; set; } = "";
        public string? ExampleTr { get; set; }
    }

    public class DictationCheckRequest
    {
        public string Expected { get; set; } = "";
        public string Typed { get; set; } = "";
    }
}