namespace WordDeck.Services
{
    // Leitner aralıklı tekrar sistemi.
    // Biliyorum → bir üst kutu, Bilmiyorum → 1. kutu. Kutu ne kadar yüksekse tekrar o kadar seyrek.
    // Veritabanına dokunmaz: sadece hesap yapar, bu yüzden kolayca test edilebilir.
    public static class LeitnerService
    {
        public const int FirstBox = 1;
        public const int LearnedBox = 6;   // 6 = öğrenildi

        // Kutu → kaç gün sonra tekrar (index = kutu numarası, 0 kullanılmıyor)
        private static readonly int[] IntervalDays = { 0, 1, 2, 4, 8, 16, 60 };

        // currentBox: kelimenin şu anki kutusu (yeni kelimeyse null)
        // known: kullanıcı "Biliyorum" dedi mi
        // today: bugünün tarihi (dışarıdan veriyoruz ki testte istediğimiz günü verebilelim)
        public static (int NewBox, DateTime NextReviewDate) Next(int? currentBox, bool known, DateTime today)
        {
            int box = currentBox ?? FirstBox;   // yeni kelime 1. kutudan başlar

            int newBox = known
                ? Math.Min(box + 1, LearnedBox) // bildiyse bir üst kutu (6'yı geçmez)
                : FirstBox;                     // bilemediyse en başa

            return (newBox, today.Date.AddDays(IntervalDays[newBox]));
        }
    }
}