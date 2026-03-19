-- Zoobastiks MySQL Schema
-- База: s238_Zwebsite
-- Выполнить один раз через phpMyAdmin или mysql CLI

SET NAMES utf8mb4;

-- ── Пользователи ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Users (
    Uid                   VARCHAR(64)   NOT NULL,
    Username              VARCHAR(100)  NOT NULL,
    DisplayName           VARCHAR(100)  NOT NULL,
    PasswordHash          VARCHAR(256)  NOT NULL,
    Email                 VARCHAR(255)  NOT NULL DEFAULT '',
    PhotoURL              VARCHAR(500)  NOT NULL DEFAULT '',
    AvatarIndex           INT           NOT NULL DEFAULT 0,
    Bio                   TEXT,
    Balance               INT           NOT NULL DEFAULT 50,
    CreatedAt             BIGINT        NOT NULL,
    LastLogin             BIGINT        NOT NULL,
    IsAdmin               TINYINT(1)    NOT NULL DEFAULT 0,
    Ip                    VARCHAR(50)   NULL,
    Country               VARCHAR(100)  NULL,
    City                  VARCHAR(100)  NULL,
    PurchasedLessonsJson  LONGTEXT,
    TotalSessions         INT           NOT NULL DEFAULT 0,
    TotalTime             BIGINT        NOT NULL DEFAULT 0,
    BestSpeed             INT           NOT NULL DEFAULT 0,
    AverageAccuracy       INT           NOT NULL DEFAULT 0,
    CompletedLessonsCount INT           NOT NULL DEFAULT 0,
    TotalErrors           INT           NOT NULL DEFAULT 0,
    RecentSessionsJson    LONGTEXT,
    PRIMARY KEY (Uid),
    UNIQUE KEY UQ_Users_Username (Username),
    INDEX IX_Users_Username (Username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Сессии пользователей ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS UserSessions (
    Id          BIGINT       NOT NULL AUTO_INCREMENT,
    UserId      VARCHAR(64)  NOT NULL,
    Speed       INT          NOT NULL DEFAULT 0,
    Accuracy    INT          NOT NULL DEFAULT 0,
    TimeSeconds INT          NOT NULL DEFAULT 0,
    Errors      INT          NOT NULL DEFAULT 0,
    Mode        VARCHAR(50)  NULL,
    Layout      VARCHAR(10)  NULL,
    LessonKey   VARCHAR(128) NULL,
    Timestamp   BIGINT       NOT NULL,
    PRIMARY KEY (Id),
    INDEX IX_UserSessions_UserId (UserId),
    CONSTRAINT FK_UserSessions_UserId
        FOREIGN KEY (UserId) REFERENCES Users(Uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
