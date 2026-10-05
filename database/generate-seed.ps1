# ============================================================
# generate-seed.ps1
# CEFR-J (A1–B2) ve Octanove (C1) kelime listelerini okuyup
# Words tablosuna ekleyecek seed-words.sql dosyasını üretir.
# Listeler güncellenirse tekrar çalıştırılabilir.
# ============================================================
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot   # bu betiğin bulunduğu klasör (database)

# Listeleri oku, sadece istediğimiz seviyeleri al
$cefrj = Import-Csv "$root\wordlists\cefrj.csv" | Where-Object { $_.CEFR -in 'A1', 'A2', 'B1', 'B2' }
$octa  = Import-Csv "$root\wordlists\octanove.csv" | Where-Object { $_.CEFR -eq 'C1' }

$seen = @{}   # aynı kelime+tür iki kez eklenmesin
$rows = New-Object System.Collections.Generic.List[string]

foreach ($w in @($cefrj) + @($octa)) {
    # "a.m./A.M./am/AM" gibi çoklu yazımlarda ilkini al
    $headword = ($w.headword -split '/')[0].Trim()
    $pos = $w.pos.Trim()
    if (-not $headword -or -not $pos) { continue }

    # Büyük/küçük harf farkını yok sayarak tekrarları atla
    $key = "$($headword.ToLower())|$($pos.ToLower())"
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true

    # SQL'de tek tırnak kaçırılır: o'clock → o''clock
    $h = $headword.Replace("'", "''")
    $p = $pos.Replace("'", "''")
    $rows.Add("(N'$h', N'$p', '$($w.CEFR)')")
}

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("-- Otomatik üretildi: generate-seed.ps1 (elle düzenleme)")
[void]$sb.AppendLine("-- Kaynak: CEFR-J Wordlist 1.5 (Tono Lab, TUFS) ve Octanove Vocabulary Profile C1 (CC BY-SA 4.0)")
[void]$sb.AppendLine("SET NOCOUNT ON;")
# Tablo doluysa tekrar eklemeye çalışma (iki kez çalıştırılırsa hata vermesin)
[void]$sb.AppendLine("IF EXISTS (SELECT 1 FROM Words) BEGIN PRINT 'Words tablosu zaten dolu, atlandı.'; RETURN; END")

# SQL Server tek INSERT'te en fazla 1000 satır kabul ediyor, 1000'erli gruplara böl
for ($i = 0; $i -lt $rows.Count; $i += 1000) {
    $batch = $rows.GetRange($i, [Math]::Min(1000, $rows.Count - $i))
    [void]$sb.AppendLine("INSERT INTO Words (Headword, PartOfSpeech, Level) VALUES")
    [void]$sb.AppendLine(($batch -join ",`n") + ";")
}

# Türkçe karakterler bozulmasın diye UTF-8 olarak kaydet
[System.IO.File]::WriteAllText("$root\seed-words.sql", $sb.ToString(), [System.Text.UTF8Encoding]::new($true))
Write-Host "$($rows.Count) kelime yazıldı -> database\seed-words.sql" -ForegroundColor Green