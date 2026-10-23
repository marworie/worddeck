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
    }
}