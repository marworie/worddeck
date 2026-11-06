-- Kullanıcının her kitapta kendi işaretlediği kelimeler (bilmiyorum / az biliyorum)
CREATE TABLE UserStoryWords (
    UserId    INT NOT NULL REFERENCES Users(Id),
    StoryId   INT NOT NULL REFERENCES Stories(Id) ON DELETE CASCADE,
    WordId    INT NOT NULL REFERENCES Words(Id),
    Mark      VARCHAR(10) NOT NULL CHECK (Mark IN ('unknown', 'shaky')),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (UserId, StoryId, WordId)
);