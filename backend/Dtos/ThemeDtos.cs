namespace WordDeck.Dtos
{
    // Tema kartı: kelime sayısı ve kullanıcının bu temadaki ilerlemesi
    public class ThemeDto
    {
        public int Id { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public int WordCount { get; set; }
        public int StudiedCount { get; set; }   // çalışmaya eklenmiş
        public int LearnedCount { get; set; }   // öğrenilmiş (son kutuya ulaşmış)
    }
}