-- Türkçede olmayan alfabe: Latin harfleri (boşluk..ſ) ve yazım işaretleri (… ’ – gibi) DIŞINDA bir karakter.
-- NCHAR(9/10/13): sekme ve satır sonu da serbest. BIN2: karakterleri kod numarasıyla karşılaştır
DECLARE @NonLatin NVARCHAR(50) =
    N'%[^' + NCHAR(9) + NCHAR(10) + NCHAR(13) + N' -ſ' + NCHAR(8192) + N'-' + NCHAR(8303) + N']%';

-- 1) ÖNCE BAK
SELECT Id, Headword, TurkishMeaning, DefinitionTr, ExampleTr
FROM Words
WHERE TurkishMeaning COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR DefinitionTr   COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR ExampleTr      COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR TurkishMeaning LIKE '%&#%' OR TurkishMeaning LIKE '%&apos;%' OR TurkishMeaning LIKE '%&quot;%'
   OR DefinitionTr   LIKE '%&#%' OR DefinitionTr   LIKE '%&apos;%'
   OR ExampleTr      LIKE '%&#%' OR ExampleTr      LIKE '%&apos;%'
   OR LEN(TurkishMeaning) > 60;

-- 2) SIFIRLA
UPDATE Words SET TurkishMeaning = NULL, DetailsFetchedAt = NULL
WHERE TurkishMeaning COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR TurkishMeaning LIKE '%&#%' OR TurkishMeaning LIKE '%&apos;%' OR TurkishMeaning LIKE '%&quot;%'
   OR LEN(TurkishMeaning) > 60;

UPDATE Words SET DefinitionTr = NULL, DetailsFetchedAt = NULL
WHERE DefinitionTr COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR DefinitionTr LIKE '%&#%' OR DefinitionTr LIKE '%&apos;%';

UPDATE Words SET ExampleTr = NULL
WHERE ExampleTr COLLATE Latin1_General_BIN2 LIKE @NonLatin
   OR ExampleTr LIKE '%&#%' OR ExampleTr LIKE '%&apos;%';