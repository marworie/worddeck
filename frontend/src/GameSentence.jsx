// ============================================================
// GameSentence.jsx
// Cümle dizme: örnek cümlenin kelimeleri karışık gelir, doğru sıraya dizilir.
// Cümleler dikte bölümündeki örnek cümlelerden gelir.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { GameHead, GameOver, NotEnough } from './GameShell'
import { shuffle, speakText } from './gameUtils'

const ROUND = 8

// Karşılaştırırken büyük/küçük harf ve noktalama önemli değil
const clean = w => w.toLowerCase().replace(/[^a-z0-9']/g, '')

function GameSentence({ source, onBack }) {
  const [items, setItems] = useState(null)      // { example, exampleTr, headword }
  const [index, setIndex] = useState(0)
  const [pool, setPool] = useState([])          // { id, text }
  const [picked, setPicked] = useState([])      // pool id'leri
  const [status, setStatus] = useState(null)    // 'right' | 'wrong' | 'skip'
  const [solved, setSolved] = useState(0)

  const current = items?.[index]
  const words = current ? current.example.split(/\s+/) : []
  const locked = status === 'right' || status === 'skip'
  const finished = items && index >= items.length

  function load() {
    setItems(null)
    setIndex(0)
    setSolved(0)
    const level = source === 'mine' ? 'A2' : source   // "Kelimelerim" için orta zorlukta cümleler
    apiFetch(`/api/Dictation?level=${level}&count=${ROUND}`)
      .then(r => (r.ok ? r.json() : []))
      .then(setItems)
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni cümle: kelimeleri karıştır (cümlenin kendisi gibi kalmasın)
  useEffect(() => {
    if (!current) return
    const tokens = current.example.split(/\s+/).map((text, id) => ({ id, text }))
    let mixed = shuffle(tokens)
    for (let i = 0; i < 5 && mixed.every((t, j) => t.id === j); i++) mixed = shuffle(tokens)
    setPool(mixed)
    setPicked([])
    setStatus(null)
  }, [current])   // eslint-disable-line react-hooks/exhaustive-deps

  function pick(id) {
    if (locked || picked.includes(id)) return
    const next = [...picked, id]
    setPicked(next)
    if (next.length < words.length) { setStatus(null); return }

    // Hepsi yerleşti: aynı kelimeler farklı sırada olabilir, metin olarak karşılaştır
    const built = next.map(i => clean(words[i])).join(' ')
    const target = words.map(clean).join(' ')
    if (built === target) {
      setStatus('right')
      setSolved(n => n + 1)
      speakText(current.example)
    } else {
      setStatus('wrong')
    }
  }

  function unpick(id) {
    if (locked) return
    setStatus(null)
    setPicked(p => p.filter(x => x !== id))
  }

  function skip() {
    setStatus('skip')
    speakText(current.example)
  }

  if (!items) return <div className="panel">Yükleniyor...</div>
  if (items.length === 0) return <NotEnough onBack={onBack} />

  if (finished) {
    return (
      <GameOver
        emoji={solved === items.length ? '🏆' : '🧩'}
        title={`${solved} / ${items.length} cümle`}
        text="Cümle kurmak dilbilgisini en hızlı öğrenme yollarından biri 💪"
        onAgain={load}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="page">
      <GameHead onBack={onBack}>{index + 1} / {items.length} · ✅ {solved}</GameHead>

      <div className="panel sentence-game">
        <p className="muted">🇹🇷 {current.exampleTr ?? 'Kelimeleri doğru sıraya diz'}</p>

        {/* Kurulan cümle */}
        <div className={`sg-line ${status ?? ''}`}>
          {status === 'skip'
            ? words.map((w, i) => <span key={i} className="sg-word placed">{w}</span>)
            : picked.map(id => (
              <button key={id} className="sg-word placed" onClick={() => unpick(id)} disabled={locked}>
                {words[id]}
              </button>
            ))}
          {picked.length === 0 && status !== 'skip' && <span className="muted small">Aşağıdaki kelimelere sırayla tıkla</span>}
        </div>

        {/* Karışık kelimeler */}
        <div className="sg-pool">
          {pool.map(t => (
            <button key={t.id} className="sg-word" disabled={locked || picked.includes(t.id)} onClick={() => pick(t.id)}>
              {t.text}
            </button>
          ))}
        </div>

        {status === 'wrong' && <p className="muted small">Sıra biraz karışık 🤔 Kelimeye tıklayıp geri alabilirsin.</p>}

        <div className="dict-actions" style={{ justifyContent: 'center' }}>
          {locked ? (
            <>
              <b>{status === 'right' ? '🎉 Harika!' : 'Doğrusu yukarıda'}</b>
              <button className="btn btn-ghost" onClick={() => speakText(current.example)}>🔊 Dinle</button>
              <button className="btn btn-primary" onClick={() => setIndex(i => i + 1)}>Sonraki →</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setPicked([])}>Temizle</button>
              <button className="btn btn-ghost" onClick={skip}>Pas geç</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameSentence