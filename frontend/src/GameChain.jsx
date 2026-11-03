// ============================================================
// GameChain.jsx
// Kelime zinciri: bilgisayarla sırayla oynanır. Her kelime bir öncekinin
// son harfiyle başlamalı. 20 saniyede kelime bulamazsan oyun biter.
// Bilgisayar kelime bulamazsa sen kazanırsın.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import { GameHead, GameOver } from './GameShell'
import { getBest, pickRandom, setBestValue, speakText } from './gameUtils'

const TURN_SECONDS = 20
const START_LETTERS = 'abcdefghilmnprstw'

function GameChain({ onBack }) {
  const [chain, setChain] = useState([])        // { word, meaning, by: 'me' | 'cpu' }
  const [typed, setTyped] = useState('')
  const [left, setLeft] = useState(TURN_SECONDS)
  const [state, setState] = useState('loading') // loading | play | thinking | over | won
  const [message, setMessage] = useState('')
  const [best, setBest] = useState(() => getBest('chainBest'))
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const last = chain[chain.length - 1]
  const letter = last ? last.word[last.word.length - 1] : ''
  const myCount = chain.filter(c => c.by === 'me').length

  // Bilgisayarın hamlesi: verilen harfle başlayan, kullanılmamış bir kelime
  async function cpuMove(startLetter, used) {
    setState('thinking')
    const r = await apiFetch(`/api/Games/chain/next?letter=${startLetter}&used=${encodeURIComponent(used.join(','))}`)
    if (r.status === 204 || !r.ok) { setState('won'); return }
    const w = await r.json()
    setChain(c => [...c, { word: w.headword, meaning: w.meaning, by: 'cpu' }])
    speakText(w.headword, 0.9)
    setLeft(TURN_SECONDS)
    setState('play')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function start() {
    setChain([])
    setTyped('')
    setMessage('')
    cpuMove(pickRandom([...START_LETTERS]), [])
  }

  useEffect(start, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // Süre sayacı (sadece senin sıranda)
  useEffect(() => {
    if (state !== 'play') return
    const t = setInterval(() => setLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [state])

  // Süre bitti ya da oyun bitti: rekor
  useEffect(() => {
    if (state === 'play' && left <= 0) setState('over')
  }, [left, state])

  useEffect(() => {
    if (state !== 'over' && state !== 'won') return
    if (best == null || myCount > best) {
      setBest(myCount)
      setBestValue('chainBest', 'all', myCount)
    }
  }, [state])   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni kelime eklenince listenin sonuna kaydır
  useEffect(() => {
    listRef.current?.scrollTo({ left: listRef.current.scrollWidth, behavior: 'smooth' })
  }, [chain])

  async function submit(e) {
    e.preventDefault()
    const word = typed.trim().toLowerCase()
    if (!word || state !== 'play') return

    const used = chain.map(c => c.word)
    const r = await apiFetch('/api/Games/chain/check', {
      method: 'POST',
      body: JSON.stringify({ prev: last?.word, word, used })
    })
    const res = r.ok ? await r.json() : { ok: false, reason: 'Kontrol edilemedi' }
    if (!res.ok) { setMessage(res.reason); return }

    setMessage('')
    setTyped('')
    const next = [...chain, { word, meaning: res.meaning, by: 'me' }]
    setChain(next)
    cpuMove(word[word.length - 1], next.map(c => c.word))
  }

  if (state === 'over' || state === 'won') {
    return (
      <GameOver
        emoji={state === 'won' ? '🏆' : '⏰'}
        title={state === 'won' ? 'Bilgisayarı yendin!' : `Süre doldu · ${myCount} kelime`}
        text={state === 'won' ? `"${letter}" ile başlayan kelime bulamadı 😄` : best != null ? `Rekorun: ${best} kelime` : null}
        onAgain={start}
        onBack={onBack}
      >
        <div className="rain-missed">
          {chain.map((c, i) => <span key={i} className={`chip chain-${c.by}`}>{c.word} = {c.meaning}</span>)}
        </div>
      </GameOver>
    )
  }

  return (
    <div className="page">
      <GameHead onBack={onBack}>🔗 {myCount} kelime{best != null && ` · 🏆 ${best}`}</GameHead>

      <div className="panel chain-game">
        <div className="chain-list" ref={listRef}>
          {chain.map((c, i) => (
            <div key={i} className={`chain-item chain-${c.by}`}>
              <b>{c.word}</b>
              <small>{c.meaning}</small>
              <span className="chain-by">{c.by === 'me' ? 'Sen' : '🤖'}</span>
            </div>
          ))}
          {state === 'thinking' && <div className="chain-item chain-cpu thinking">🤖 düşünüyor...</div>}
        </div>

        {state === 'play' && (
          <>
            <div className="chain-turn">
              <span><b className="chain-letter">{letter.toUpperCase()}</b> harfiyle başlayan bir kelime yaz</span>
              <span className={`chain-timer ${left <= 5 ? 'danger' : ''}`}>⏱️ {left}</span>
            </div>
            <form className="chain-form" onSubmit={submit}>
              <input
                ref={inputRef}
                className="dict-input"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder={`${letter}...`}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
              />
              <button className="btn btn-primary" type="submit">Gönder</button>
            </form>
            {message && <p className="wordle-message">{message}</p>}
          </>
        )}
        {state === 'loading' && <p className="muted">Hazırlanıyor...</p>}
      </div>
    </div>
  )
}

export default GameChain