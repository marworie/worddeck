using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace WordDeck.Repositories
{
    // Tüm repository'lerin ortak atası: bağlantı ve Dapper yardımcıları tek yerde (DRY)
    public abstract class BaseRepository
    {
        private readonly string _connectionString;

        protected BaseRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("WordDeckDB")
                ?? throw new InvalidOperationException("WordDeckDB bağlantı dizesi bulunamadı.");
        }

        // Her çağrıda yeni bağlantı; .NET connection pool sayesinde maliyetli değil
        protected IDbConnection CreateConnection() => new SqlConnection(_connectionString);

        protected async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null)
        {
            using var conn = CreateConnection();
            return await conn.QueryAsync<T>(sql, param);
        }

        protected async Task<T?> QuerySingleOrDefaultAsync<T>(string sql, object? param = null)
        {
            using var conn = CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<T>(sql, param);
        }

        protected async Task<int> ExecuteAsync(string sql, object? param = null)
        {
            using var conn = CreateConnection();
            return await conn.ExecuteAsync(sql, param);
        }

        protected async Task<T?> ExecuteScalarAsync<T>(string sql, object? param = null)
        {
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<T>(sql, param);
        }
    }
}