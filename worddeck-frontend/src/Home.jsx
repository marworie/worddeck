// ============================================================
// Home.jsx
// Ana sayfa: seri (streak) ve her seviyenin ilerlemesi.
// Bir seviyenin "Çalış" butonuna basınca o seviyenin oturumu başlar.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

// Seviyelerin kısa açıklamaları
const LEVEL_INFO = {
  A1: 'Başlangıç',
  A2: 'Temel',
  B1: 'Orta',
  B2: 'Orta üstü',
  C1: 'İleri'
}

// onStartStudy: seviye seçilince App'e haber vermek için
function Home({ onStartStudy }) {
  const [progress, setProgress] = useState(null)   // null = yükleniyor

  useEffect(() => {
    apiFetch('/api/Study/progress')
      .then(res => res.ok ? res.json() : null)
      .then(data => setProgress(data))
  }, [])

  if (!progress) {
    return <p className="loading-text">Yükleniyor...</p>
  }

  return (
    <div className="home">
      {/* Selamlama + seri */}
      <div className="home-hero panel">
        <div>
          <h2>Merhaba, {localStorage.getItem('username')}! 👋</h2>
          <p>Bugün hangi seviyeyi çalışmak istersin?</p>
        </div>
        <div className="streak-badge" title="Kaç gündür aralıksız çalışıyorsun">
          <span className="streak-fire">🔥</span>
          <span className="streak-number">{progress.streak}</span>
          <span className="streak-label">gün</span>
        </div>
      </div>

      {/* Seviye kartları */}
      <div className="level-grid">
        {progress.levels.map(lvl => {
          // Çubukta öğrenilenler (koyu) ve öğrenilmekte olanlar (açık) ayrı görünsün
          const learnedPct = (lvl.learned / lvl.total) * 100
          const learningPct = (lvl.learning / lvl.total) * 100

          return (
            <div key={lvl.level} className="level-card panel">
              <div className="level-card-top">
                <span className="level-badge">{lvl.level}</span>
                <span className="level-name">{LEVEL_INFO[lvl.level]}</span>
                {lvl.dueToday > 0 && (
                  <span className="due-badge">{lvl.dueToday} tekrar</span>
                )}
              </div>

              <div className="level-bar">
                <div className="level-bar-learned" style={{ width: `${learnedPct}%` }} />
                <div className="level-bar-learning" style={{ width: `${learningPct}%` }} />
              </div>

              <p className="level-stats">
                <strong>{lvl.learned}</strong> öğrenildi · {lvl.learning} öğreniliyor · {lvl.total} kelime
              </p>

              <button className="btn btn-primary level-study-btn" onClick={() => onStartStudy(lvl.level)}>
                Çalış →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Home