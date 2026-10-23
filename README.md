# 📚 WordDeck

A1'den C1'e İngilizce kelime öğrenme uygulaması. Aralıklı tekrar (Leitner) ile kelime kartları, seviye testi, temalar, bölümlü sınavlar, hikaye okuma, cümle kurma ve sıralı bir öğrenme yolu içerir.

Aksan Teknoloji'deki stajım sırasında geliştirildi.

## ✨ Özellikler

**Kelime çalışma**
- 🃏 **Kart çalışma:** Leitner sistemiyle (6 kutu) aralıklı tekrar, Tekrar / Zor / İyi / Kolay değerlendirme, son cevabı geri alma
- 🎯 **Seviye testi:** uyarlanabilir sorularla A1–C1 arası seviye tespiti
- 🔥 **Zorlandıklarım:** yanlış yapılan ve karıştırılan kelimeler için ayrı pratik
- 🗂️ **Temalar:** 12 konu (yemek, seyahat, iş, sağlık...) altında kelime listeleri
- 📒 **Defterim:** kendi kelime listelerin
- 🔍 **Kelime arama**, kelime ailesi ve kelime ağı (eş / zıt anlamlılar, kalıplar)
- 🔤 **Fonetik rehberi**

**Sınav ve ilerleme**
- 📝 **Bölümlü sınav:** Okuma, Dinleme, Yazma, Konuşma bölümleri; seviye, liste ya da temadan
- 🗺️ **Öğrenme yolu:** seviyeye göre sıralı tema üniteleri, ünite sonu testi (%80 ile geçilir), kilitlerin sırayla açılması
- 📊 **İstatistikler:** öğrenilen / bilinen kelimeler, günlük seri

**Okuma ve yazma**
- 📖 **Okuma kitaplığı:** 32 hikaye (A1–B2), kitap görünümünde sayfa çevirme
  - Kelimenin üzerine gelince anlamı (çekimli haller de tanınır: *went → go*)
  - Tıklayınca çalışmaya ekleme
  - Kelime durumlarına göre kullanıcının seçtiği renkler
  - 🔊 Sesli okuma (okunan kelime vurgulanır)
  - 🎤 Okuma kontrolü: kullanıcı okur, doğru ve atlanan kelimeler işaretlenir
- ✍️ **Cümle kurma:** kelimeyle cümle yazılır, kelimenin kullanımı ve dil bilgisi kontrol edilir

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core 8 Web API, Dapper, JWT |
| Veritabanı | SQL Server Express |
| Frontend | React + Vite |
| Test | xUnit |
| Tarayıcı API'leri | Web Speech API (sesli okuma ve ses tanıma) |
| CI | GitHub Actions |

## 📦 Veri kaynakları

| Kaynak | Kullanım |
|---|---|
| [CEFR-J Wordlist](https://www.cefr-j.org/download.html) | A1–B2 kelime listesi ve seviyeleri |
| [Octanove C1/C2 Vocabulary](https://github.com/openlanguageprofiles/olp-en-cefrj) | C1 kelime listesi |
| [Wiktionary](https://en.wiktionary.org) | Tanım, örnek cümle, telaffuz (IPA), kelime ailesi, Türkçe çeviriler |
| [MyMemory](https://mymemory.translated.net) | Wiktionary'de çevirisi olmayan kelimeler için yedek çeviri |
| [Datamuse](https://www.datamuse.com/api/) | Eş / zıt anlamlılar, ilişkili kelimeler, kalıplar |
| [Project Gutenberg](https://www.gutenberg.org) | Telifi bitmiş hikayeler (Wilde, Andersen, Grimm, O. Henry, Poe) |
| [LanguageTool](https://languagetool.org/http-api/) | Cümle kurmada dil bilgisi kontrolü |

A1–A2 seviyesindeki 5 hikaye uygulama için özel olarak yazıldı.

## 🚀 Kurulum

### Gereksinimler
- .NET 8 SDK
- Node.js 20+
- SQL Server Express ve SSMS

### 1. Veritabanı
1. SSMS'te `WordDeckDB` adında bir veritabanı oluştur.
2. `database/migrations/` klasöründeki dosyaları **numara sırasıyla** (001 → 015) çalıştır.
3. `backend/appsettings.json` içindeki bağlantı cümlesini kendi SQL Server'ına göre düzenle.

### 2. Backend
```bash
cd backend
dotnet run
```
API `http://localhost:5002` adresinde açılır. Swagger: `http://localhost:5002/swagger`

İlk çalıştırmada arka plan servisleri kelimelerin tanım ve çevirilerini yavaş yavaş doldurur. MyMemory günlük kotası nedeniyle bu işlem birkaç gün sürebilir.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Uygulama `http://localhost:5174` adresinde açılır.

### 4. Hikayeleri yükleme
Backend açıkken, Swagger'dan giriş yapıp aldığın token ile:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\import-stories.ps1 -Token "..."
powershell -ExecutionPolicy Bypass -File scripts\import-own-stories.ps1 -Token "..."
```

## 🧪 Testler
```bash
dotnet test
```
Saf iş mantığı sınıfları (Leitner, soru üretimi, seviye testi, kelime eşleştirme, hikaye bölme, öğrenme yolu kuralları) birim testleriyle kontrol edilir. Testleri çalıştırmadan önce backend'i durdur, yoksa derleme dosyaları kilitli kalır.

## 📁 Proje yapısı
```
WordDeck/
├── backend/
│   ├── Controllers/     # API uç noktaları
│   ├── Repositories/    # Dapper ile SQL sorguları
│   ├── Services/        # İş kuralları (Leitner, soru üretimi, Lemmatizer...) ve arka plan servisleri
│   └── Dtos/
├── frontend/src/        # React bileşenleri
├── database/migrations/ # SQL betikleri (001–015)
├── scripts/             # Hikaye yükleme betikleri ve özgün hikayeler
└── WordDeck.Tests/      # xUnit testleri
```