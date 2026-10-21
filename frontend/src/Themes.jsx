// ============================================================
// Themes.jsx
// Hazır tema listeleri: önce tema kartları, birine tıklanınca o temanın kelimeleri.
// Temadaki kelimeler seviyeye göre süzülebilir, çalışmaya eklenebilir, temadan sınav olunabilir.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { posTr } from './labels'
import { useToast } from './ToastContext'
import WordDetailModal from './WordDetailModal'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const LEARNED_BOX = 6   // backend'deki LeitnerService.LearnedBox ile aynı

// Kelimenin çalışma durumu (ana sayfadaki "biliyorsun" mantığıyla aynı: 2. kutu ve üstü)
function wordStatus(box) {
  if (box == null) return { text: 'Yeni', cls: 'new' }
  if (box >= LEARNED_BOX) return { text: 'Öğrenildi', cls: 'learned' }
  if (box >= 2) return { text: 'Biliyorsun', cls: 'learned' }
  return { text: 'Çalışılıyor', cls: 'studying' }
}


// Tek bir temanın sayfası
function ThemeDetail({ theme, onBack, onStartQuiz }) {
  const showToast = useToast()
  const [words, setWords] = useState(null)
  const [level, setLevel] = useState(null)        // null: tüm seviyeler
  const [openWord, setOpenWord] = useState(null)  // detayı açık kelime
  const [reloadKey, setReloadKey] = useState(0)   // çalışmaya ekleyince listeyi yenilemek için

  useEffect(() => {
    apiFetch(`/api/Themes/${theme.id}/words`)
      .then(r => (r.ok ? r.json() : []))
      .then(setWords)
  }, [theme.id, reloadKey])

  async function addToStudy() {
    const response = await apiFetch(`/api/Themes/${theme.id}/study${level ? `?level=${level}` : ''}`, { method: 'POST' })
    if (!response.ok) return
    const { added } = await response.json()
    showToast(added > 0
      ? `${added} kelime çalışmaya eklendi, kart çalışmasında karşına çıkacak.`
      : 'Bu kelimelerin hepsi zaten çalışılıyor.', 'success')
    setReloadKey(k => k + 1)
  }

  if (!words) return <p className="loading-text">Yükleniyor...</p>

  const levelsInTheme = LEVELS.filter(l => words.some(w => w.level === l))
  const visible = words.filter(w => !level || w.level === level)
  const newCount = visible.filter(w => w.box == null).length

  return (
    <div className="page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← Temalar</button>
      <h2 className="page-title">{theme.icon} {theme.name}</h2>

      {/* Seviye filtresi: sadece temada olan seviyeler */}
      <div className="chip-list theme-levels">
        <button className={`chip ${!level ? 'active' : ''}`} onClick={() => setLevel(null)}>Tümü ({words.length})</button>
        {levelsInTheme.map(l => (
          <button key={l} className={`chip ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>
            {l} ({words.filter(w => w.level === l).length})
          </button>
        ))}
      </div>

      <div className="placement-actions">
        <button className="btn btn-primary" onClick={addToStudy} disabled={newCount === 0}>
          {newCount > 0 ? `${newCount} yeni kelimeyi çalışmaya ekle` : 'Hepsi çalışılıyor ✓'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => onStartQuiz({ themeId: theme.id, themeName: theme.name, level, count: 10 })}
          disabled={visible.length < 5}
        >
          Sınav ol
        </button>
      </div>

      <div className="theme-words">
        {visible.map(w => {
          const status = wordStatus(w.box)
          return (
            <button key={w.wordId} className="theme-word" onClick={() => setOpenWord(w)}>
              <span className="theme-word-main">
                <b>{w.headword}</b>
                <span className="muted small"> {posTr(w.partOfSpeech)}</span>
              </span>
              <span className="theme-word-meaning">{w.turkishMeaning || '—'}</span>
              <span className="level-badge">{w.level}</span>
              <span className={`theme-word-status ${status.cls}`}>{status.text}</span>
            </button>
          )
        })}
      </div>

      {openWord && <WordDetailModal word={openWord} onClose={() => setOpenWord(null)} />}
    </div>
  )
}

// Tema kartları
function Themes({ onStartQuiz }) {
  const [themes, setThemes] = useState(null)
  const [selected, setSelected] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)   // temadan dönünce ilerleme güncellensin

  useEffect(() => {
    apiFetch('/api/Themes')
      .then(r => (r.ok ? r.json() : []))
      .then(setThemes)
  }, [reloadKey])

  if (selected) {
    return (
      <ThemeDetail
        theme={selected}
        onStartQuiz={onStartQuiz}
        onBack={() => { setSelected(null); setReloadKey(k => k + 1) }}
      />
    )
  }

  return (
    <div className="page">
      <h2 className="page-title">Temalar</h2>
      <p className="muted">Konulara göre hazır kelime listeleri. Bir temaya gir, kelimelere göz at, çalışmaya ekle ya da sınav ol.</p>

      {!themes ? (
        <p className="loading-text">Yükleniyor...</p>
      ) : (
        <div className="theme-grid">
          {themes.map(t => {
            const pct = t.wordCount ? Math.round((t.knownCount / t.wordCount) * 100) : 0
            return (
              <button key={t.id} className="theme-card panel" onClick={() => setSelected(t)}>
                <span className="theme-icon">{t.icon}</span>
                <b className="theme-name">{t.name}</b>
                <span className="muted small">{t.wordCount} kelime · {t.studiedCount} çalışılıyor</span>
                <div className="theme-progress"><div style={{ width: `${pct}%` }} /></div>
                <span className="muted small">%{pct} biliyorsun</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Themes