using WordDeck.Dtos;

namespace WordDeck.Services
{
    // Testin bir seviyeden sonraki kararı.
    // Finished = false → Level: sıradaki denenecek seviye
    // Finished = true  → Level: kullanıcının sonuç seviyesi
    public record PlacementDecision(bool Finished, string Level);

    // Seviye belirleme testi kuralları. Veritabanına dokunmaz, kolayca test edilir.
    // A1'den başlanır; her seviyede 5 soru, 4+ doğru ise bir üst seviyeye geçilir.
    public static class PlacementRules
    {
        public const int QuestionsPerLevel = 5;
        public const int PassScore = 4;

        public static PlacementDecision Decide(string level, int correct)
        {
            var levels = Levels.All.ToList();
            int index = levels.IndexOf(level);
            if (index < 0)
                throw new ArgumentException("Geçersiz seviye.", nameof(level));

            // Geçemedi: bu seviyenin kelimelerini henüz tam bilmiyor, buradan başlamalı
            if (correct < PassScore)
                return new PlacementDecision(true, level);

            // Son seviyeyi de geçti: en üst seviye
            if (index == levels.Count - 1)
                return new PlacementDecision(true, level);

            // Geçti: bir üst seviyeyi dene
            return new PlacementDecision(false, levels[index + 1]);
        }
    }
}