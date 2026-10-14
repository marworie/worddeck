ALTER TABLE Words ADD
    ExampleTr NVARCHAR(1000) NULL,   -- örnek cümlenin Türkçesi
    Phonetic NVARCHAR(100) NULL;     -- fonetik (IPA). '' = arandı ama bulunamadı