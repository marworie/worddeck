// ============================================================
// GameWordSearch.jsx
// Kelime avı: harf tablosunda gizli kelimeleri bul. İpuçları Türkçe anlamlar.
// İlk harfe, sonra son harfe tıkla (yatay, dikey ya da çapraz).
// ============================================================

import { useEffect, useState } from 'react'
import { GameHead, GameOver, NotEnough } from './GameShell'
import { fetchGameWords, getBest, isLetters, setBestValue, shuffle, speakText } from './gameUtils'

const SIZE = 10
const MAX_WORDS = 7
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [-1, 1]]   // sağa, aşağı, çapraz aşağı, çapraz yukarı
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const FOUND_COLORS = ['#99f6e4', '#bfdbfe', '#fde68a', '#fbcfe8', '#ddd6fe', '#bbf7d0', '#fed7aa']

// Kelimeleri tabloya yerleştir, boşlukları rastgele harfle doldur
function buildGrid(words) {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''))
  const placed = []

  for (const w of words) {
    const text = w.headword.toLowerCase()
    for (let attempt = 0; attempt < 150; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
      const r = Math.floor(Math.random() * SIZE)
      const c = Math.floor(Math.random() * SIZE)
      const cells = [...text].map((_, i) => [r + dr * i, c + dc * i])
      const fits = cells.every(([rr, cc], i) =>
        rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && (grid[rr][cc] === '' || grid[rr][cc] === text[i]))
      if (!fits) continue
      cells.forEach(([rr, cc], i) => { grid[rr][cc] = text[i] })
      placed.push({ ...w, text })
      break
    }
  }

  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]

  return { grid, placed }
}

// İki hücre arası düz çizgideki hücreler (değilse null)
function lineBetween([r1, c1], [r2, c2]) {
  const dr = Math.sign(r2 - r1)
  const dc = Math.sign(c2 - c1)
  const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1))
  if (!(r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1))) return null
  return Array.from({ length: len + 1 }, (_, i) => [r1 + dr * i, c1 + dc * i])
}

function GameWordSearch({ source, onBack }) {
  const [puzzle, setPuzzle] = useState(null)    // { grid, placed }
  const [start, setStart] = useState(null)      // ilk tıklanan hücre
  const [found, setFound] = useState([])        // { text, cells, color }
  const [wrong, setWrong] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [best, setBest] = useState(() => getBest('wordSearchBest', source))

  const done = puzzle && puzzle.placed.length > 0 && found.length === puzzle.placed.length

  function load() {
    setPuzzle(null)
    setFound([])
    setStart(null)
    setSeconds(0)
    fetchGameWords(source, 20).then(list => {
      const words = shuffle(list.filter(w => isLetters(w.headword, 3, 8))).slice(0, MAX_WORDS)
      // Uzun kelimeler önce yerleşsin (sığma şansı artar)
      setPuzzle(buildGrid([...words].sort((a, b) => b.headword.length - a.headword.length)))
      setStartedAt(Date.now())
    })
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!puzzle || done) return
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [puzzle, done, startedAt])

  useEffect(() => {
    if (!done) return
    if (best == null || seconds < best) {
      setBest(seconds)
      setBestValue('wordSearchBest', source, seconds)
    }
  }, [done])   // eslint-disable-line react-hooks/exhaustive-deps

  function clickCell(r, c) {
    if (done) return
    if (!start) { setStart([r, c]); return }

    const cells = lineBetween(start, [r, c])
    setStart(null)
    if (!cells || cells.length < 2) return

    const text = cells.map(([rr, cc]) => puzzle.grid[rr][cc]).join('')
    const reversed = [...text].reverse().join('')
    const match = puzzle.placed.find(p => (p.text === text || p.text === reversed) && !found.some(f => f.text === p.text))
    if (match) {
      setFound(f => [...f, { text: match.text, cells, color: FOUND_COLORS[f.length % FOUND_COLORS.length] }])
      speakText(match.text, 0.85)
    } else {
      setWrong(true)
      setTimeout(() => setWrong(false), 400)
    }
  }

  if (!puzzle) return <div className="panel">Yükleniyor...</div>
  if (puzzle.placed.length < 3) return <NotEnough onBack={onBack} />

  if (done) {
    return (
      <GameOver
        emoji={best === seconds ? '🏆' : '🔍'}
        title={`${seconds} saniyede buldun`}
        text={best != null ? `Rekorun: ${best} sn` : null}
        onAgain={load}
        onBack={onBack}
      >
        <div className="rain-missed">
          {puzzle.placed.map(p => <span key={p.text} className="chip">{p.text} = {p.meaning}</span>)}
        </div>
      </GameOver>
    )
  }

  // Hücre renkleri: bulunan kelimeler ve seçilen başlangıç
  const colorOf = {}
  found.forEach(f => f.cells.forEach(([r, c]) => { colorOf[`${r}-${c}`] = f.color }))

  return (
    <div className="page">
      <GameHead onBack={onBack}>
        ⏱️ {seconds} sn · 🔍 {found.length} / {puzzle.placed.length}{best != null && ` · 🏆 ${best} sn`}
      </GameHead>

      <div className="ws-layout">
        <div className={`ws-grid panel ${wrong ? 'shake' : ''}`}>
          {puzzle.grid.map((row, r) => row.map((ch, c) => {
            const key = `${r}-${c}`
            const isStart = start && start[0] === r && start[1] === c
            return (
              <button
                key={key}
                className={`ws-cell ${isStart ? 'start' : ''}`}
                style={colorOf[key] ? { background: colorOf[key], color: '#1f2328' } : undefined}
                onClick={() => clickCell(r, c)}
              >
                {ch}
              </button>
            )
          }))}
        </div>

        <div className="ws-clues panel">
          <span className="card-label">Bulman gereken kelimeler</span>
          <p className="muted small">İlk harfe, sonra son harfe tıkla</p>
          {puzzle.placed.map(p => {
            const isFound = found.some(f => f.text === p.text)
            return (
              <div key={p.text} className={`ws-clue ${isFound ? 'found' : ''}`}>
                <span>{p.meaning}</span>
                <b>{isFound ? p.text : `${p.text.length} harf`}</b>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GameWordSearch