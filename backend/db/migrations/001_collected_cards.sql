-- Коллекционные карты пользователя (JSON-массив строковых id "1".."52").
-- Выполните один раз на базе Zoobastiks (MySQL).

ALTER TABLE Users
    ADD COLUMN CollectedCardsJson TEXT NOT NULL DEFAULT '[]'
    AFTER PurchasedLessonsJson;
