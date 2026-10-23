using WordDeck.Dtos;

namespace WordDeck.Services
{
    public record PathUnit(int Order, int ThemeId, string ThemeName, string Icon, int Part, int PartCount, List<int> WordIds);

    // Öğrenme yolu kuralları: üniteleri oluşturma, kilitler, geçme notu
    public static class PathRules
    {
        public const int MaxUnitSize = 15;   // daha fazla kelime varsa ünite bölünür
        public const int MinUnitSize = 5;    // bu seviyede bundan az kelimesi olan tema yolda yer almaz
        public const int PassScore = 80;
        public static readonly string[] Levels = { "A1", "A2", "B1", "B2", "C1" };

        // Temalar sırayla; kalabalık temalar eşit parçalara bölünür (20 kelime → 10 + 10)
        public static List<PathUnit> BuildUnits(IEnumerable<PathWordRow> words)
        {
            var units = new List<PathUnit>();
            foreach (var theme in words.GroupBy(w => w.ThemeId).OrderBy(g => g.Key))
            {
                var ids = theme.Select(w => w.WordId).Distinct().OrderBy(id => id).ToList();
                if (ids.Count < MinUnitSize) continue;

                int parts = (ids.Count + MaxUnitSize - 1) / MaxUnitSize;
                int size = (ids.Count + parts - 1) / parts;
                var first = theme.First();

                for (int p = 0; p < parts; p++)
                    units.Add(new PathUnit(units.Count, theme.Key, first.ThemeName, first.Icon,
                        p + 1, parts, ids.Skip(p * size).Take(size).ToList()));
            }
            return units;
        }

        // İlk ünite hep açık; bir ünite ancak öncekisi tamamlanınca açılır
        public static List<string> Statuses(IReadOnlyList<PathUnit> units, ISet<(int ThemeId, int Part)> completed)
        {
            var result = new List<string>();
            bool previousDone = true;
            foreach (var u in units)
            {
                bool done = completed.Contains((u.ThemeId, u.Part));
                result.Add(done ? "completed" : previousDone ? "current" : "locked");
                previousDone = done;
            }
            return result;
        }

        public static int Score(int correct, int total) =>
            total <= 0 ? 0 : (int)Math.Round(Math.Clamp(correct, 0, total) * 100.0 / total);

        public static bool Passed(int score) => score >= PassScore;
    }
}