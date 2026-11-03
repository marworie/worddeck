// ============================================================
// GameSpelling.jsx
// Spelling Bee: kelime sesli okunur, harfi harfine doğru yaz.
// İpuçları: Türkçe anlamı ve ilk harf (ipucu kullanınca yarım puan).
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { GameHead, GameOver, NotEnough } from './GameShell'
import { fetchGameWords, isLetters, shuffle, speakText } from './gameUtils'

const ROUND = 10

function GameSpelling({ source, onBack }) {
  const [words, setWords] = useState(null)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)     // 'right' | 'wrong'
  const [hints, setHints] = useState({ meaning: false, letter: false })
  const [points, setPoints] = useState(0)
  const inputRef = useRef(null)

  const current = words?.[index]
  const finished = words && index >= words.length

  function load() {
    setWords(null)
    setIndex(0)
    setPoints(0)
    fetchGameWords(source, 20).then(list =>
      setWords(shuffle(list.filter(w => isLetters(w.headword, 3, 12))).slice(0, ROUND)))
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni kelime: oku ve yazma kutusuna odaklan
  useEffect(() => {
    if (!current) return
    setTyped('')
    setResult(null)
    setHints({ meaning: false, letter: false })
    const t = setTimeout(() => speakText(current.headword, 0.8), 300)
    inputRef.current?.focus()
    return () => clearTimeout(t)
  }, [current])

  function check(e) {
    e.preventDefault()
    if (result) { setIndex(i => i + 1); return }   // cevaptan sonra Enter = sonraki
    if (!typed.trim()) return
    const ok = typed.trim().toLowerCase() === current.headword.toLowerCase()
    setResult(ok ? 'right' : 'wrong')
    if (ok) setPoints(p => p + (hints.meaning || hints.letter ? 0.5 : 1))
    speakText(current.headword, 0.8)
  }

  if (!words) return <div className="panel">Yükleniyor...</div>
  if (words.length === 0) return <NotEnough onBack={onBack} />

  if (finished) {
    return (
      <GameOver
        emoji={points === words.length ? '🏆' : '🐝'}
        title={`${points} / ${words.length} puan`}
        text="İpucusuz doğru = 1 puan, ipuçlu doğru = 0,5 puan"
        onAgain={load}
        onBack={onBack}
      />
    )
  }

  const answer = current.headword.toLowerCase()

  return (
    <div className="page">
      <GameHead onBack={onBack}>{index + 1} / {words.length} · 🐝 {points} puan</GameHead>

      <div className="panel spelling-game">
        <div className="balloon-top">
          <button className="btn btn-primary" onClick={() => speakText(current.headword, 0.8)}>🔊 Dinle</button>
          <button className="btn btn-ghost" onClick={() => speakText(current.headword, 0.5)}>🐢 Yavaş</button>
        </div>

        <div className="spelling-hints">
          {hints.meaning
            ? <span className="chip">🇹🇷 {current.meaning}</span>
            : <button className="btn btn-ghost small" disabled={!!result} onClick={() => setHints(h => ({ ...h, meaning: true }))}>💡 Anlamı</button>}
          {hints.letter
            ? <span className="chip">🔤 {answer[0].toUpperCase()}{'_ '.repeat(answer.length - 1)}</span>
            : <button className="btn btn-ghost small" disabled={!!result} onClick={() => setHints(h => ({ ...h, letter: true }))}>🔤 İlk harf</button>}
        </div>

        <form onSubmit={check} className="spelling-form">
          <input
            ref={inputRef}
            className={`dict-input spelling-input ${result ?? ''}`}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Duyduğun kelimeyi yaz..."
            readOnly={!!result}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn-primary" type="submit">{result ? 'Sonraki →' : 'Kontrol et'}</button>
        </form>

        {result && (
          <div className="spelling-answer">
            {result === 'right' ? <b>🎉 Doğru!</b> : <b>Doğrusu:</b>}
            {/* Harf harf karşılaştırma: yanlış harfler kırmızı */}
            <div className="spelling-letters">
              {[...answer].map((ch, i) => (
                <span key={i} className={typed.toLowerCase()[i] === ch ? 'ok' : 'bad'}>{ch}</span>
              ))}
            </div>
            <span className="muted">{current.meaning}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameSpelling