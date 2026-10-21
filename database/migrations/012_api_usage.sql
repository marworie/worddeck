-- Dış API'lerin günlük kullanımı (kota takibi). Uygulama yeniden başlasa da sayaç kaybolmasın
IF OBJECT_ID('ApiUsage') IS NULL
    CREATE TABLE ApiUsage (
        Service VARCHAR(30) NOT NULL,      -- 'MyMemory'
        UsageDate DATE NOT NULL,
        Chars INT NOT NULL DEFAULT 0,
        CONSTRAINT PK_ApiUsage PRIMARY KEY (Service, UsageDate)   -- her servis için günde tek satır
    );