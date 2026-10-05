CREATE DATABASE WordDeckDB;
GO
USE WordDeckDB;
GO

-- Kullanıcılar
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(30) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(200) NOT NULL,
    DailyNewWords INT NOT NULL DEFAULT 10,        -- ayarlardan seçilen "oturum başına yeni kelime"
    CreatedDate DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- Kelime listesi (herkes için ortak)
CREATE TABLE Words (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Headword NVARCHAR(100) NOT NULL,              -- kelimenin kendisi
    PartOfSpeech NVARCHAR(30) NOT NULL,           -- noun, verb, adjective...
    Level CHAR(2) NOT NULL CHECK (Level IN ('A1','A2','B1','B2','C1')),
    TurkishMeaning NVARCHAR(300) NULL,            -- ilk açılışta çeviri API'sinden doldurulacak
    Definition NVARCHAR(1000) NULL,               -- ilk açılışta sözlük API'sinden
    Example NVARCHAR(1000) NULL,
    DetailsFetchedAt DATETIME2 NULL,              -- bilgiler çekildi mi, ne zaman
    CONSTRAINT UQ_Words_Headword_Pos UNIQUE (Headword, PartOfSpeech)
);

-- Hangi kullanıcı hangi kelimeyi hangi kutuda tutuyor (Leitner)
CREATE TABLE UserWords (
    UserId INT NOT NULL,
    WordId INT NOT NULL,
    Box TINYINT NOT NULL DEFAULT 1 CHECK (Box BETWEEN 1 AND 6),  -- 6 = öğrenildi
    NextReviewDate DATE NOT NULL,
    LastReviewedAt DATETIME2 NULL,
    CorrectCount INT NOT NULL DEFAULT 0,
    WrongCount INT NOT NULL DEFAULT 0,
    CustomMeaning NVARCHAR(300) NULL,             -- kullanıcının düzelttiği Türkçe anlam (sadece kendisi görür)
    CONSTRAINT PK_UserWords PRIMARY KEY (UserId, WordId),
    CONSTRAINT FK_UserWords_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UserWords_Words FOREIGN KEY (WordId) REFERENCES Words(Id)
);

-- Seri (streak) hesabı için: hangi gün çalışıldı
CREATE TABLE StudyDays (
    UserId INT NOT NULL,
    StudyDate DATE NOT NULL,
    CardsReviewed INT NOT NULL DEFAULT 0,
    CONSTRAINT PK_StudyDays PRIMARY KEY (UserId, StudyDate),
    CONSTRAINT FK_StudyDays_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- "Bugün tekrar zamanı gelen kartlar" sorgusu hızlı olsun
CREATE INDEX IX_UserWords_Review ON UserWords(UserId, NextReviewDate);