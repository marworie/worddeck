using WordDeck.Dtos;
using WordDeck.Services;

namespace WordDeck.Repositories
{
    public interface IPlacementRepository
    {
        Task<IEnumerable<WordInfo>> GetCandidatesAsync(string level, int count);
        Task<IEnumerable<WordInfo>> GetPoolAsync(string level, int count);
        Task SaveResultAsync(int userId, string level);
        Task<PlacementResultDto?> GetResultAsync(int userId);
    }

    public class PlacementRepository : BaseRepository, IPlacementRepository
    {
        public PlacementRepository(IConfiguration configuration) : base(configuration) { }

        // Sütunlar WordInfo'nun parametre sırasıyla aynı olmalı: Dapper record'u bu sırayla doldurur
        private const string WordInfoColumns =
            "Id AS WordId, Headword, PartOfSpeech, TurkishMeaning, Definition, Example";

        // Soru adayları: içerik kelimesi (isim, fiil, sıfat, zarf) ve en az bir bilgisi olan
        public Task<IEnumerable<WordInfo>> GetCandidatesAsync(string level, int count) =>
            QueryAsync<WordInfo>(
                $@"SELECT TOP (@Count) {WordInfoColumns}
                   FROM Words
                   WHERE Level = @Level AND PartOfSpeech IN @Pos
                     AND (Example IS NOT NULL OR Definition IS NOT NULL OR TurkishMeaning IS NOT NULL)
                   ORDER BY NEWID()",
                new { Level = level, Count = count, Pos = ChoiceQuestionBuilder.ContentPos });

        // Çeldirici havuzu: aynı seviyeden rastgele kelimeler
        public Task<IEnumerable<WordInfo>> GetPoolAsync(string level, int count) =>
            QueryAsync<WordInfo>(
                $@"SELECT TOP (@Count) {WordInfoColumns}
                   FROM Words
                   WHERE Level = @Level AND PartOfSpeech IN @Pos
                   ORDER BY NEWID()",
                new { Level = level, Count = count, Pos = ChoiceQuestionBuilder.ContentPos });

        public Task SaveResultAsync(int userId, string level) =>
            ExecuteAsync(
                @"UPDATE Users SET PlacementLevel = @Level, PlacementTakenAt = SYSDATETIME()
                  WHERE Id = @UserId",
                new { UserId = userId, Level = level });

        public Task<PlacementResultDto?> GetResultAsync(int userId) =>
            QuerySingleOrDefaultAsync<PlacementResultDto>(
                "SELECT PlacementLevel, PlacementTakenAt FROM Users WHERE Id = @UserId",
                new { UserId = userId });
    }
}