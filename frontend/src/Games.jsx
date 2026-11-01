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

// ---------- Adam asmaca ----------
const MAX_WRONG = 6
const ROUND = 10
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('')

// Adam çizimi: hata sayısı kadar parça görünür
function Gallows({ wrong }) {
  const parts = [
    <circle key="head" cx="140" cy="60" r="16" />,
    <line key="body" x1="140" y1="76" x2="140" y2="126" />,
    <line key="armL" x1="140" y1="90" x2="118" y2="110" />,
    <line key="armR" x1="140" y1="90" x2="162" y2="110" />,
    <line key="legL" x1="140" y1="126" x2="122" y2="156" />,
    <line key="legR" x1="140" y1="126" x2="158" y2="156" />
  ]
  return (
    <svg className="gallows" viewBox="0 0 200 190" aria-hidden="true">
      <line x1="20" y1="180" x2="120" y2="180" />
      <line x1="60" y1="180" x2="60" y2="20" />
      <line x1="60" y1="20" x2="140" y2="20" />
      <line x1="140" y1="20" x2="140" y2="44" />
      {parts.slice(0, wrong)}
    </svg>
  )
}

function Hangman({ source, onBack }) {
  const [words, setWords] = useState(null)
  const [index, setIndex] = useState(0)
  const [guessed, setGuessed] = useState(new Set())
  const [hint, setHint] = useState(false)
  const [solved, setSolved] = useState(0)

  const current = words?.[index]
  const answer = current?.headword.toLowerCase() ?? ''
  const letters = [...new Set(answer.split('').filter(c => ALPHABET.includes(c)))]
  const wrongCount = [...guessed].filter(c => !answer.includes(c)).length + (hint ? 1 : 0)
  const won = current && letters.every(c => guessed.has(c))
  const lost = current && !won && wrongCount >= MAX_WRONG
  const over = won || lost
  const finished = words && index >= words.length

  function load() {
    setWords(null)
    setIndex(0)
    setSolved(0)
    resetWord()
    apiFetch(`/api/Games/words?source=${source}&count=20`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => setWords(
        // Sadece harf (ve boşluk/tire) içeren, 3–12 harfli kelimeler
        list.filter(w => /^[a-z][a-z -]{2,11}$/i.test(w.headword)).slice(0, ROUND)
      ))
  }

  function resetWord() {
    setGuessed(new Set())
    setHint(false)
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  function guess(c) {
    if (over || guessed.has(c)) return
    setGuessed(g => new Set(g).add(c))
  }

  // Kelime çözülünce say ve sesli oku
  useEffect(() => {
    if (!over) return
    if (won) setSolved(n => n + 1)
    speakWord(current.headword)
  }, [over])   // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    resetWord()
    setIndex(i => i + 1)
  }

  // Bilgisayar klavyesi: harf tahmin eder, Enter sonraki kelimeye geçer
  useEffect(() => {
    const onKey = e => {
      const k = e.key.toLowerCase()
      if (ALPHABET.includes(k)) guess(k)
      else if (e.key === 'Enter' && over) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!words) return <div className="panel">Yükleniyor...</div>
  if (words.length === 0) {
    return (
      <div className="panel">
        Bu kaynakta uygun kelime yok.
        <div><button className="btn btn-ghost" onClick={onBack}>← Geri</button></div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="page">
        <div className="panel dict-summary">
          <div className="dict-big">{solved === words.length ? '🏆' : solved >= words.length / 2 ? '🎉' : '💪'}</div>
          <h2>{solved} / {words.length} kelime</h2>
          <div className="dict-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Tekrar oyna</button>
            <button className="btn btn-ghost" onClick={onBack}>Oyunlar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="dict-head">
        <button className="btn btn-ghost" onClick={onBack}>← Oyunlar</button>
        <span className="muted small">{index + 1} / {words.length} · ✅ {solved} · ❤️ {MAX_WRONG - wrongCount} hak</span>
      </div>

      <div className="panel hangman">
        <Gallows wrong={wrongCount} />

        <div className="hangman-word">
          {answer.split('').map((c, i) => (
            <span key={i} className={`hm-letter ${ALPHABET.includes(c) ? '' : 'hm-space'} ${lost && !guessed.has(c) ? 'hm-missed' : ''}`}>
              {!ALPHABET.includes(c) ? c : guessed.has(c) || over ? c : ''}
            </span>
          ))}
        </div>

        {hint || over
          ? <p className="muted">🇹🇷 {current.meaning}</p>
          : <button className="btn btn-ghost small" onClick={() => setHint(true)} disabled={wrongCount >= MAX_WRONG - 1}>
              💡 İpucu (1 hak)
            </button>}

        {over ? (
          <div className="hm-result">
            <b>{won ? '🎉 Bildin!' : `😵 Kelime: ${current.headword}`}</b>
            <button className="btn btn-primary" onClick={next}>Sonraki →</button>
          </div>
        ) : (
          <div className="hm-keys">
            {ALPHABET.map(c => (
              <button
                key={c}
                className={`hm-key ${guessed.has(c) ? (answer.includes(c) ? 'hit' : 'miss') : ''}`}
                disabled={guessed.has(c)}
                onClick={() => guess(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Oyunlar sayfası ----------
function Games() {
  const [source, setSource] = useState('mine')
  const [game, setGame] = useState(null)

  if (game === 'match') return <MatchGame source={source} onBack={() => setGame(null)} />
  if (game === 'hangman') return <Hangman source={source} onBack={() => setGame(null)} />

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
        <button className="game-card panel" onClick={() => setGame('hangman')}>
          <span className="game-emoji">🪢</span>
          <b>Adam asmaca</b>
          <span className="muted small">Harf harf tahmin et, 6 hatada adam asılır. İpucu 1 hak yer.</span>
        </button>
      </div>
    </div>
  )
}

export default Games