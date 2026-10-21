// ============================================================
// StudySession.jsx
// Bir seviyenin çalışma oturumu: kartlar sırayla gelir, kullanıcı çevirip
// 4 seçenekten biriyle değerlendirir, cevap backend'e kaydedilir.
// Son cevap geri alınabilir (yanlışlıkla basılırsa).
// Klavye: Boşluk = çevir, 1–4 = değerlendir, ← bilmiyorum, → biliyorum, Backspace / Ctrl+Z = geri al
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import Flashcard from './Flashcard'

// Değerlendirme butonları. Aralıklar backend'deki LeitnerService ile aynı:
// orada değişirse burayı da güncellemek gerekir
const INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 60]

const RATINGS = [
  { value: 0, label: 'Bilmiyorum', emoji: '😕', className: 'again', key: '1' },
  { value: 1, label: 'Zor hatırladım', emoji: '😬', className: 'hard', key: '2' },
  { value: 2, label: 'Biliyorum', emoji: '🙂', className: 'good', key: '3' },
  { value: 3, label: 'Çok kolay', emoji: '😎', className: 'easy', key: '4' }
]

// Bu değerlendirmeyle kart kaç gün sonra tekrar gelir (butonun altında göstermek için)
function previewDays(box, rating) {
  const current = box ?? 1
  const next = rating === 0 ? 1
    : rating === 1 ? current
    : Math.min(current + (rating === 2 ? 1 : 2), 6)
  const days = INTERVAL_DAYS[next]
  return days === 1 ? 'yarın' : `${days} gün`
}

