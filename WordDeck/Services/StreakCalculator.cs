namespace WordDeck.Services
{
    // Seri (streak) hesabı: bugünden (ya da dünden) geriye doğru kaç gün aralıksız çalışılmış
    public static class StreakCalculator
    {
        public static int Calculate(IEnumerable<DateTime> studyDates, DateTime today)
        {
            var days = studyDates.Select(d => d.Date).ToHashSet();

            // Bugün henüz çalışmadıysa seri bozulmuş sayılmasın, dünden saymaya başla
            DateTime day = days.Contains(today.Date) ? today.Date : today.Date.AddDays(-1);

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