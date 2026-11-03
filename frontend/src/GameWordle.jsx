// ============================================================
// GameWordle.jsx
// Günün kelimesi: 5 harfli kelimeyi 6 denemede bul.
// Yeşil = doğru yerde, sarı = kelimede var ama başka yerde, gri = yok.
// Günlük oyun herkes için aynı kelime; bitince serbest oyun açılır.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { GameHead } from './GameShell'
import { pickRandom, speakText } from './gameUtils'

const LENGTH = 5
const TRIES = 6
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const RANK = { absent: 1, present: 2, correct: 3 }   // klavyede en iyi sonuç görünsün

// Tahminin her harfi için sonuç (tekrar eden harfler doğru sayılır)
function evaluate(answer, guess) {
  const result = Array(LENGTH).fill('absent')
  const left = {}
  for (let i = 0; i < LENGTH; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct'
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < LENGTH; i++) {
    if (result[i] !== 'correct' && left[guess[i]] > 0) {
      result[i] = 'present'
      left[guess[i]]--
    }
  }
  return result
}

function loadJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* önemli değil */ }
}

function GameWordle({ onBack }) {
  const [data, setData] = useState(null)         // { day, daily, answers, valid }
  const [daily, setDaily] = useState(true)       // günlük mü serbest mi
  const [answer, setAnswer] = useState(null)     // { headword, meaning, level }
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [message, setMessage] = useState('')
  const [shake, setShake] = useState(false)
  const [stats, setStats] = useState(() => loadJson('wordleStats') ?? { played: 0, wins: 0, streak: 0, lastDay: null })

  const word = answer?.headword ?? ''
  const won = guesses.includes(word)
  const lost = !won && guesses.length >= TRIES
  const over = won || lost

  useEffect(() => {
    apiFetch('/api/Games/wordle').then(r => (r.ok ? r.json() : null)).then(d => {
      if (!d) return
      setData(d)
      setAnswer(d.daily)
      setGuesses(loadJson(`wordle-${d.day}`) ?? [])   // bugünkü oyun yarım kaldıysa devam
    })
  }, [])

  function startPractice() {
    setDaily(false)
    setAnswer(pickRandom(data.answers))
    setGuesses([])
    setCurrent('')
    setMessage('')
  }

  function flash(text) {
    setMessage(text)
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  function finish(next) {
    const isWin = next.includes(word)
    speakText(word, 0.8)
    if (!daily) return
    // Seri: dün de günlük oyunu kazandıysan devam eder
    const yesterday = new Date(data.day)
    yesterday.setDate(yesterday.getDate() - 1)
    const continues = stats.lastDay === yesterday.toISOString().slice(0, 10)
    const nextStats = {
      played: stats.played + 1,
      wins: stats.wins + (isWin ? 1 : 0),
      streak: isWin ? (continues ? stats.streak + 1 : 1) : 0,
      lastDay: isWin ? data.day : stats.lastDay
    }
    setStats(nextStats)
    saveJson('wordleStats', nextStats)
  }

  function submit() {
    if (current.length < LENGTH) return flash('5 harf yazmalısın')
    if (!data.valid.includes(current)) return flash('Bu kelime listede yok')
    const next = [...guesses, current]
    setGuesses(next)
    setCurrent('')
    setMessage('')
    if (daily) saveJson(`wordle-${data.day}`, next)
    if (next.includes(word) || next.length >= TRIES) finish(next)
  }

  function press(key) {
    if (over) return
    if (key === 'enter') submit()
    else if (key === 'back') setCurrent(c => c.slice(0, -1))
    else if (current.length < LENGTH) setCurrent(c => c + key)
  }

  // Bilgisayar klavyesi
  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey || e.metaKey) return
      const k = e.key.toLowerCase()
      if (k === 'enter') press('enter')
      else if (k === 'backspace') press('back')
      else if (/^[a-z]$/.test(k)) press(k)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!data) return <div className="panel">Yükleniyor...</div>

  // Klavye harflerinin renkleri: o harf için bulunan en iyi sonuç
  const keyState = {}
  for (const g of guesses) {
    evaluate(word, g).forEach((s, i) => {
      if ((RANK[s] ?? 0) > (RANK[keyState[g[i]]] ?? 0)) keyState[g[i]] = s
    })
  }

  const rows = Array.from({ length: TRIES }, (_, i) => guesses[i] ?? (i === guesses.length ? current : ''))

  return (
    <div className="page">
      <GameHead onBack={onBack}>
        {daily ? `📅 Günün kelimesi · ${data.day}` : '🎲 Serbest oyun'} · 🔥 seri {stats.streak}
      </GameHead>

      <div className="panel wordle">
        <div className="wordle-grid">
          {rows.map((g, r) => {
            const done = r < guesses.length
            const states = done ? evaluate(word, g) : []
            return (
              <div key={r} className={`wordle-row ${shake && r === guesses.length ? 'shake' : ''}`}>
                {Array.from({ length: LENGTH }, (_, c) => (
                  <span
                    key={c}
                    className={`wordle-cell ${done ? states[c] : g[c] ? 'filled' : ''}`}
                    style={done ? { animationDelay: `${c * 0.12}s` } : undefined}
                  >
                    {g[c] ?? ''}
                  </span>
                ))}
              </div>
            )
          })}
        </div>

        <p className="wordle-message">{message}</p>

        {over ? (
          <div className="wordle-result">
            <b>{won ? `🎉 ${guesses.length}. denemede bildin!` : '😅 Bu sefer olmadı'}</b>
            <p>
              <span className="wordle-answer">{word}</span> · {answer.meaning}
              <button className="btn btn-ghost small" onClick={() => speakText(word, 0.8)}>🔊</button>
            </p>
            {daily && <p className="muted small">Yarın yeni bir kelime gelecek. Oynanan: {stats.played} · Kazanılan: {stats.wins}</p>}
            <button className="btn btn-primary" onClick={startPractice}>🎲 Rastgele kelimeyle oyna</button>
          </div>
        ) : (
          <div className="wordle-keys">
            {ROWS.map((row, i) => (
              <div key={row} className="wordle-key-row">
                {i === 2 && <button className="wordle-key wide" onClick={() => press('enter')}>Enter</button>}
                {row.split('').map(k => (
                  <button key={k} className={`wordle-key ${keyState[k] ?? ''}`} onClick={() => press(k)}>{k}</button>
                ))}
                {i === 2 && <button className="wordle-key wide" onClick={() => press('back')} aria-label="Sil">⌫</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameWordle