namespace WordDeck.Dtos
{
    // Hikaye ekleme: ya Gutenberg (GutenbergId + Start) ya da kendi metnimiz (Text)
    public class StoryImportRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Emoji { get; set; } = "📖";
        public string Color { get; set; } = "#4f46e5";
        public string? CoverUrl { get; set; }
        public string? Level { get; set; }        // boşsa otomatik hesaplanır
        public string? Text { get; set; }
        public int? GutenbergId { get; set; }
        public string? Start { get; set; }        // hikayenin ilk cümlesi
        public string? End { get; set; }          // hikayeden hemen sonraki metin (dahil değil)
        public string? Heading { get; set; }      // kitaptaki başlık farklıysa (boşsa Title kullanılır)
        public string? NextTitle { get; set; }    // kitapta sonraki hikayenin başlığı
    }

    public class StoryRow
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Emoji { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string? CoverUrl { get; set; }
        public string Body { get; set; } = string.Empty;
        public int WordCount { get; set; }
        public int PageCount { get; set; }
        public string? Source { get; set; }
    }

    // Kitaplıktaki kapak
    public class StorySummaryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Emoji { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string? CoverUrl { get; set; }
        public int WordCount { get; set; }
        public int PageCount { get; set; }
        public int? Page { get; set; }            // kaldığı sayfa (hiç açılmadıysa null)
    }

    // Okuyucuya giden hikaye
    public class StoryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Level { get; set; } = string.Empty;
        public string Emoji { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string? CoverUrl { get; set; }
        public List<string> Pages { get; set; } = new();
        public int Page { get; set; }
    }

    public class StoryProgressRequest
    {
        public int Page { get; set; }
    }
}