namespace WordDeck.Services
{
    // Rozet hesabında kullanılan sayılar (veritabanından hesaplanır)
    public class BadgeStats
    {
        public int StreakDays { get; set; }
        public int LearnedWords { get; set; }
        public int StoriesFinished { get; set; }
        public int UnitsCompleted { get; set; }
    }

    public record BadgeDto(string Id, string Emoji, string Title, string Description, int Current, int Target, bool Earned);

    // Rozet tanımları ve kazanılıp kazanılmadığı
    public static class BadgeRules
    {
        private record Def(string Id, string Emoji, string Title, string Description, Func<BadgeStats, int> Value, int Target);

        private static readonly Def[] Defs =
        {
            new("streak-3",   "🔥", "Isınma turu",     "3 gün üst üste çalış",    s => s.StreakDays, 3),
            new("streak-7",   "🔥", "Bir hafta",       "7 gün üst üste çalış",    s => s.StreakDays, 7),
            new("streak-30",  "🌋", "Durdurulamaz",    "30 gün üst üste çalış",   s => s.StreakDays, 30),

            new("words-10",   "🌱", "İlk adımlar",     "10 kelime öğren",         s => s.LearnedWords, 10),
            new("words-100",  "🌿", "Kelime avcısı",   "100 kelime öğren",        s => s.LearnedWords, 100),
            new("words-500",  "🌳", "Kelime ustası",   "500 kelime öğren",        s => s.LearnedWords, 500),
            new("words-1000", "🏆", "Sözlük gibi",     "1000 kelime öğren",       s => s.LearnedWords, 1000),

            new("story-1",    "📖", "İlk kitap",       "Bir hikayeyi bitir",      s => s.StoriesFinished, 1),
            new("story-5",    "📚", "Kitap kurdu",     "5 hikaye bitir",          s => s.StoriesFinished, 5),
            new("story-10",   "🏛️", "Kütüphaneci",     "10 hikaye bitir",         s => s.StoriesFinished, 10),

            new("unit-1",     "🗺️", "Yola çıktın",     "Bir üniteyi tamamla",     s => s.UnitsCompleted, 1),
            new("unit-10",    "🧭", "Kaşif",           "10 ünite tamamla",        s => s.UnitsCompleted, 10),
            new("unit-25",    "⛰️", "Zirveye doğru",   "25 ünite tamamla",        s => s.UnitsCompleted, 25),
        };

        public static List<BadgeDto> Evaluate(BadgeStats stats) =>
            Defs.Select(d =>
            {
                int current = Math.Max(d.Value(stats), 0);
                return new BadgeDto(d.Id, d.Emoji, d.Title, d.Description,
                    Math.Min(current, d.Target), d.Target, current >= d.Target);
            }).ToList();

        // Seri: bugünden (bugün henüz çalışılmadıysa dünden) geriye kesintisiz çalışılan gün sayısı
        public static int Streak(IEnumerable<DateTime> studyDates, DateTime today)
        {
            var days = studyDates.Select(d => d.Date).ToHashSet();
            var day = days.Contains(today.Date) ? today.Date : today.Date.AddDays(-1);

            int streak = 0;
            while (days.Contains(day))
            {
                streak++;
                day = day.AddDays(-1);
            }
            return streak;
        }
    }
}