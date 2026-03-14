-- Zoobastiks MSSQL Schema
-- Выполнить один раз на базе db_ac6b20_zoobastiks

-- Пользователи
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Uid NVARCHAR(64) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL UNIQUE,
        DisplayName NVARCHAR(100) NOT NULL,
        PasswordHash NVARCHAR(256) NOT NULL,
        Email NVARCHAR(255) NOT NULL DEFAULT '',
        PhotoURL NVARCHAR(500) NOT NULL DEFAULT '',
        AvatarIndex INT NOT NULL DEFAULT 0,
        Bio NVARCHAR(MAX) NOT NULL DEFAULT '',
        Balance INT NOT NULL DEFAULT 50,
        CreatedAt BIGINT NOT NULL,
        LastLogin BIGINT NOT NULL,
        IsAdmin BIT NOT NULL DEFAULT 0,
        Ip NVARCHAR(50) NULL,
        Country NVARCHAR(100) NULL,
        City NVARCHAR(100) NULL,
        PurchasedLessonsJson NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        TotalSessions INT NOT NULL DEFAULT 0,
        TotalTime BIGINT NOT NULL DEFAULT 0,
        BestSpeed INT NOT NULL DEFAULT 0,
        AverageAccuracy INT NOT NULL DEFAULT 0,
        CompletedLessonsCount INT NOT NULL DEFAULT 0,
        TotalErrors INT NOT NULL DEFAULT 0,
        RecentSessionsJson NVARCHAR(MAX) NOT NULL DEFAULT '[]'
    );
    CREATE INDEX IX_Users_Username ON Users(Username);
END
GO

-- Сессии пользователей (история для статистики)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserSessions')
BEGIN
    CREATE TABLE UserSessions (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId NVARCHAR(64) NOT NULL,
        Speed INT NOT NULL DEFAULT 0,
        Accuracy INT NOT NULL DEFAULT 0,
        TimeSeconds INT NOT NULL DEFAULT 0,
        Errors INT NOT NULL DEFAULT 0,
        Mode NVARCHAR(50) NULL,
        Layout NVARCHAR(10) NULL,
        LessonKey NVARCHAR(128) NULL,
        Timestamp BIGINT NOT NULL,
        CONSTRAINT FK_UserSessions_UserId FOREIGN KEY (UserId) REFERENCES Users(Uid) ON DELETE CASCADE
    );
    CREATE INDEX IX_UserSessions_UserId ON UserSessions(UserId);
END
GO
