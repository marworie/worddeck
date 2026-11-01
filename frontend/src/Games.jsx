// ============================================================
// Games.jsx
// Kelime oyunları: kaynak seçimi + eşleştirme oyunu
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { speakWord } from './readerText'

const SOURCES = [
  { id: 'mine', label: 'Kelimelerim' },
  { id: 'A1', label: 'A1' }, { id: 'A2', label: 'A2' }, { id: 'B1', label: 'B1' },
  { id: 'B2', label: 'B2' }, { id: 'C1', label: 'C1' }
]
const PAIRS = 6
const BEST_KEY = 'matchBest'

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) ?? {} } catch { return {} }
}

function saveBest(best) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(best)) } catch { /* önemli değil */ }
}

// ---------- Eşleştirme oyunu ----------
function MatchGame({ source, onBack }) {
  const [pairs, setPairs] = useState(null)
  const [left, setLeft] = useState([])     // İngilizce kartların sırası
  const [right, setRight] = useState([])   // Türkçe kartların sırası
  const [selL, setSelL] = useState(null)
  const [selR, setSelR] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrong, setWrong] = useState(null) // { l, r }: kısa süre kırmızı yanar
  const [mistakes, setMistakes] = useState(0)
  const [startedAt, setStartedAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [best, setBest] = useState(loadBest)
  const [newRecord, setNewRecord] = useState(false)

  const done = pairs && pairs.length > 0 && matched.size === pairs.length
  const seconds = startedAt ? Math.floor((now - startedAt) / 1000) : 0

  function load() {
    setPairs(null)
    setMatched(new Set())
    setMistakes(0)
    setSelL(null)
    setSelR(null)
    setNewRecord(false)
    apiFetch(`/api/Games/words?source=${source}&count=${PAIRS}`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => {
        setPairs(list)
        setLeft(shuffle(list.map(p => p.wordId)))
        setRight(shuffle(list.map(p => p.wordId)))
        setStartedAt(Date.now())
      })
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Süre sayacı (oyun bitince durur)
  useEffect(() => {
    if (!startedAt || done) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [startedAt, done])

  // Oyun bitince rekor kontrolü (hatalar +3 sn ceza)
  useEffect(() => {
    if (!done) return
    const total = seconds + mistakes * 3
    if (best[source] == null || total < best[source]) {
      const next = { ...best, [source]: total }
      setBest(next)
      saveBest(next)
      setNewRecord(true)
    }
  }, [done])   // eslint-disable-line react-hooks/exhaustive-deps

  // İki taraftan birer kart seçilince kontrol et
  useEffect(() => {
    if (selL == null || selR == null) return
    if (selL === selR) {
      setMatched(m => new Set(m).add(selL))
    } else {
      setWrong({ l: selL, r: selR })
      setMistakes(n => n + 1)
      setTimeout(() => setWrong(null), 500)
    }
    setSelL(null)
    setSelR(null)
  }, [selL, selR])

  if (!pairs) return <div className="panel">Yükleniyor...</div>
  if (pairs.length < 2) {
    return (
      <div className="panel">
        Bu kaynakta yeterli kelime yok. Önce birkaç kelime çalış ya da bir seviye seç.
        <div><button className="btn btn-ghost" onClick={onBack}>← Geri</button></div>
      </div>
    )
  }

  const byId = Object.fromEntries(pairs.map(p => [p.wordId, p]))

  function cardClass(id, side) {
    if (matched.has(id)) return 'match-card matched'
    if (wrong && wrong[side] === id) return 'match-card wrong'
    if ((side === 'l' ? selL : selR) === id) return 'match-card selected'
    return 'match-card'
  }

  return (
    <div className="page">
      <div className="dict-head">
        <button className="btn btn-ghost" onClick={onBack}>← Oyunlar</button>
        <span className="muted small">
          ⏱️ {seconds} sn · ❌ {mistakes} hata
          {best[source] != null && ` · 🏆 rekor ${best[source]} sn`}
        </span>
      </div>

      {done ? (
        <div className="panel dict-summary">
          <div className="dict-big">{newRecord ? '🏆' : '🎉'}</div>
          <h2>{seconds + mistakes * 3} saniye</h2>
          <p className="muted">{seconds} sn + {mistakes} hata × 3 sn ceza {newRecord && '· Yeni rekor!'}</p>
          <div className="dict-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Tekrar oyna</button>
            <button className="btn btn-ghost" onClick={onBack}>Oyunlar</button>
          </div>
        </div>
      ) : (
        <div className="match-board">
          <div className="match-col">
            {left.map(id => (
              <button
                key={id}
                className={cardClass(id, 'l')}
                disabled={matched.has(id)}
                onClick={() => { setSelL(id); speakWord(byId[id].headword) }}
              >
                {byId[id].headword}
              </button>
            ))}
          </div>
          <div className="match-col">
            {right.map(id => (
              <button
                key={id}
                className={cardClass(id, 'r')}
                disabled={matched.has(id)}
                onClick={() => setSelR(id)}
              >
                {byId[id].meaning}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Oyunlar sayfası ----------
function Games() {
  const [source, setSource] = useState('mine')
  const [game, setGame] = useState(null)

  if (game === 'match') return <MatchGame source={source} onBack={() => setGame(null)} />

  return (
    <div className="page">
      <h2 className="page-title">🎮 Kelime Oyunları</h2>

      <p className="muted">Kelimeler nereden gelsin?</p>
      <div className="chip-row">
        {SOURCES.map(s => (
          <button key={s.id} className={`chip ${source === s.id ? 'active' : ''}`} onClick={() => setSource(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="game-grid">
        <button className="game-card panel" onClick={() => setGame('match')}>
          <span className="game-emoji">🃏</span>
          <b>Eşleştirme</b>
          <span className="muted small">İngilizce kelimeyi Türkçe anlamıyla eşleştir. Ne kadar hızlısın?</span>
        </button>
        <div className="game-card panel disabled">
          <span className="game-emoji">🪢</span>
          <b>Adam asmaca</b>
          <span className="muted small">Yakında</span>
        </div>
      </div>
    </div>
  )
}

export default Games