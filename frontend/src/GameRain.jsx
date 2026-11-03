// ============================================================
// GameRain.jsx
// Kelime yağmuru: Türkçe anlamlar yukarıdan düşer, yere düşmeden
// İngilizcesini yazıp patlat. 3 can, gittikçe hızlanır.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { GameHead, GameOver, NotEnough } from './GameShell'
import { fetchGameWords, getBest, setBestValue, shuffle, speakText } from './gameUtils'

const TICK_MS = 50
const LIVES = 3

function GameRain({ source, onBack }) {
  const [words, setWords] = useState(null)
  const [drops, setDrops] = useState([])        // ekranda düşenler { id, headword, meaning, x, y }
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [typed, setTyped] = useState('')
  const [running, setRunning] = useState(false)
  const [popped, setPopped] = useState(null)    // son patlatılan: kısa süre gösterilir
  const [best, setBest] = useState(() => getBest('rainBest', source))
  const [missed, setMissed] = useState([])      // kaçırılan kelimeler (sonda gösterilir)

  // Oyun döngüsü ref'lerle çalışır, ekran state'ten çizilir
  const game = useRef({ drops: [], queue: [], ticks: 0, nextId: 1, lives: LIVES, score: 0 })
  const inputRef = useRef(null)

  function start(list) {
    game.current = { drops: [], queue: shuffle(list), ticks: 0, nextId: 1, lives: LIVES, score: 0 }
    setDrops([])
    setLives(LIVES)
    setScore(0)
    setTyped('')
    setMissed([])
    setRunning(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  useEffect(() => {
    fetchGameWords(source, 20).then(list => {
      setWords(list)
      if (list.length >= 4) start(list)
    })
  }, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      const g = game.current
      g.ticks++
      const speed = 0.3 + g.score * 0.025                 // her patlatmada biraz hızlanır
      const spawnEvery = Math.max(16, 44 - g.score)       // ve daha sık gelir

      if (g.ticks % spawnEvery === 1) {
        if (g.queue.length === 0) g.queue = shuffle(words)
        const w = g.queue.pop()
        g.drops.push({ id: g.nextId++, headword: w.headword, meaning: w.meaning, x: 6 + Math.random() * 64, y: -6 })
      }

      g.drops.forEach(d => { d.y += speed })
      const fallen = g.drops.filter(d => d.y >= 92)
      if (fallen.length) {
        g.lives -= fallen.length
        g.drops = g.drops.filter(d => d.y < 92)
        setMissed(m => [...m, ...fallen.map(f => `${f.headword} = ${f.meaning}`)])
        setLives(Math.max(g.lives, 0))
        if (g.lives <= 0) {
          setRunning(false)
          if (best == null || g.score > best) {
            setBest(g.score)
            setBestValue('rainBest', source, g.score)
          }
        }
      }
      setDrops(g.drops.map(d => ({ ...d })))
    }, TICK_MS)
    return () => clearInterval(t)
  }, [running, words, best, source])

  // Yazılan kelime düşenlerden biriyle eşleşince patlat
  function onType(value) {
    setTyped(value)
    const v = value.trim().toLowerCase()
    const g = game.current
    const hit = g.drops.find(d => d.headword.toLowerCase() === v)
    if (!hit) return
    g.drops = g.drops.filter(d => d !== hit)
    g.score++
    setScore(g.score)
    setDrops(g.drops.map(d => ({ ...d })))
    setTyped('')
    setPopped({ ...hit })
    speakText(hit.headword, 1)
    setTimeout(() => setPopped(p => (p?.id === hit.id ? null : p)), 700)
  }

  if (!words) return <div className="panel">Yükleniyor...</div>
  if (words.length < 4) return <NotEnough onBack={onBack} />

  if (!running) {
    return (
      <GameOver
        emoji={best === score && score > 0 ? '🏆' : '🌧️'}
        title={`${score} kelime patlattın`}
        text={best != null ? `Rekorun: ${best}` : null}
        onAgain={() => start(words)}
        onBack={onBack}
      >
        {missed.length > 0 && (
          <div className="rain-missed">
            <span className="muted small">Kaçırdıkların:</span>
            {missed.slice(-6).map((m, i) => <span key={i} className="chip">{m}</span>)}
          </div>
        )}
      </GameOver>
    )
  }

  return (
    <div className="page">
      <GameHead onBack={onBack}>
        {'❤️'.repeat(lives)}{'🤍'.repeat(LIVES - lives)} · 💥 {score}{best != null && ` · 🏆 ${best}`}
      </GameHead>

      <div className="rain-field panel" onClick={() => inputRef.current?.focus()}>
        {drops.map(d => (
          <span key={d.id} className="rain-drop" style={{ left: `${d.x}%`, top: `${d.y}%` }}>{d.meaning}</span>
        ))}
        {popped && <span className="rain-pop" style={{ left: `${popped.x}%`, top: `${popped.y}%` }}>💥 {popped.headword}</span>}
        <div className="rain-ground" />
      </div>

      <input
        ref={inputRef}
        className="dict-input rain-input"
        value={typed}
        onChange={e => onType(e.target.value)}
        placeholder="İngilizcesini yaz..."
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}

export default GameRain