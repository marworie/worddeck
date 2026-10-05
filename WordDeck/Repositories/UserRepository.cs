using WordDeck.Models;

namespace WordDeck.Repositories
{
    // Testlerde sahte (mock) repository verebilmek için arayüz
    public interface IUserRepository
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByIdAsync(int id);
        Task<int> AddAsync(string username, string passwordHash);
        Task UpdateDailyNewWordsAsync(int userId, int count);
    }

    public class UserRepository : BaseRepository, IUserRepository
    {
        public UserRepository(IConfiguration configuration) : base(configuration) { }

        public Task<User?> GetByUsernameAsync(string username) =>
            QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE Username = @Username",
                new { Username = username });

        public Task<User?> GetByIdAsync(int id) =>
            QuerySingleOrDefaultAsync<User>(
                "SELECT * FROM Users WHERE Id = @Id",
                new { Id = id });

        // Yeni kullanıcı ekler, oluşan Id'yi döndürür
        public Task<int> AddAsync(string username, string passwordHash) =>
            ExecuteScalarAsync<int>(
                @"INSERT INTO Users (Username, PasswordHash)
                  VALUES (@Username, @PasswordHash);
                  SELECT CAST(SCOPE_IDENTITY() AS int);",
                new { Username = username, PasswordHash = passwordHash });

        public Task UpdateDailyNewWordsAsync(int userId, int count) =>
            ExecuteAsync(
                "UPDATE Users SET DailyNewWords = @Count WHERE Id = @Id",
                new { Id = userId, Count = count });
    }
}