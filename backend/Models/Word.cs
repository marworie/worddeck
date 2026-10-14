namespace WordDeck.Models
{
    // Words tablosunun karşılığı
    public class Word
    {
        public int Id { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public string? Definition { get; set; }
        public string? DefinitionTr { get; set; }         // İngilizce tanımın Türkçe çevirisi
        public string? Example { get; set; }
        public DateTime? DetailsFetchedAt { get; set; }   // null = bilgiler henüz (tam) çekilmedi
    }
}