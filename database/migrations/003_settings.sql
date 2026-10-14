-- Günlük hedef: bugün kaç kart çalışmak istiyorsun (varsayılan 20)
ALTER TABLE Users ADD DailyGoal INT NOT NULL CONSTRAINT DF_Users_DailyGoal DEFAULT 20;