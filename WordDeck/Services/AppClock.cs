namespace WordDeck.Services
{
    // Sunucu yurt dışında olabilir; "bugün" her zaman Türkiye saatine göre hesaplansın
    public static class AppClock
    {
        private static readonly TimeZoneInfo Turkey = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

        public static DateTime Today => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Turkey).Date;
    }
}
