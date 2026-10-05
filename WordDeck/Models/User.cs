namespace WordDeck.Models
{
    // Users tablosunun karşılığı
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public int DailyNewWords { get; set; }     // oturum başına yeni kelime sayısı (ayarlar)
        public DateTime CreatedDate { get; set; }
    }
}