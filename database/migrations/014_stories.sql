-- Okuma hikayeleri ve kullanıcının kaldığı sayfa
IF OBJECT_ID('dbo.Stories') IS NULL
BEGIN
    CREATE TABLE Stories (
        Id         INT IDENTITY PRIMARY KEY,
        Title      NVARCHAR(200) NOT NULL UNIQUE,
        Author     NVARCHAR(100) NOT NULL,
        Level      NVARCHAR(2)   NOT NULL,
        Emoji      NVARCHAR(10)  NOT NULL DEFAULT N'📖',
        Color      NVARCHAR(20)  NOT NULL DEFAULT '#4f46e5',
        CoverUrl   NVARCHAR(500) NULL,
        Body       NVARCHAR(MAX) NOT NULL,
        WordCount  INT NOT NULL,
        PageCount  INT NOT NULL,
        Source     NVARCHAR(200) NULL,
        CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END

IF OBJECT_ID('dbo.UserStoryProgress') IS NULL
BEGIN
    CREATE TABLE UserStoryProgress (
        UserId    INT NOT NULL,
        StoryId   INT NOT NULL REFERENCES Stories(Id),
        Page      INT NOT NULL DEFAULT 0,
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        PRIMARY KEY (UserId, StoryId)
    );
END