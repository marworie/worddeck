// ============================================================
// PlacementTest.jsx
// Seviye belirleme testi: A1'den başlar, her seviyede 5 soru.
// 4+ doğru → üst seviye; değilse test biter ve o seviye önerilir.
// Doğru cevaplar sunucuda kontrol edilir, burada sadece seçilenler tutulur.
// ============================================================

import { useState } from 'react'
import { apiFetch } from './api'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

const TYPE_TITLES = {
  cloze: 'Boşluğa hangisi gelir?',
  definition: 'Bu tanım hangi kelimeye ait?',
  'tr-en': 'Bu kelimenin İngilizcesi hangisi?',
  'en-tr': 'Bu kelime ne demek?'
}

// Üstteki seviye şeridi: geçilenler, şu anki, sıradakiler
function LevelSteps({ level }) {
  const current = LEVELS.indexOf(level)
  return (
    <div className="placement-levels">
      {LEVELS.map((l, i) => (
        <span key={l} className={`placement-level ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}>
          {l}
        </span>
      ))}
    </div>
  )
}

// onExit: ana sayfaya dön, onStartLevel(level): önerilen seviyeyle çalışmaya başla
function PlacementTest({ onExit, onStartLevel }) {
  const [phase, setPhase] = useState('intro')   // intro | loading | question | result | error
  const [level, setLevel] = useState('A1')
  const [session, setSession] = useState(null)  // { sessionId, questions }
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [history, setHistory] = useState([])    // [{ level, correct, total }]
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function fail(message) {
    setError(message)
    setPhase('error')
  }

  // Bir seviyenin 5 sorusunu çek
  async function loadLevel(lvl) {
    setPhase('loading')
    setLevel(lvl)
    const response = await apiFetch(`/api/Placement/questions?level=${lvl}`)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return fail(data.message || 'Sorular yüklenemedi.')
    }
    setSession(await response.json())
    setIndex(0)
    setAnswers([])
    setPhase('question')
  }

  // Şık seçildi (Bilmiyorum ise null). Son soruysa cevapları gönder
  async function choose(optionId) {
    const next = [...answers, optionId]
    setAnswers(next)
    if (next.length < session.questions.length) {
      setIndex(index + 1)
      return
    }

    setPhase('loading')
    const response = await apiFetch('/api/Placement/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId: session.sessionId, answers: next })
    })
    if (!response.ok) return fail('Cevaplar gönderilemedi.')

    const data = await response.json()
    setHistory(prev => [...prev, { level, correct: data.correct, total: data.total }])

    if (data.finished) {
      setResult(data.level)
      setPhase('result')
    } else {
      loadLevel(data.level)
    }
  }

  // Boşluklu cümlede boşluğu vurgula
  function renderPrompt(q) {
    if (q.type === 'cloze') {
      const parts = q.prompt.split('_____')
      return parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="blank">_____</span>}
        </span>
      ))
    }
    return q.prompt
  }

  if (phase === 'intro') {
    return (
      <div className="placement panel">
        <h2>Seviyeni bulalım</h2>
        <p>A1'den başlayarak her seviyeden 5 soru gelecek. Bir seviyede 4 ya da daha fazla doğru yaparsan bir üst seviyeye geçersin.</p>
        <p className="muted">Emin değilsen tahmin etme, <b>Bilmiyorum</b>'u seç: sonuç daha doğru çıkar.</p>
        <div className="placement-actions">
          <button className="btn btn-primary" onClick={() => loadLevel('A1')}>Başla</button>
          <button className="btn btn-ghost" onClick={onExit}>Vazgeç</button>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return <p className="loading-text">Sorular hazırlanıyor...</p>
  }

  if (phase === 'error') {
    return (
      <div className="placement panel">
        <p>{error}</p>
        <button className="btn btn-ghost" onClick={onExit}>Ana sayfaya dön</button>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div className="placement panel">
        <p className="muted">Önerilen seviyen</p>
        <div className="placement-result">{result}</div>
        <ul className="placement-history">
          {history.map(h => (
            <li key={h.level}>
              <span className="level-badge">{h.level}</span> {h.correct}/{h.total}
              {h.correct >= 4 ? ' ✓' : ''}
            </li>
          ))}
        </ul>
        <div className="placement-actions">
          <button className="btn btn-primary" onClick={() => onStartLevel(result)}>{result} ile çalışmaya başla</button>
          <button className="btn btn-ghost" onClick={onExit}>Ana sayfa</button>
        </div>
      </div>
    )
  }

  // phase === 'question'
  const q = session.questions[index]
  return (
    <div className="placement panel">
      <LevelSteps level={level} />
      <p className="muted">Soru {index + 1} / {session.questions.length}</p>
      <h3>{TYPE_TITLES[q.type]}</h3>
      <p className={`placement-prompt ${q.type === 'en-tr' || q.type === 'tr-en' ? 'big' : ''}`}>
        {renderPrompt(q)}
      </p>

      <div className="placement-options">
        {q.options.map(o => (
          <button key={`${index}-${o.id}`} className="placement-option" onClick={() => choose(o.id)}>
            {o.text}
          </button>
        ))}
      </div>
      <button className="btn btn-ghost placement-skip" onClick={() => choose(null)}>Bilmiyorum</button>
    </div>
  )
}

export default PlacementTest