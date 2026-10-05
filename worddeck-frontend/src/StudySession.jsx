// ============================================================
// StudySession.jsx
// Bir seviyenin çalışma oturumu: kartlar sırayla gelir,
// kullanıcı çevirip "Biliyorum / Bilmiyorum" der, cevap backend'e kaydedilir.
// Klavye: Boşluk = çevir, ← = bilmiyorum, → = biliyorum
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import Flashcard from './Flashcard'

// level: çalışılan seviye, onExit: ana sayfaya dönmek için
function StudySession({ level, onExit }) {
  const [cards, setCards] = useState(null)   // null = yükleniyor
  const [index, setIndex] = useState(0)      // şu anki kartın sırası
  const [flipped, setFlipped] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)
  const [stats, setStats] = useState({ known: 0, unknown: 0 })

  // Oturumu yükle (yeniden başlatmak için de kullanılıyor)
  function loadSession() {
    setCards(null)
    setIndex(0)
    setFlipped(false)
    setStats({ known: 0, unknown: 0 })

    apiFetch(`/api/Study/session?level=${level}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCards(data))
  }

  useEffect(loadSession, [level])

  const card = cards?.[index]
  const isFinished = cards && index >= cards.length

  // Oturum yüklenince tüm kartların detaylarını arka planda sırayla çek.
  // Kullanıcı ilk kartlarla uğraşırken sonrakiler veritabanına kaydedilmiş olur.
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

  async function answer(known) {
    if (!card || isAnswering) return
    setIsAnswering(true)

    const response = await apiFetch('/api/Study/answer', {
      method: 'POST',
      body: JSON.stringify({ wordId: card.wordId, known })
    })

    if (response.ok) {
      setStats(prev => known
        ? { ...prev, known: prev.known + 1 }
        : { ...prev, unknown: prev.unknown + 1 })
      setFlipped(false)
      setIndex(prev => prev + 1)
    }
    setIsAnswering(false)
  }

  // Klavye kısayolları
  useEffect(() => {
    function onKeyDown(e) {
      if (!card) return
      if (e.code === 'Space') {
        e.preventDefault()           // sayfa aşağı kaymasın
        setFlipped(f => !f)
      }
      if (flipped && e.key === 'ArrowRight') answer(true)
      if (flipped && e.key === 'ArrowLeft') answer(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })   // bağımlılık dizisi yok: her render'da güncel card/flipped ile yeniden bağlansın

  // ===== Yükleniyor =====
  if (!cards) return <p className="loading-text">Kartlar hazırlanıyor...</p>

  // ===== Bu seviyede bugün kart yok =====
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
        <span className="session-counter">{index + 1} / {cards.length}</span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="session-progress">
        <div className="session-progress-fill" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>

      {/* key: her yeni kartta bileşen sıfırdan oluşsun, dönme animasyonu önceki karttan kalmasın */}
      <Flashcard key={card.wordId} card={card} flipped={flipped} onFlip={() => setFlipped(f => !f)} />

      {/* Cevap butonları: kart çevrilince görünür */}
      <div className={`answer-buttons ${flipped ? 'visible' : ''}`}>
        <button className="btn answer-btn unknown" onClick={() => answer(false)} disabled={isAnswering}>
          😕 Bilmiyorum
        </button>
        <button className="btn answer-btn known" onClick={() => answer(true)} disabled={isAnswering}>
          🙂 Biliyorum
        </button>
      </div>

      <p className="keyboard-hint">⌨️ Boşluk: çevir · ←: bilmiyorum · →: biliyorum</p>
    </div>
  )
}

export default StudySession