// level: çalışılan seviye, onExit: ana sayfaya dönmek için
function StudySession({ level, onExit }) {
  const [cards, setCards] = useState(null)   // null = yükleniyor
  const [index, setIndex] = useState(0)      // şu anki kartın sırası
  const [flipped, setFlipped] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)
  const [stats, setStats] = useState({ known: 0, unknown: 0 })
  const [lastRating, setLastRating] = useState(null)   // son verilen cevap: geri alınabilsin diye (null = yok)

  // Oturumu yükle (yeniden başlatmak için de kullanılıyor)
  function loadSession() {
    setCards(null)
    setIndex(0)
    setFlipped(false)
    setStats({ known: 0, unknown: 0 })
    setLastRating(null)

    apiFetch(`/api/Study/session?level=${level}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCards(data))
  }

  useEffect(loadSession, [level])

  const card = cards?.[index]
  const isFinished = cards && index >= cards.length

  // Oturum yüklenince tüm kartların detaylarını arka planda sırasıyla çek
  // Kullanıcı ilk kartlarla uğraşırken sonrakiler veritabanına kaydedilmiş olur
  useEffect(() => {
    if (!cards || cards.length === 0) return
    let cancelled = false   // oturumdan çıkılırsa yarıda kes

    async function prefetchAll() {
      for (const c of cards.slice(1)) {   // ilk kartı Flashcard zaten kendisi çekiyor
        if (cancelled) break
        await apiFetch(`/api/Words/${c.wordId}/details`).catch(() => {})
      }
    }

    prefetchAll()
    return () => { cancelled = true }
  }, [cards])

  async function answer(rating) {
    if (!card || isAnswering) return
    setIsAnswering(true)

    const response = await apiFetch('/api/Study/answer', {
      method: 'POST',
      body: JSON.stringify({ wordId: card.wordId, rating })
    })

    if (response.ok) {
      const known = rating > 0   // sadece "Bilmiyorum" yanlış sayılır
      setStats(prev => known
        ? { ...prev, known: prev.known + 1 }
        : { ...prev, unknown: prev.unknown + 1 })
      setLastRating(rating)
      setFlipped(false)
      setIndex(prev => prev + 1)
    }
    setIsAnswering(false)
  }

  // ↶ Son cevabı geri al: sunucuda kart eski haline döner, ekranda önceki kart arka yüzüyle gelir
  async function undo() {
    if (lastRating === null || isAnswering) return
    setIsAnswering(true)

    const response = await apiFetch('/api/Study/undo', { method: 'POST' })
    if (response.ok) {
      const wasKnown = lastRating > 0
      setStats(prev => wasKnown
        ? { ...prev, known: prev.known - 1 }
        : { ...prev, unknown: prev.unknown - 1 })
      setIndex(prev => prev - 1)
      setFlipped(true)
      setLastRating(null)   // sadece son cevap geri alınabilir
    }
    setIsAnswering(false)
  }

  // Klavye kısayolları
  useEffect(() => {
    function onKeyDown(e) {
      // Bir kutuya yazı yazılıyorsa (anlam düzeltme) kısayolları devre dışı bırak
      if (e.target.tagName === 'INPUT') return

      // Backspace ya da Ctrl+Z: son cevabı geri al (oturum bitmiş olsa da çalışsın)
      if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key === 'z')) {
        e.preventDefault()
        undo()
        return
      }

      if (!card) return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped(f => !f)
      }
      // 1-4 tuşları değerlendirme; ← bilmiyorum, → biliyorum kısayolları da kalsın
      const byKey = RATINGS.find(r => r.key === e.key)
      if (flipped && byKey) answer(byKey.value)
      if (flipped && e.key === 'ArrowRight') answer(2)
      if (flipped && e.key === 'ArrowLeft') answer(0)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })   // bağımlılık dizisi yok: her render'da güncel card/flipped ile yeniden bağlansın

  // Yükleniyor
  if (!cards) return <p className="loading-text">Kartlar hazırlanıyor...</p>

  // Bu seviyede bugün kart yok
  if (cards.length === 0) {
    return (
      <div className="panel session-end">
        <h2>🎉 Bugünlük bu kadar!</h2>
        <p>{level} seviyesinde şu an tekrar edilecek ya da yeni kelime yok.</p>
        <button className="btn btn-primary" onClick={onExit}>Ana sayfaya dön</button>
      </div>
    )
  }

  // ===== Oturum bitti: özet =====
  if (isFinished) {
    const total = stats.known + stats.unknown
    const percent = Math.round((stats.known / total) * 100)
    return (
      <div className="panel session-end">
        <h2>{percent >= 80 ? '🏆 Harika!' : percent >= 50 ? '👏 İyi gidiyorsun!' : '💪 Devam!'}</h2>
        <p className="session-score">{stats.known} / {total} biliyordun (%{percent})</p>
        <p className="session-note">Bilemediklerin yarın tekrar karşına çıkacak.</p>
        <div className="session-end-buttons">
          {lastRating !== null && (
            <button className="btn btn-ghost" onClick={undo}>↶ Son cevabı geri al</button>
          )}
          <button className="btn btn-secondary" onClick={onExit}>Ana sayfa</button>
          <button className="btn btn-primary" onClick={loadSession}>Biraz daha çalış</button>
        </div>
      </div>
    )
  }

  // ===== Oturum sürüyor =====
  return (
    <div className="session">
      <div className="session-top">
        <button className="btn btn-ghost" onClick={onExit}>← Çık</button>
        {lastRating !== null && (
          <button className="btn btn-ghost undo-btn" onClick={undo} disabled={isAnswering} title="Son cevabı geri al (Backspace)">
            ↶ Geri al
          </button>
        )}
        <span className="session-counter">{index + 1} / {cards.length}</span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="session-progress">
        <div className="session-progress-fill" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      {/* key: her yeni kartta bileşen sıfırdan oluşsun, dönme animasyonu önceki karttan kalmasın */}
      <Flashcard key={card.wordId} card={card} flipped={flipped} onFlip={() => setFlipped(f => !f)} />

      {/* Değerlendirme butonları: kart çevrilince görünür */}
      <div className={`answer-buttons ${flipped ? 'visible' : ''}`}>
        {RATINGS.map(r => (
          <button
            key={r.value}
            className={`btn answer-btn ${r.className}`}
            onClick={() => answer(r.value)}
            disabled={isAnswering}
          >
            <span>{r.emoji} {r.label}</span>
            <small>{previewDays(card.box, r.value)}</small>
          </button>
        ))}
      </div>

      <p className="keyboard-hint">⌨️ Boşluk: çevir · 1–4: değerlendir · Backspace: geri al</p>
    </div>
  )
}

export default StudySession