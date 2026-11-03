// ============================================================
// GameBalloon.jsx
// Balon patlatma (dinleme): kelime sesli okunur, uçan balonlardan
// doğru yazılmış olanı patlat. İlk denemede bilinen kelimeler puan getirir.
// ============================================================

import { useEffect, useState } from 'react'
import { GameHead, GameOver, NotEnough } from './GameShell'
import { fetchGameWords, shuffle, speakText } from './gameUtils'

const ROUND = 10
const OPTIONS = 4
const COLORS = ['#f87171', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#f472b6']

function GameBalloon({ source, onBack }) {
  const [words, setWords] = useState(null)
  const [rounds, setRounds] = useState([])      // { target, options: [{ word, color }] }
  const [index, setIndex] = useState(0)
  const [popped, setPopped] = useState([])      // tıklanan balonlar
  const [firstTry, setFirstTry] = useState(0)
  const [solved, setSolved] = useState(false)

  const round = rounds[index]
  const finished = words && rounds.length > 0 && index >= rounds.length

  function load() {
    setWords(null)
    setIndex(0)
    setFirstTry(0)
    fetchGameWords(source, 20).then(list => {
      setWords(list)
      if (list.length < OPTIONS) return
      // Her tur: bir hedef kelime + listeden 3 farklı kelime
      const targets = shuffle(list).slice(0, ROUND)
      setRounds(targets.map(t => ({
        target: t,
        options: shuffle([t, ...shuffle(list.filter(w => w.wordId !== t.wordId)).slice(0, OPTIONS - 1)])
          .map((w, i) => ({ word: w, color: COLORS[(i + t.wordId) % COLORS.length] }))
      })))
    })
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni turda kelimeyi oku
  useEffect(() => {
    if (!round) return
    setPopped([])
    setSolved(false)
    const t = setTimeout(() => speakText(round.target.headword, 0.85), 300)
    return () => clearTimeout(t)
  }, [round])

  function pop(option) {
    if (solved || popped.includes(option.word.wordId)) return
    setPopped(p => [...p, option.word.wordId])
    if (option.word.wordId === round.target.wordId) {
      setSolved(true)
      if (popped.length === 0) setFirstTry(n => n + 1)
    }
  }

  if (!words) return <div className="panel">Yükleniyor...</div>
  if (words.length < OPTIONS) return <NotEnough onBack={onBack} />

  if (finished) {
    return (
      <GameOver
        emoji={firstTry === rounds.length ? '🏆' : '🎈'}
        title={`${firstTry} / ${rounds.length} ilk denemede`}
        text="Kelimeyi duyup yazılışını tanımak dinlemeyi çok geliştirir 👂"
        onAgain={load}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="page">
      <GameHead onBack={onBack}>{index + 1} / {rounds.length} · 🎯 {firstTry}</GameHead>

      <div className="panel balloon-game">
        <div className="balloon-top">
          <button className="btn btn-primary" onClick={() => speakText(round.target.headword, 0.85)}>🔊 Tekrar dinle</button>
          <button className="btn btn-ghost" onClick={() => speakText(round.target.headword, 0.55)}>🐢 Yavaş</button>
        </div>

        <div className="balloon-sky">
          {round.options.map((o, i) => {
            const isPopped = popped.includes(o.word.wordId)
            const isTarget = o.word.wordId === round.target.wordId
            return (
              <button
                key={o.word.wordId}
                className={`balloon ${isPopped ? (isTarget ? 'pop-right' : 'pop-wrong') : ''}`}
                style={{ '--balloon': o.color, animationDelay: `${i * 0.4}s` }}
                onClick={() => pop(o)}
                disabled={solved}
              >
                <span className="balloon-text">{o.word.headword}</span>
              </button>
            )
          })}
        </div>

        {solved ? (
          <div className="hm-result">
            <b>🎉 {round.target.headword} = {round.target.meaning}</b>
            <button className="btn btn-primary" onClick={() => setIndex(i => i + 1)}>Sonraki →</button>
          </div>
        ) : (
          <p className="muted small">Duyduğun kelimenin balonunu patlat 🎈</p>
        )}
      </div>
    </div>
  )
}

export default GameBalloon