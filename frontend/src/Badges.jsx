// ============================================================
// Badges.jsx
// Rozetler sayfası + yeni kazanılan rozetleri bildirme
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

function Badges() {
  const [badges, setBadges] = useState(null)

  useEffect(() => {
    apiFetch('/api/Badges').then(r => (r.ok ? r.json() : [])).then(setBadges)
  }, [])

  if (!badges) return <div className="panel">Yükleniyor...</div>

  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="page">
      <h2 className="page-title">🏅 Rozetler</h2>
      <p className="muted">{badges.length} rozetten {earnedCount} tanesini kazandın.</p>

      <div className="badge-grid">
        {badges.map(b => (
          <div key={b.id} className={`badge-card panel ${b.earned ? 'earned' : ''}`}>
            <div className="badge-emoji">{b.emoji}</div>
            <b>{b.title}</b>
            <span className="muted small">{b.description}</span>
            {b.earned
              ? <span className="badge-done">✓ Kazanıldı</span>
              : (
                <>
                  <div className="reader-progress"><span style={{ width: `${(b.current / b.target) * 100}%` }} /></div>
                  <span className="muted small">{b.current} / {b.target}</span>
                </>
              )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Badges