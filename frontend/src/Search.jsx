// ============================================================
// Search.jsx
// Kelime arama: İngilizce (baştan eşleşme) ya da Türkçe anlam, seviye ve tür filtresi.
// Yazarken her harfte değil, 300 ms durunca arar (debounce).
// Boşken: son aramalar, seviyeden keşfet listesi ve temalar.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { POS_TR } from './labels'
import WordRow from './WordRow'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'determiner']
const RECENT_KEY = 'worddeck-recent-searches'

// Son aramalar tarayıcıda tutulur (gizli pencere gibi durumlarda depolama kapalı olabilir)
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? [] } catch { return [] }
}
function saveRecent(list) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* depolama kapalı */ }
}

function Search({ query, onQueryChange, onNavigate }) {
  const [level, setLevel] = useState('')
  const [pos, setPos] = useState('')
  const [results, setResults] = useState(null)   // null = henüz arama yapılmadı
  const [lists, setLists] = useState([])
  const [recent, setRecent] = useState(loadRecent)
  const [discover, setDiscover] = useState(null)
  const [discoverKey, setDiscoverKey] = useState(0)   // "Yenile" için
  const [themes, setThemes] = useState([])

  useEffect(() => {
    apiFetch('/api/Lists').then(r => (r.ok ? r.json() : [])).then(setLists)
    apiFetch('/api/Themes').then(r => (r.ok ? r.json() : [])).then(setThemes)
  }, [])

  useEffect(() => {
    apiFetch('/api/Home/discover?count=8').then(r => (r.ok ? r.json() : null)).then(setDiscover)
  }, [discoverKey])

  // Debounce: kullanıcı yazmayı bırakınca ara
  useEffect(() => {
    if (!query.trim() && !level && !pos) {
      setResults(null)
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim(), level, pos })
      apiFetch(`/api/Words/search?${params}`)
        .then(r => (r.ok ? r.json() : []))
        .then(data => {
          setResults(data)
          // Sonuç bulunan aramalar "son aramalar"a girsin
          const q = query.trim()
          if (data.length > 0 && q.length >= 3) {
            setRecent(prev => {
              // "abil" yazıp "ability"ye devam edince ikisi birden kalmasın
              const next = [q, ...prev.filter(r => !q.startsWith(r) && !r.startsWith(q))].slice(0, 8)
              saveRecent(next)
              return next
            })
          }
        })
    }, 300)
    return () => clearTimeout(timer)   // yeni harf gelirse önceki aramayı iptal et
  }, [query, level, pos])

  return (
    <div className="search-page">
      <h2 className="page-title">Kelime ara</h2>

      <div className="panel search-box">
        <div className="search-filters">
          <div className="chip-row">
            <button className={`filter-chip ${level === '' ? 'active' : ''}`} onClick={() => setLevel('')}>Tümü</button>
            {LEVELS.map(l => (
              <button key={l} className={`filter-chip ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>{l}</button>
            ))}
          </div>
          <select className="pos-select" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="">Tüm türler</option>
            {POS_OPTIONS.map(p => <option key={p} value={p}>{POS_TR[p]}</option>)}
          </select>
        </div>
      </div>

      {results === null ? (
        <div className="search-empty">
          {recent.length > 0 && (
            <section className="panel">
              <div className="chart-head">
                <h3 className="section-title">Son aramaların</h3>
                <button className="btn btn-ghost small" onClick={() => { setRecent([]); saveRecent([]) }}>Temizle</button>
              </div>
              <div className="chip-list">
                {recent.map(r => <button key={r} className="chip" onClick={() => onQueryChange(r)}>{r}</button>)}
              </div>
            </section>
          )}

          {discover?.words.length > 0 && (
            <section className="panel">
              <div className="chart-head">
                <h3 className="section-title">Keşfet · {discover.level}</h3>
                <button className="btn btn-ghost small" onClick={() => setDiscoverKey(k => k + 1)}>↻ Yenile</button>
              </div>
              <p className="muted small">Seviyenden henüz çalışmadığın kelimeler</p>
              <ul className="word-list">
                {discover.words.map(w => <WordRow key={w.wordId} word={w} lists={lists} />)}
              </ul>
            </section>
          )}

          {themes.length > 0 && (
            <section className="panel">
              <h3 className="section-title">Temalardan keşfet</h3>
              <div className="search-themes">
                {themes.map(t => (
                  <button key={t.id} className="search-theme" onClick={() => onNavigate('themes')}>
                    <span>{t.icon}</span> {t.name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : results.length === 0 ? (
        <p className="muted center">Sonuç bulunamadı. Türkçe arama sadece anlamı olan kelimelerde çalışır.</p>
      ) : (
        <ul className="panel word-list">
          {results.map(w => <WordRow key={w.wordId} word={w} lists={lists} />)}
        </ul>
      )}
    </div>
  )
}

export default Search