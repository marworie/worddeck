// ============================================================
// ContinueCards.jsx
// Ana sayfadaki "kaldığın yerden devam et" kartları:
// en son okunan hikaye ve öğrenme yolundaki sıradaki ünite.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

function pathLevel() {
  try { return localStorage.getItem('pathLevel') || 'A1' } catch { return 'A1' }
}

function ContinueCards({ onOpenStory, onNavigate }) {
  const [stories, setStories] = useState(null)
  const [path, setPath] = useState(null)
  const [level] = useState(pathLevel)

  useEffect(() => {
    apiFetch('/api/Stories').then(r => (r.ok ? r.json() : [])).then(setStories)
    apiFetch(`/api/Path/${level}`).then(r => (r.ok ? r.json() : null)).then(setPath)
  }, [level])

  if (!stories || !path) return null

  // Başlanmış ama bitmemiş hikayelerden en son okunanı
  const reading = stories
    .filter(s => s.page != null && s.page + 1 < s.pageCount)
    .sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt))[0]
  const unit = path.units.find(u => u.status === 'current')

  return (
    <div className="continue-grid">
      {reading ? (
        <button className="panel continue-card" onClick={() => onOpenStory(reading.id)}>
          <span className="continue-icon" style={{ background: reading.color }}>{reading.emoji}</span>
          <span className="continue-text">
            <span className="muted small">📖 Okumaya devam et</span>
            <b>{reading.title}</b>
            <span className="muted small">Sayfa {reading.page + 1} / {reading.pageCount}</span>
            <span className="theme-progress">
              <span style={{ width: `${((reading.page + 1) / reading.pageCount) * 100}%` }} />
            </span>
          </span>
        </button>
      ) : (
        <button className="panel continue-card" onClick={() => onNavigate('library')}>
          <span className="continue-icon">📚</span>
          <span className="continue-text">
            <span className="muted small">📖 Okuma kitaplığı</span>
            <b>{stories.length} hikaye seni bekliyor</b>
            <span className="muted small">Kelimelerin üzerine gel, anlamını gör</span>
          </span>
        </button>
      )}

      {unit ? (
        <button className="panel continue-card" onClick={() => onNavigate('path')}>
          <span className="continue-icon path">{unit.icon}</span>
          <span className="continue-text">
            <span className="muted small">🗺️ Öğrenme yolunda sıradaki</span>
            <b>{unit.partCount > 1 ? `${unit.name} ${unit.part}` : unit.name} <span className="level-badge">{level}</span></b>
            <span className="muted small">{path.completedCount} / {path.units.length} ünite tamamlandı</span>
            <span className="theme-progress">
              <span style={{ width: `${(path.completedCount / path.units.length) * 100}%` }} />
            </span>
          </span>
        </button>
      ) : path.units.length > 0 && (
        <button className="panel continue-card" onClick={() => onNavigate('path')}>
          <span className="continue-icon path">🏆</span>
          <span className="continue-text">
            <span className="muted small">🗺️ Öğrenme yolu</span>
            <b>{level} yolunu bitirdin!</b>
            <span className="muted small">Sıradaki seviyeye geç</span>
          </span>
        </button>
      )}
    </div>
  )
}

export default ContinueCards