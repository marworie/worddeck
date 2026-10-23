// ============================================================
// LearningPath.jsx
// Öğrenme yolu: seviye seç → tema üniteleri sırayla, kilitli / açık / tamamlandı.
// Üniteye tıklayınca kelimeleri görülür, çalışmaya eklenir, ünite testi başlatılır.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { posTr } from './labels'
import { useToast } from './ToastContext'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const LEVEL_KEY = 'pathLevel'
const ZIGZAG = [0, 70, 110, 70, 0, -70, -110, -70]   // düğümlerin sağa sola kayması (px)

function savedLevel() {
  try { return localStorage.getItem(LEVEL_KEY) || 'A1' } catch { return 'A1' }
}

function unitTitle(u) {
  return u.partCount > 1 ? `${u.name} ${u.part}` : u.name
}

// Ünite detayı: kelimeler, çalışmaya ekleme, test
function UnitDetail({ level, unit, onBack, onStartTest }) {
  const showToast = useToast()
  const [detail, setDetail] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    apiFetch(`/api/Path/${level}/unit/${unit.themeId}/${unit.part}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setDetail)
  }, [level, unit.themeId, unit.part, reloadKey])

  async function addToStudy() {
    const response = await apiFetch(`/api/Path/${level}/unit/${unit.themeId}/${unit.part}/study`, { method: 'POST' })
    if (!response.ok) return
    const { added } = await response.json()
    showToast(added > 0 ? `${added} kelime çalışmaya eklendi.` : 'Bu kelimelerin hepsi zaten çalışılıyor.', 'success')
    setReloadKey(k => k + 1)
  }

  if (!detail) return <p className="loading-text">Yükleniyor...</p>

  const newCount = detail.words.filter(w => w.box == null).length

  return (
    <div className="page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← {level} yolu</button>
      <h2 className="page-title">{unit.icon} {unitTitle(unit)} <span className="level-badge">{level}</span></h2>
      <p className="muted">
        {detail.words.length} kelime
        {unit.bestScore != null && ` · en iyi puanın %${unit.bestScore}`}
        {unit.status === 'completed' && ' · ✅ tamamlandı'}
      </p>

      <div className="placement-actions">
        <button className="btn btn-primary" onClick={() => onStartTest(unit, detail.words)}>
          📝 Ünite testine başla
        </button>
        <button className="btn btn-ghost" onClick={addToStudy} disabled={newCount === 0}>
          {newCount > 0 ? `${newCount} kelimeyi çalışmaya ekle` : 'Hepsi çalışılıyor ✓'}
        </button>
      </div>
      <p className="muted small">Testi %80 ve üstüyle geçersen sıradaki ünitenin kilidi açılır.</p>

      <div className="theme-words">
        {detail.words.map(w => (
          <div key={w.wordId} className="theme-word">
            <span className="theme-word-main">
              <b>{w.headword}</b>
              <span className="muted small"> {posTr(w.partOfSpeech)}</span>
            </span>
            <span className="theme-word-meaning">{w.turkishMeaning || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LearningPath({ onStartTest }) {
  const [level, setLevel] = useState(savedLevel)
  const [path, setPath] = useState(null)
  const [openUnit, setOpenUnit] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    apiFetch(`/api/Path/${level}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setPath)
  }, [level, reloadKey])

  function chooseLevel(l) {
    setLevel(l)
    setPath(null)
    try { localStorage.setItem(LEVEL_KEY, l) } catch { /* yoksay */ }
  }

  if (openUnit) {
    return (
      <UnitDetail
        level={level}
        unit={openUnit}
        onBack={() => { setOpenUnit(null); setReloadKey(k => k + 1) }}
        onStartTest={(unit, words) => onStartTest({ level, unit, words })}
      />
    )
  }

  const total = path?.units.length ?? 0
  const pct = total ? Math.round((path.completedCount / total) * 100) : 0

  return (
    <div className="page learning-path">
      <h2 className="page-title">🗺️ Öğrenme yolu</h2>

      <div className="chip-list">
        {LEVELS.map(l => (
          <button key={l} className={`chip ${level === l ? 'active' : ''}`} onClick={() => chooseLevel(l)}>{l}</button>
        ))}
      </div>

      {!path ? (
        <p className="loading-text">Yükleniyor...</p>
      ) : total === 0 ? (
        <p className="muted">Bu seviyede ünite yok.</p>
      ) : (
        <>
          <div className="path-progress">
            <span><b>{path.completedCount}</b> / {total} ünite tamamlandı</span>
            <div className="theme-progress"><div style={{ width: `${pct}%` }} /></div>
          </div>

          <div className="path-track">
            {path.units.map((u, i) => (
              <div key={`${u.themeId}-${u.part}`} className="path-step" style={{ '--shift': `${ZIGZAG[i % ZIGZAG.length]}px` }}>
                <button
                  className={`path-node ${u.status}`}
                  disabled={u.status === 'locked'}
                  onClick={() => setOpenUnit(u)}
                  title={u.status === 'locked' ? 'Önceki üniteyi bitirince açılır' : unitTitle(u)}
                >
                  <span className="path-icon">{u.status === 'locked' ? '🔒' : u.icon}</span>
                  {u.status === 'completed' && <span className="path-check">✓</span>}
                </button>
                <span className="path-label">
                  {unitTitle(u)}
                  {u.bestScore != null && <span className="muted small"> · %{u.bestScore}</span>}
                </span>
                {u.status === 'current' && <span className="path-here">Buradasın</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default LearningPath