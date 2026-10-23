-- Öğrenme yolu: kullanıcının ünite ilerlemesi
IF OBJECT_ID('dbo.UserUnitProgress') IS NULL
BEGIN
    CREATE TABLE UserUnitProgress (
        UserId      INT NOT NULL,
        Level       NVARCHAR(2) NOT NULL,
        ThemeId     INT NOT NULL REFERENCES Themes(Id),
        Part        INT NOT NULL,                 -- temanın kaçıncı parçası (İş 1, İş 2)
        BestScore   INT NOT NULL DEFAULT 0,
        Attempts    INT NOT NULL DEFAULT 0,
        CompletedAt DATETIME2 NULL,               -- %80'i ilk geçtiği an
        UpdatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        PRIMARY KEY (UserId, Level, ThemeId, Part)
    );
END