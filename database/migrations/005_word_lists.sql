-- Kullanıcının kelime listeleri (favoriler de bir liste, IsFavorites = 1)
CREATE TABLE WordLists (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Name NVARCHAR(60) NOT NULL,
    IsFavorites BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_WordLists_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_WordLists_UserName UNIQUE (UserId, Name)   -- aynı isimde iki liste olmasın
);

-- Filtreli benzersiz indeks: her kullanıcının en fazla BİR favoriler listesi olabilir
CREATE UNIQUE INDEX UX_WordLists_Favorites ON WordLists(UserId) WHERE IsFavorites = 1;

-- Listelerdeki kelimeler
CREATE TABLE WordListItems (
    ListId INT NOT NULL,
    WordId INT NOT NULL,
    AddedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_WordListItems PRIMARY KEY (ListId, WordId),
    CONSTRAINT FK_WordListItems_Lists FOREIGN KEY (ListId) REFERENCES WordLists(Id) ON DELETE CASCADE,
    CONSTRAINT FK_WordListItems_Words FOREIGN KEY (WordId) REFERENCES Words(Id)
);

-- Aramayı hızlandırmak için kelime indeksi
CREATE INDEX IX_Words_Headword ON Words(Headword);