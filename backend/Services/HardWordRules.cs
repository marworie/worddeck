namespace WordDeck.Services
{
    // Zor kelimelerin durumları (veritabanında sayı olarak tutuluyor)
    public enum HardState : byte
    {
        None = 0,            // zor listesinde değil
        Hard = 1,            // 🔴 zor
        Strengthening = 2,   // 🟡 güçleniyor
        Mastered = 3         // 🟢 ustalaşıldı (listeden çıkmaz, arada kontrol edilir)
    }

    // Bir kelimenin zor listesindeki anlık durumu
    public record HardProgress(HardState State, int Streak, DateTime? StateSince, DateTime? NextCheck);

    // Zor kelime durum geçişleri. Veritabanına dokunmaz, sadece hesap yapar (Leitner gibi, kolayca test edilir).
    //   🔴 Zor          → üst üste 3 doğru → 🟡
    //   🟡 Güçleniyor   → 🟡'ye geçtiği günden SONRAKİ günlerde üst üste 3 doğru → 🟢
    //   🟢 Ustalaşıldı  → 14 günde bir kontrol; doğruysa bir sonraki kontrol 14 gün sonra
    //   Herhangi bir yanlış → 🔴, seri sıfırlanır
    public static class HardWordRules
    {
        public const int StreakToAdvance = 3;
        public const int MasteredCheckDays = 14;

        // Kelime bilinemediğinde (ana çalışmada ya da zor kelime çalışmasında)
        public static HardProgress MarkUnknown(DateTime today) =>
            new(HardState.Hard, 0, today.Date, null);

        public static HardProgress Answer(HardProgress current, bool correct, DateTime today)
        {
            if (!correct) return MarkUnknown(today);

            switch (current.State)
            {
                case HardState.Hard:
                {
                    int streak = current.Streak + 1;
                    return streak >= StreakToAdvance
                        ? new HardProgress(HardState.Strengthening, 0, today.Date, null)
                        : current with { Streak = streak };
                }

                case HardState.Strengthening:
                {
                    // 🟡'ye geçtiği gün verilen doğrular sayılmaz: "başka bir gün de biliyor musun?"
                    if (current.StateSince.HasValue && today.Date <= current.StateSince.Value.Date)
                        return current;

                    int streak = current.Streak + 1;
                    return streak >= StreakToAdvance
                        ? new HardProgress(HardState.Mastered, 0, today.Date, today.Date.AddDays(MasteredCheckDays))
                        : current with { Streak = streak };
                }

                case HardState.Mastered:
                    // Kontrolü geçti: bir sonraki kontrol 14 gün sonra
                    return current with { NextCheck = today.Date.AddDays(MasteredCheckDays) };

                default:
                    return current;   // zor listesinde olmayan kelimede değişiklik yok
            }
        }
    }
}