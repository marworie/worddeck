# WordDeck'in kendi A1-A2 hikayelerini (scripts/stories/*.txt) ekler
# Kullanim: powershell -ExecutionPolicy Bypass -File scripts\import-own-stories.ps1 -Token "..."
param([Parameter(Mandatory = $true)][string]$Token)

$headers = @{ Authorization = "Bearer $Token" }
function E($cp) { [char]::ConvertFromUtf32($cp) }
$folder = Join-Path $PSScriptRoot "stories"

$list = @(
  @{ file="a1-tom-and-the-little-cat.txt"; title="Tom and the Little Cat";  level="A1"; emoji=(E 0x1F431); color="#64748b" },
  @{ file="a1-a-busy-saturday.txt";        title="A Busy Saturday";         level="A1"; emoji=(E 0x1F382); color="#f59e0b" },
  @{ file="a2-the-lost-phone.txt";         title="The Lost Phone";          level="A2"; emoji=(E 0x1F4F1); color="#2563eb" },
  @{ file="a2-the-snow-holiday.txt";       title="The Snow Holiday";        level="A2"; emoji=(E 0x26F7);  color="#0ea5e9" },
  @{ file="a2-emmas-first-day.txt";        title="Emma's First Day";        level="A2"; emoji=(E 0x1F4BC); color="#10b981" }
)

Write-Host "$($list.Count) hikaye eklenecek..."

foreach ($s in $list) {
  try {
    $text = [System.IO.File]::ReadAllText((Join-Path $folder $s.file), [System.Text.Encoding]::UTF8)
    $req = @{ title=$s.title; author="WordDeck"; level=$s.level; emoji=$s.emoji; color=$s.color; text=$text }
    $body = [System.Text.Encoding]::UTF8.GetBytes(($req | ConvertTo-Json))
    $r = Invoke-RestMethod -Uri "http://localhost:5002/api/Stories/import" -Method Post `
         -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
    Write-Host "$($s.title): $($r.level), $($r.pageCount) sayfa, $($r.wordCount) kelime" -ForegroundColor Green
  } catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      $msg = (New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    }
    Write-Host "$($s.title): $msg" -ForegroundColor Red
  }
}
