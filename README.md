# WordDeck
![CI](https://github.com/marworie/worddeck/actions/workflows/ci.yml/badge.svg)

İngilizce kelime öğrenmek için kart (flashcard) uygulaması. A1–C1 seviyelerinde kelimeler, Leitner kutu sistemiyle aralıklı tekrar.

## Özellikler
- **Kartlarla çalışma:** 4 değerlendirme (Tekrar / Zor / İyi / Kolay), Leitner aralıkları (0, 1, 2, 4, 8, 16, 60 gün)
- **Zor kelimeler:** takılınan kelimeler ayrı listede, farklı günlerde 3 kez doğru bilinince "öğrenildi"
- **Quiz:** seviyeye ya da kendi listene göre çoktan seçmeli test
- **Kelime detayı:** Türkçe anlam (düzenlenebilir), İngilizce tanım, örnek cümle, IPA okunuş, kelime ailesi, eş/zıt anlamlılar, sık kalıplar
- **Telaffuz:** sesli okuma ve mikrofonla söyleme alıştırması
- **Kendi listelerin, defter, istatistikler**, seri (streak) takibi
- **Fonetik rehberi:** IPA sembolleri ve Türkçe karşılıkları
- Açık/koyu tema, telefona yüklenebilir (PWA)

## Teknolojiler
| Katman | |
|---|---|
| Backend | ASP.NET Core 8 Web API, Dapper, SQL Server, JWT |
| Frontend | React, Vite, Chart.js |
| Test | xUnit |

## Kurulum

### Veritabanı
1. SQL Server'da `WordDeckDB` veritabanını oluştur
2. `database/` klasöründeki kurulum scriptini çalıştır
3. `database/migrations/` içindeki dosyaları **sırayla** (001, 002, …) çalıştır

### Backend
```powershell
cd backend
dotnet user-secrets set "JwtSecret" "<en-az-32-karakterlik-gizli-anahtar>"
dotnet user-secrets set "MyMemoryEmail" "<e-posta-adresin>"
dotnet run
```
Bağlantı cümlesi `appsettings.json` içindeki `ConnectionStrings` bölümünde.

### Frontend
```powershell
cd frontend
npm install
npm run dev
```
Uygulama: http://localhost:5174

### Testler
```powershell
dotnet test
```

## Veri kaynakları ve lisanslar
- **CEFR-J Wordlist** (A1–B2): Tono Laboratory, Tokyo University of Foreign Studies.
  *The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies.* — http://www.cefr-j.org/
- **Octanove Vocabulary Profile** (C1): Octanove Labs, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Wiktionary** (tanım, okunuş, kelime ailesi): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Datamuse API** (eş/zıt anlamlılar, kalıplar): https://www.datamuse.com/api/
- **MyMemory** (otomatik çeviri): https://mymemory.translated.net/