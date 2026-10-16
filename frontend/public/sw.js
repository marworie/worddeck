// Service worker: uygulama dosyalarını önbellekte tutar, açılışı hızlandırır.
// /api isteklerine dokunmaz: kelime ve ilerleme verisi her zaman güncel gelsin.
const CACHE = 'worddeck-v1'

self.addEventListener('install', () => self.skipWaiting())

// Yeni sürüm gelince eski önbellekleri sil
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api')) return   // API: her zaman sunucudan

  // Derlenmiş dosyalar (/assets/...) adları her derlemede değiştiği için önbellekten
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, copy))
        return res
      }))
    )
  }
})