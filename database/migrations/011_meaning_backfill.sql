-- Türkçe anlamı arka planda denenmiş kelimeler (çeviri çöp çıkıp kaydedilmese de tekrar sorulmasın)
IF COL_LENGTH('Words', 'MeaningFetchedAt') IS NULL
    ALTER TABLE Words ADD MeaningFetchedAt DATETIME2 NULL;