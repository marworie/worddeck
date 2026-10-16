using System.ComponentModel.DataAnnotations;

namespace WordDeck.Dtos
{
    // Bir seviyenin cevapları: her soru için seçilen şıkkın Id'si, "Bilmiyorum" ise null
    public class PlacementAnswerDto
    {
        [Required]
        public string SessionId { get; set; } = "";

        [Required]
        public List<int?> Answers { get; set; } = new();
    }

    public class PlacementResultDto
    {
        public string? PlacementLevel { get; set; }
        public DateTime? PlacementTakenAt { get; set; }
    }
}