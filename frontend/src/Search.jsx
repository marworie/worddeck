// ============================================================
// Search.jsx
// Kelime arama: İngilizce (baştan eşleşme) ya da Türkçe anlam, seviye ve tür filtresi.
// Yazarken her harfte değil, 300 ms durunca arar (debounce).
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { POS_TR } from './labels'
import WordRow from './WordRow'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const POS_OPTIONS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'determiner']

function Search({ onBack }) {
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [pos, setPos] = useState('')
  const [results, setResults] = useState(null)   // null = henüz arama yapılmadı
  const [lists, setLists] = useState([])

  useEffect(() => {
    apiFetch('/api/Lists').then(r => (r.ok ? r.json() : [])).then(setLists)
  }, [])

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
        .then(setResults)
    }, 300)
    return () => clearTimeout(timer)   // yeni harf gelirse önceki aramayı iptal et
  }, [query, level, pos])

  return (
    <div className="search-page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← Ana sayfa</button>
      <h2 className="page-title">Kelime ara</h2>

      <div className="panel search-box">
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İngilizce ya da Türkçe yaz..."
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
        />
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
        <p className="muted center">Aramaya başlamak için bir kelime yaz ya da filtre seç.</p>
      ) : results.length === 0 ? (
        <p className="muted center">Sonuç bulunamadı. Türkçe arama sadece daha önce açılmış kelimelerde çalışır.</p>
      ) : (
        <ul className="panel word-list">
          {results.map(w => <WordRow key={w.wordId} word={w} lists={lists} />)}
        </ul>
      )}
    </div>
  )
}

export default Search