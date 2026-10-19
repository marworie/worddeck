using WordDeck.Services;

namespace WordDeck.Tests
{
    public class QuizSectionBuilderTests
    {
        private static WordInfo Word(int id, string headword, string? tr = null, string? ex = null) =>
            new(id, headword, "noun", tr, null, ex);

        private static readonly List<WordInfo> Pool = new()
        {
            Word(2, "dog", "köpek"), Word(3, "bird", "kuş"), Word(4, "fish", "balık"), Word(5, "horse", "at")
        };

        [Fact]
        public void AssignSections_TenQuestions_SplitsEvenlyInOrder()
        {
            var s = QuizSectionBuilder.AssignSections(10);

            Assert.Equal(3, s.Count(x => x == QuizSections.Reading));
            Assert.Equal(3, s.Count(x => x == QuizSections.Listening));
            Assert.Equal(2, s.Count(x => x == QuizSections.Writing));
            Assert.Equal(2, s.Count(x => x == QuizSections.Speaking));
            Assert.Equal(QuizSections.Reading, s.First());
            Assert.Equal(QuizSections.Speaking, s.Last());
        }

        [Fact]
        public void Writing_WithExample_IsClozeTyping()
        {
            var q = QuizSectionBuilder.Build(QuizSections.Writing, Word(1, "cat", "kedi", "The cat is sleeping."), Pool, new Random(1))!;

            Assert.Equal(QuestionTypes.Cloze, q.QuestionType);
            Assert.Contains("_____", q.Prompt);
            Assert.Equal("kedi", q.Hint);
        }

        [Fact]
        public void Speaking_GiveawayMeaningAndNoExample_ReturnsNull()
        {
            // "drama" ↔ "dram": anlam cevabı ele veriyor, cümle de yok
            Assert.Null(QuizSectionBuilder.Build(QuizSections.Speaking, Word(1, "drama", "dram"), Pool, new Random(1)));
        }

        [Fact]
        public void Listening_OptionsIncludeAnswerAndAudioIsSentence()
        {
            var q = QuizSectionBuilder.Build(QuizSections.Listening, Word(1, "cat", ex: "The cat is sleeping."), Pool, new Random(1))!;

            Assert.Equal(4, q.Options!.Count);
            Assert.Contains(q.Options, o => o.Id == 1);
            Assert.Equal("The cat is sleeping.", q.Audio);
        }

        [Fact]
        public void BuildWithFallback_FallsBackWhenSectionImpossible()
        {
            // Konuşma için anlam/cümle yok ama dinleme kurulabilir
            var q = QuizSectionBuilder.BuildWithFallback(QuizSections.Speaking, Word(1, "cat"), Pool, new Random(1));

            Assert.NotNull(q);
            Assert.NotEqual(QuizSections.Speaking, q!.Section);
        }
    }
}