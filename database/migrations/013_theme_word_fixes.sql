-- Temadaki kelimeyi aynı yazılışın doğru türüyle değiştir (key: sıfat → isim, fry: isim → fiil)
DECLARE @Fix TABLE (Slug VARCHAR(30), Headword NVARCHAR(100), Pos NVARCHAR(30));
INSERT INTO @Fix VALUES
    ('home', 'key', 'noun'),
    ('food', 'fry', 'verb');

UPDATE tw SET WordId = nw.Id
FROM ThemeWords tw
INNER JOIN Themes t ON t.Id = tw.ThemeId
INNER JOIN Words ow ON ow.Id = tw.WordId
INNER JOIN @Fix f ON f.Slug = t.Slug AND f.Headword = ow.Headword
INNER JOIN Words nw ON nw.Headword = f.Headword AND nw.PartOfSpeech = f.Pos;