-- Sınav sonuçları (ana sayfadaki "son sınavların" için)
CREATE TABLE QuizResults (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Level CHAR(2) NOT NULL,
    TotalQuestions INT NOT NULL,
    CorrectAnswers INT NOT NULL,
    DurationSeconds INT NOT NULL,
    TakenAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_QuizResults_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE INDEX IX_QuizResults_User ON QuizResults(UserId, TakenAt DESC);