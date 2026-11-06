using WordDeck.Dtos;

namespace WordDeck.Repositories
{
    public interface IStoryRepository
    {
        Task<IEnumerable<StorySummaryDto>> GetAllAsync(int userId);
        Task<StoryRow?> GetAsync(int id);
        Task<int?> GetProgressAsync(int userId, int storyId);
        Task SaveProgressAsync(int userId, int storyId, int page);
        Task<bool> TitleExistsAsync(string title);
        Task<int> AddAsync(StoryRow story);
        Task<IEnumerable<StoryRow>> GetAllRowsAsync();
        Task UpdateLevelAsync(int id, string level, int pageCount);
        Task<IEnumerable<StoryWordMarkDto>> GetWordMarksAsync(int userId, int storyId);
        Task SetWordMarkAsync(int userId, int storyId, int wordId, string mark);
        Task DeleteWordMarkAsync(int userId, int storyId, int wordId);
    }

    public class StoryRepository : BaseRepository, IStoryRepository
    {
        public StoryRepository(IConfiguration configuration) : base(configuration) { }

        public Task<IEnumerable<StorySummaryDto>> GetAllAsync(int userId) =>
            QueryAsync<StorySummaryDto>(
                @"SELECT s.Id, s.Title, s.Author, s.Level, s.Emoji, s.Color, s.CoverUrl,
                         s.WordCount, s.PageCount, p.Page, p.UpdatedAt AS LastReadAt
                  FROM Stories s
                  LEFT JOIN UserStoryProgress p ON p.StoryId = s.Id AND p.UserId = @UserId
                  ORDER BY CASE s.Level WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3
                                        WHEN 'B2' THEN 4 ELSE 5 END, s.Title",
                new { UserId = userId });

        public async Task<StoryRow?> GetAsync(int id) =>
            (await QueryAsync<StoryRow>("SELECT * FROM Stories WHERE Id = @Id", new { Id = id }))
            .FirstOrDefault();

        public async Task<int?> GetProgressAsync(int userId, int storyId) =>
            (await QueryAsync<int?>(
                "SELECT Page FROM UserStoryProgress WHERE UserId = @UserId AND StoryId = @StoryId",
                new { UserId = userId, StoryId = storyId }))
            .FirstOrDefault();

        // Varsa güncelle, yoksa ekle
        public Task SaveProgressAsync(int userId, int storyId, int page) =>
            ExecuteAsync(
                @"UPDATE UserStoryProgress SET Page = @Page, UpdatedAt = SYSUTCDATETIME()
                  WHERE UserId = @UserId AND StoryId = @StoryId;
                  IF @@ROWCOUNT = 0
                      INSERT INTO UserStoryProgress (UserId, StoryId, Page) VALUES (@UserId, @StoryId, @Page);",
                new { UserId = userId, StoryId = storyId, Page = page });

        public async Task<bool> TitleExistsAsync(string title) =>
            (await QueryAsync<int>("SELECT COUNT(*) FROM Stories WHERE Title = @Title", new { Title = title }))
            .Single() > 0;

        public async Task<int> AddAsync(StoryRow s) =>
            (await QueryAsync<int>(
                @"INSERT INTO Stories (Title, Author, Level, Emoji, Color, CoverUrl, Body, WordCount, PageCount, Source)
                  OUTPUT INSERTED.Id
                  VALUES (@Title, @Author, @Level, @Emoji, @Color, @CoverUrl, @Body, @WordCount, @PageCount, @Source)",
                s))
            .Single();

        public Task<IEnumerable<StoryRow>> GetAllRowsAsync() =>
            QueryAsync<StoryRow>("SELECT * FROM Stories");

        // Seviye değişince sayfa uzunluğu da değişir (A1 100, A2 120, diğerleri 150 kelime)
        public Task UpdateLevelAsync(int id, string level, int pageCount) =>
            ExecuteAsync("UPDATE Stories SET Level = @Level, PageCount = @PageCount WHERE Id = @Id",
                new { Id = id, Level = level, PageCount = pageCount });

        public Task<IEnumerable<StoryWordMarkDto>> GetWordMarksAsync(int userId, int storyId) =>
            QueryAsync<StoryWordMarkDto>(
                @"SELECT WordId, Mark FROM UserStoryWords
                  WHERE UserId = @UserId AND StoryId = @StoryId
                  ORDER BY UpdatedAt",
                new { UserId = userId, StoryId = storyId });

        // Varsa güncelle, yoksa ekle
        public Task SetWordMarkAsync(int userId, int storyId, int wordId, string mark) =>
            ExecuteAsync(
                @"UPDATE UserStoryWords SET Mark = @Mark, UpdatedAt = SYSUTCDATETIME()
                  WHERE UserId = @UserId AND StoryId = @StoryId AND WordId = @WordId;
                  IF @@ROWCOUNT = 0
                      INSERT INTO UserStoryWords (UserId, StoryId, WordId, Mark)
                      VALUES (@UserId, @StoryId, @WordId, @Mark);",
                new { UserId = userId, StoryId = storyId, WordId = wordId, Mark = mark });

        public Task DeleteWordMarkAsync(int userId, int storyId, int wordId) =>
            ExecuteAsync(
                "DELETE FROM UserStoryWords WHERE UserId = @UserId AND StoryId = @StoryId AND WordId = @WordId",
                new { UserId = userId, StoryId = storyId, WordId = wordId });
    }
}