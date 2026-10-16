-- Seviye belirleme testinin sonucu
IF COL_LENGTH('Users', 'PlacementLevel') IS NULL
    ALTER TABLE Users ADD PlacementLevel NVARCHAR(2) NULL,
                          PlacementTakenAt DATETIME2 NULL;