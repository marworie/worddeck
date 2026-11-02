# 🃏 WordDeck
🌐 Canlı: https://worddeck.runasp.net

A1'den C1'e İngilizce kelime öğrenme uygulaması. Aralıklı tekrar (Leitner) ile kelime kartları, seviye testi, temalar, bölümlü sınavlar, hikaye okuma, dikte, kelime oyunları, rozetler ve sıralı bir öğrenme yolu içerir. Telefona uygulama olarak kurulabilir (PWA).

Aksan Teknoloji'deki stajım sırasında geliştirildi.

## ✨ Özellikler

### Kelime çalışma
- 🃏 **Kart çalışma:** Leitner sistemiyle (6 kutu) aralıklı tekrar, Tekrar / Zor / İyi / Kolay değerlendirme, son cevabı geri alma
- 🎯 **Seviye testi:** uyarlanabilir sorularla A1–C1 arası seviye tespiti
- 🔥 **Zorlandıklarım:** yanlış yapılan ve karıştırılan kelimeler için ayrı pratik
- 🗂️ **Temalar:** 12 konu (yemek, seyahat, iş, sağlık...) altında kelime listeleri
- 📒 **Defterim:** favoriler ve kendi kelime listelerin
- 🔍 **Kelime arama**, kelime ailesi ve kelime ağı (eş / zıt anlamlılar, kalıplar)
- 🔤 **Fonetik rehberi**

### Pratik ve oyunlar
- 🎧 **Dikte:** cümleyi dinle, yaz; cevap kelime kelime kontrol edilir (doğru / yanlış / eksik / fazla)
- ✍️ **Cümle kurma:** kelimeyle cümle yazılır, kelimenin kullanımı ve dil bilgisi kontrol edilir
- 🎮 **5 kelime oyunu:** eşleştirme, hafıza kartları, hızlı karar (60 sn), harf karıştırma, adam asmaca; kendi kelimelerinle ya da seviyeden

### Okuma
- 📖 **Okuma kitaplığı:** 32 hikaye (A1–C1), kitap görünümünde sayfa çevirme
  - Kelimenin üzerine gelince anlamı (çekimli haller de tanınır: *went → go*)
  - Tıklayınca çalışmaya ekleme
  - Kelime durumlarına göre kullanıcının seçtiği renkler
  - 🔊 Sesli okuma (okunan kelime vurgulanır)
  - 🎤 Okuma kontrolü: kullanıcı okur, doğru ve atlanan kelimeler işaretlenir
  - 📝 Hikaye sonu testi: hikayedeki bilinmeyen kelimelerden kısa sınav
- ✍️ **Kendi metnin:** haber, şarkı sözü gibi her metni yapıştırıp aynı okuyucuda oku
- Hikaye seviyeleri, kelimelerin CEFR seviyeleri ve sözlükte olmayan kelime oranına göre otomatik tahmin edilir

### Sınav ve ilerleme
- 📝 **Bölümlü sınav:** Okuma, Dinleme, Yazma, Konuşma bölümleri; seviye, liste ya da temadan
- 🗺️ **Öğrenme yolu:** seviyeye göre sıralı tema üniteleri, ünite sonu testi (%80 ile geçilir), kilitlerin sırayla açılması
- 🏅 **Rozetler:** seri, öğrenilen kelime, bitirilen hikaye ve tamamlanan ünite rozetleri; yeni rozette bildirim
- 📊 **İstatistikler:** öğrenilen / bilinen kelimeler, günlük seri

### Diğer
- 📱 **PWA:** telefonda "Ana ekrana ekle" ile uygulama gibi kurulur
- 🌙 Açık / koyu tema, mobil uyumlu arayüz
- ⚡ Sayfalar ihtiyaç anında yüklenir (lazy loading)

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core 8 Web API, Dapper, JWT |
| Veritabanı | SQL Server Express |
| Frontend | React + Vite, Lenis, Lottie |
| Test | xUnit |
| Tarayıcı API'leri | Web Speech API (sesli okuma ve ses tanıma) |
| CI | GitHub Actions (backend testleri, frontend lint ve build) |

