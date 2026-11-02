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

// ---------- Ortak: oyun rekorları (oyun + kaynak başına) ----------
function getBest(key, source) {
  try { return (JSON.parse(localStorage.getItem(key)) ?? {})[source] ?? null } catch { return null }
}

function setBestValue(key, source, value) {
  try {
    const all = JSON.parse(localStorage.getItem(key)) ?? {}
    localStorage.setItem(key, JSON.stringify({ ...all, [source]: value }))
  } catch { /* önemli değil */ }
}

function NotEnough({ onBack }) {
  return (
    <div className="panel">
      Bu kaynakta yeterli kelime yok. Önce birkaç kelime çalış ya da bir seviye seç.
      <div><button className="btn btn-ghost" onClick={onBack}>← Geri</button></div>
    </div>
  )
}

// ---------- Hafıza kartları ----------
function Memory({ source, onBack }) {
  const [cards, setCards] = useState(null)       // { key, wordId, text, lang }
  const [open, setOpen] = useState([])           // açık duran (henüz eşleşmemiş) kartlar, en fazla 2
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [best, setBest] = useState(() => getBest('memoryBest', source))
  const [newRecord, setNewRecord] = useState(false)

  const done = cards && cards.length > 0 && matched.size === cards.length / 2

  function load() {
    setCards(null)
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    setNewRecord(false)
    apiFetch(`/api/Games/words?source=${source}&count=${PAIRS}`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => setCards(shuffle(list.flatMap(p => [
        { key: `${p.wordId}-en`, wordId: p.wordId, text: p.headword, lang: 'en' },
        { key: `${p.wordId}-tr`, wordId: p.wordId, text: p.meaning, lang: 'tr' }
      ]))))
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Bitince rekor: daha az hamle daha iyi
  useEffect(() => {
    if (!done) return
    if (best == null || moves < best) {
      setBest(moves)
      setBestValue('memoryBest', source, moves)
      setNewRecord(true)
    }
  }, [done])   // eslint-disable-line react-hooks/exhaustive-deps

  function flip(card) {
    if (open.length === 2 || open.includes(card.key) || matched.has(card.wordId)) return
    if (card.lang === 'en') speakWord(card.text)

    const next = [...open, card.key]
    setOpen(next)
    if (next.length < 2) return

    setMoves(m => m + 1)
    const [a, b] = next.map(k => cards.find(c => c.key === k))
    if (a.wordId === b.wordId) {
      setMatched(m => new Set(m).add(a.wordId))
      setOpen([])
    } else {
      setTimeout(() => setOpen([]), 900)   // yanlışsa kısa süre görünür, sonra kapanır
    }
  }

  if (!cards) return <div className="panel">Yükleniyor...</div>
  if (cards.length < 4) return <NotEnough onBack={onBack} />

  return (
    <div className="page">
      <div className="dict-head">
        <button className="btn btn-ghost" onClick={onBack}>← Oyunlar</button>
        <span className="muted small">
          🔄 {moves} hamle{best != null && ` · 🏆 rekor ${best} hamle`}
        </span>
      </div>

      {done ? (
        <div className="panel dict-summary">
          <div className="dict-big">{newRecord ? '🏆' : '🧠'}</div>
          <h2>{moves} hamlede bitirdin</h2>
          <p className="muted">En iyi ihtimal {cards.length / 2} hamle {newRecord && '· Yeni rekor!'}</p>
          <div className="dict-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Tekrar oyna</button>
            <button className="btn btn-ghost" onClick={onBack}>Oyunlar</button>
          </div>
        </div>
      ) : (
        <div className="memory-grid">
          {cards.map(c => {
            const shown = open.includes(c.key) || matched.has(c.wordId)
            return (
              <button
                key={c.key}
                className={`memory-card ${shown ? 'shown' : ''} ${matched.has(c.wordId) ? 'matched' : ''} ${c.lang}`}
                onClick={() => flip(c)}
              >
                <span className="memory-inner">
                  <span className="memory-front">?</span>
                  <span className="memory-back">{c.text}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Hızlı karar ----------
const QUICK_SECONDS = 60

// Yarı yarıya doğru anlam ya da başka bir kelimenin anlamı
function makeQuestion(list, prev) {
  let w
  do { w = list[Math.floor(Math.random() * list.length)] } while (list.length > 1 && w.headword === prev?.word)
  const truthy = Math.random() < 0.5
  const others = list.filter(o => o.wordId !== w.wordId)
  const meaning = truthy ? w.meaning : others[Math.floor(Math.random() * others.length)].meaning
  return { word: w.headword, meaning, truthy }
}

function QuickGame({ source, onBack }) {
  const [list, setList] = useState(null)
  const [q, setQ] = useState(null)
  const [score, setScore] = useState(0)
  const [wrongs, setWrongs] = useState(0)
  const [left, setLeft] = useState(QUICK_SECONDS)
  const [running, setRunning] = useState(false)
  const [flash, setFlash] = useState(null)   // 'ok' | 'bad'
  const [best, setBest] = useState(() => getBest('quickBest', source))
  const [newRecord, setNewRecord] = useState(false)

  function load() {
    setList(null)
    setRunning(false)
    apiFetch(`/api/Games/words?source=${source}&count=20`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setList(data)
        if (data.length < 4) return
        setQ(makeQuestion(data))
        setScore(0)
        setWrongs(0)
        setLeft(QUICK_SECONDS)
        setNewRecord(false)
        setRunning(true)
      })
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Geri sayım
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [running])

  // Süre bitti: rekor kontrolü
  useEffect(() => {
    if (!running || left > 0) return
    setRunning(false)
    if (best == null || score > best) {
      setBest(score)
      setBestValue('quickBest', source, score)
      setNewRecord(true)
    }
  }, [left])   // eslint-disable-line react-hooks/exhaustive-deps

  function answer(saysTrue) {
    if (!running) return
    const correct = saysTrue === q.truthy
    if (correct) setScore(s => s + 1)
    else setWrongs(w => w + 1)
    setFlash(correct ? 'ok' : 'bad')
    setTimeout(() => setFlash(null), 250)
    setQ(prev => makeQuestion(list, prev))
  }

  // ← yanlış, → doğru
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'ArrowLeft') answer(false)
      if (e.key === 'ArrowRight') answer(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!list) return <div className="panel">Yükleniyor...</div>
  if (list.length < 4) return <NotEnough onBack={onBack} />

  return (
    <div className="page">
      <div className="dict-head">
        <button className="btn btn-ghost" onClick={onBack}>← Oyunlar</button>
        <span className="muted small">✅ {score} · ❌ {wrongs}{best != null && ` · 🏆 rekor ${best}`}</span>
      </div>

      {running ? (
        <div className={`panel quick-card ${flash ?? ''}`}>
          <div className="quick-timer"><span style={{ width: `${(left / QUICK_SECONDS) * 100}%` }} /></div>
          <span className="muted small">⏱️ {left} sn</span>
          <div className="quick-word">{q.word}</div>
          <div className="quick-eq">=</div>
          <div className="quick-meaning">{q.meaning}</div>
          <div className="quick-buttons">
            <button className="btn quick-no" onClick={() => answer(false)}>✗ Yanlış <span className="desktop-hint">←</span></button>
            <button className="btn quick-yes" onClick={() => answer(true)}>✓ Doğru <span className="desktop-hint">→</span></button>
          </div>
        </div>
      ) : (
        <div className="panel dict-summary">
          <div className="dict-big">{newRecord ? '🏆' : '⚡'}</div>
          <h2>{score} doğru</h2>
          <p className="muted">60 saniyede {score + wrongs} cevap, {wrongs} yanlış {newRecord && '· Yeni rekor!'}</p>
          <div className="dict-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Tekrar oyna</button>
            <button className="btn btn-ghost" onClick={onBack}>Oyunlar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Harf karıştırma ----------
function scrambleLetters(word) {
  const letters = word.split('')
  for (let i = 0; i < 10; i++) {
    const s = shuffle(letters)
    if (s.join('') !== word) return s   // karışık hali kelimenin kendisi olmasın
  }
  return letters
}

function Scramble({ source, onBack }) {
  const [words, setWords] = useState(null)
  const [index, setIndex] = useState(0)
  const [pool, setPool] = useState([])        // { id, ch }: karışık harfler
  const [picked, setPicked] = useState([])    // seçilen harflerin id'leri (sırasıyla)
  const [status, setStatus] = useState(null)  // 'right' | 'wrong' | 'skip'
  const [solved, setSolved] = useState(0)

  const current = words?.[index]
  const answer = current?.headword.toLowerCase() ?? ''
  const locked = status === 'right' || status === 'skip'
  const finished = words && index >= words.length

  function load() {
    setWords(null)
    setIndex(0)
    setSolved(0)
    apiFetch(`/api/Games/words?source=${source}&count=20`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => setWords(list.filter(w => /^[a-z]{3,10}$/i.test(w.headword)).slice(0, ROUND)))
  }

  useEffect(load, [source])   // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni kelime: harfleri karıştır
  useEffect(() => {
    if (!current) return
    setPool(scrambleLetters(answer).map((ch, id) => ({ id, ch })))
    setPicked([])
    setStatus(null)
  }, [current])   // eslint-disable-line react-hooks/exhaustive-deps

  // Bütün harfler yerleşince kontrol et
  useEffect(() => {
    if (!current || picked.length !== answer.length) return
    if (picked.map(id => pool[id].ch).join('') === answer) {
      setStatus('right')
      setSolved(n => n + 1)
      speakWord(current.headword)
    } else {
      setStatus('wrong')
    }
  }, [picked])   // eslint-disable-line react-hooks/exhaustive-deps

  function pick(id) {
    if (locked || picked.includes(id)) return
    setStatus(null)
    setPicked(p => [...p, id])
  }

  function unpick(id) {
    if (locked) return
    setStatus(null)
    setPicked(p => p.filter(x => x !== id))
  }

  function skip() {
    setStatus('skip')
    speakWord(current.headword)
  }

  // Klavye: harf yazınca o harf seçilir, Backspace son harfi geri alır, Enter sonraki
  useEffect(() => {
    const onKey = e => {
      if (!current) return
      if (e.key === 'Enter' && locked) { setIndex(i => i + 1); return }
      if (e.key === 'Backspace' && picked.length) { unpick(picked[picked.length - 1]); return }
      const k = e.key.toLowerCase()
      const free = pool.find(p => p.ch === k && !picked.includes(p.id))
      if (free) pick(free.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!words) return <div className="panel">Yükleniyor...</div>
  if (words.length === 0) return <NotEnough onBack={onBack} />

  if (finished) {
    return (
      <div className="page">
        <div className="panel dict-summary">
          <div className="dict-big">{solved === words.length ? '🏆' : '🔀'}</div>
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
        <span className="muted small">{index + 1} / {words.length} · ✅ {solved}</span>
      </div>

      <div className="panel hangman">
        <p className="muted">🇹🇷 {current.meaning}</p>

        {/* Kurulan kelime: harfe tıklayınca geri gider */}
        <div className={`scr-slots ${status ?? ''}`}>
          {answer.split('').map((c, i) => {
            const id = picked[i]
            const ch = status === 'skip' ? c : id != null ? pool[id].ch : ''
            return (
              <button key={i} className="scr-slot" onClick={() => id != null && unpick(id)} disabled={locked}>
                {ch}
              </button>
            )
          })}
        </div>

        {/* Karışık harfler */}
        <div className="hm-keys">
          {pool.map(p => (
            <button key={p.id} className="hm-key" disabled={locked || picked.includes(p.id)} onClick={() => pick(p.id)}>
              {p.ch}
            </button>
          ))}
        </div>

        {status === 'wrong' && <p className="muted small">Olmadı, harflere tıklayıp yerlerini değiştir 🤔</p>}

        <div className="dict-actions" style={{ justifyContent: 'center' }}>
          {locked ? (
            <>
              <b>{status === 'right' ? '🎉 Bildin!' : `Kelime: ${current.headword}`}</b>
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

// ---------- Oyunlar sayfası ----------
const GAMES = [
  { id: 'match',    emoji: '🃏', title: 'Eşleştirme',      desc: 'İngilizce kelimeyi Türkçe anlamıyla eşleştir. Ne kadar hızlısın?' },
  { id: 'memory',   emoji: '🧠', title: 'Hafıza kartları', desc: 'Kartlar kapalı! Kelimeyi ve anlamını hatırlayarak en az hamlede eşleştir.' },
  { id: 'quick',    emoji: '⚡', title: 'Hızlı karar',     desc: '60 saniye: anlam doğru mu yanlış mı? ← → tuşlarıyla oyna.' },
  { id: 'scramble', emoji: '🔀', title: 'Harf karıştırma', desc: 'Karışık harflerden kelimeyi kur. Türkçe anlamı ipucu.' },
  { id: 'hangman',  emoji: '🪢', title: 'Adam asmaca',     desc: 'Harf harf tahmin et, 6 hatada adam asılır.' }
]

const SCREENS = { match: MatchGame, memory: Memory, quick: QuickGame, scramble: Scramble, hangman: Hangman }

function Games() {
  const [source, setSource] = useState('mine')
  const [game, setGame] = useState(null)

  if (game) {
    const Screen = SCREENS[game]
    return <Screen source={source} onBack={() => setGame(null)} />
  }

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
        {GAMES.map(g => (
          <button key={g.id} className="game-card panel" onClick={() => setGame(g.id)}>
            <span className="game-emoji">{g.emoji}</span>
            <b>{g.title}</b>
            <span className="muted small">{g.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Games