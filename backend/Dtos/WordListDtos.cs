using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Kelime defterindeki bir liste
    public class WordListDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsFavorites { get; set; }
        public int WordCount { get; set; }
    }

    // Liste oluşturma / yeniden adlandırma
    public class WordListNameDto
    {
        [Required(ErrorMessage = "Liste adı boş olamaz.")]
        [StringLength(60, MinimumLength = 1, ErrorMessage = "Liste adı en fazla 60 karakter olabilir.")]
        public string Name { get; set; } = string.Empty;
    }

    // Arama sonucu ya da liste içindeki bir kelime (kullanıcının o kelimeyle durumu da dahil)
    public class WordSummaryDto
    {
        public int WordId { get; set; }
        public string Headword { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string? TurkishMeaning { get; set; }
        public int? Box { get; set; }          // null = hiç çalışılmamış
        public int? HardState { get; set; }
        public bool IsFavorite { get; set; }
    }
}