namespace WordDeck.Dtos
{
    // Seviye yolculuğunda bir durak
    public class JourneyLevelDto
    {
        public string Level { get; set; } = string.Empty;
        public int Total { get; set; }     // seviyedeki kelime sayısı
        public int Studied { get; set; }   // çalışmaya eklenmiş
        public int Learned { get; set; }   // öğrenilmiş
    }

    // Günün kelimesi
    public class WordOfDayDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public string? Example { get; set; }
        public bool InStudy { get; set; }  // kartlarına zaten eklenmiş mi
    }
}