## 📦 Veri kaynakları

| Kaynak | Kullanım |
|---|---|
| CEFR-J Wordlist | A1–B2 kelime listesi ve seviyeleri |
| Octanove C1/C2 Vocabulary | C1 kelime listesi |
| Wiktionary | Tanım, örnek cümle, telaffuz (IPA), kelime ailesi, Türkçe çeviriler |
| MyMemory | Wiktionary'de çevirisi olmayan kelimeler için yedek çeviri |
| Datamuse | Eş / zıt anlamlılar, ilişkili kelimeler, kalıplar |
| Project Gutenberg | Telifi bitmiş hikayeler (Wilde, Andersen, Grimm, O. Henry, Poe) |
| LanguageTool | Cümle kurmada dil bilgisi kontrolü |

A1–A2 seviyesindeki 5 hikaye uygulama için özel olarak yazıldı.

## 🚀 Kurulum

### Gereksinimler
- .NET 8 SDK
- Node.js 20+
- SQL Server Express ve SSMS

### 1. Veritabanı
1. SSMS'te `WordDeckDB` adında bir veritabanı oluştur.
2. `database/migrations/` klasöründeki dosyaları numara sırasıyla (001 → 015) çalıştır.
3. Bağlantı cümlesini `backend/appsettings.json`'da ya da user-secrets ile ayarla.

### 2. Backend
```
cd backend
dotnet run
```
API `http://localhost:5002` adresinde açılır. Swagger: `http://localhost:5002/swagger`

İlk çalıştırmada arka plan servisleri kelimelerin tanım ve çevirilerini yavaş yavaş doldurur. MyMemory günlük kotası nedeniyle bu işlem birkaç gün sürebilir.

### 3. Frontend
```
cd frontend
npm install
npm run dev
```
Uygulama `http://localhost:5174` adresinde açılır.

### 4. Hikayeleri yükleme
Hikaye ekleme sadece `appsettings.json`'daki `AdminUser` kullanıcısına açıktır. O kullanıcıyla giriş yapıp aldığın token ile:
```
powershell -ExecutionPolicy Bypass -File scripts\import-own-stories.ps1 -Token "..."
```
Project Gutenberg hikayeleri `POST /api/Stories/import` ile (Gutenberg kitap numarası ve hikaye başlığı verilerek) eklenir.

### Canlı ortam
Frontend derlenip (`npm run build`) `backend/wwwroot` klasörüne kopyalanır, backend tek uygulama olarak yayınlanır. Gerekli ortam değişkenleri: `ConnectionStrings__WordDeckDB`, `JwtSecret` (en az 32 karakter), `MyMemoryEmail`. Mikrofon, sesli okuma ve PWA için **HTTPS** gereklidir.

## 🧪 Testler
```
dotnet test
```
Saf iş mantığı sınıfları (Leitner, soru üretimi, seviye testi, kelime eşleştirme, hikaye bölme ve seviye tahmini, öğrenme yolu, dikte karşılaştırma, oyun kelimeleri, rozet ve seri hesabı) birim testleriyle kontrol edilir. Testleri çalıştırmadan önce backend'i durdur, yoksa derleme dosyaları kilitli kalır.

## 📁 Proje yapısı
```
WordDeck/
├── backend/
│   ├── Controllers/     # API uç noktaları
│   ├── Repositories/    # Dapper ile SQL sorguları
│   ├── Services/        # İş kuralları (Leitner, Lemmatizer, StoryRules, DictationRules...) ve arka plan servisleri
│   └── Dtos/
├── frontend/src/        # React bileşenleri
├── database/migrations/ # SQL betikleri (001–015)
├── scripts/             # Özgün hikayeler ve yükleme betiği
└── WordDeck.Tests/      # xUnit testleri
```
