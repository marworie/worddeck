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

                // En uzun seri: tarihler içindeki en uzun aralıksız gün dizisi
        public static int Longest(IEnumerable<DateTime> studyDates)
        {
            var days = studyDates.Select(d => d.Date).Distinct().OrderBy(d => d).ToList();
            if (days.Count == 0) return 0;

            int longest = 1, current = 1;
            for (int i = 1; i < days.Count; i++)
            {
                // Bir önceki günün ertesi günüyse seri devam ediyor, değilse yeniden başla
                current = days[i] == days[i - 1].AddDays(1) ? current + 1 : 1;
                longest = Math.Max(longest, current);
            }
            return longest;
        }
    }
}