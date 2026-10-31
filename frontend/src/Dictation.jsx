// ============================================================
// Dictation.jsx
// Dikte: cümle sesli okunur, kullanıcı duyduğunu yazar,
// backend kelime kelime karşılaştırır (doğru / yanlış / eksik / fazla).
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import { pickEnglishVoice } from './readerText'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const COUNT = 10
const canSpeak = 'speechSynthesis' in window

function speak(text, rate) {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  const voice = pickEnglishVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}

// Kontrol sonucu: her kelime durumuna göre renkli
function ResultLine({ tokens }) {
  return (
    <p className="dict-result-line">
      {tokens.map((t, i) => (
        <span key={i} className={`dict-tok dict-${t.status}`} title={t.status === 'wrong' ? `Sen: ${t.typed}` : undefined}>
          {t.status === 'wrong' && <s className="dict-typed">{t.typed}</s>}
          {t.word}
        </span>
      ))}
    </p>
  )
}

function Dictation({ onExit }) {
  const [level, setLevel] = useState(null)
  const [items, setItems] = useState(null)
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)   // { tokens, score }
  const [scores, setScores] = useState([])
  const inputRef = useRef(null)

  const current = items?.[index]
  const finished = items && index >= items.length

  // Sayfadan çıkınca okuma dursun
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel() }, [])

  // Yeni cümle gelince otomatik oku ve yazma kutusuna odaklan
  useEffect(() => {
    if (!current) return
    speak(current.example, 0.9)
    inputRef.current?.focus()
  }, [current])

  function start(lv) {
    setLevel(lv)
    setItems(null)
    setIndex(0)
    setScores([])
    setResult(null)
    setTyped('')
    apiFetch(`/api/Dictation?level=${lv}&count=${COUNT}`)
      .then(r => (r.ok ? r.json() : []))
      .then(setItems)
  }

  async function check() {
    if (!typed.trim() || result) return
    const r = await apiFetch('/api/Dictation/check', {
      method: 'POST',
      body: JSON.stringify({ expected: current.example, typed })
    })
    if (!r.ok) return
    const data = await r.json()
    setResult(data)
    setScores(s => [...s, data.score])
  }

  function next() {
    setResult(null)
    setTyped('')
    setIndex(i => i + 1)
  }

  // Enter: önce kontrol, sonra sonraki cümle (Shift+Enter yeni satır)
  function onKeyDown(e) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    result ? next() : check()
  }

  // ---------- Seviye seçimi ----------
  if (!level) {
    return (
      <div className="page dictation">
        <h2 className="page-title">🎧 Dikte</h2>
        <p className="muted">Cümleyi dinle, duyduğunu yaz. Her seferde {COUNT} cümle.</p>
        <div className="dict-levels">
          {LEVELS.map(l => (
            <button key={l} className="btn btn-primary" onClick={() => start(l)}>{l}</button>
          ))}
        </div>
        {!canSpeak && <p className="muted small">Tarayıcın sesli okumayı desteklemiyor, Chrome ya da Edge dene.</p>}
      </div>
    )
  }

  if (!items) return <div className="panel">Yükleniyor...</div>
  if (items.length === 0) return <div className="panel">Bu seviyede uygun cümle bulunamadı.</div>

  // ---------- Sonuç ----------
  if (finished) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    return (
      <div className="page dictation">
        <div className="panel dict-summary">
          <div className="dict-big">{avg >= 90 ? '🏆' : avg >= 70 ? '👏' : '💪'}</div>
          <h2>%{avg} doğru</h2>
          <p className="muted">{level} seviyesinde {items.length} cümle yazdın.</p>
          <div className="dict-actions">
            <button className="btn btn-primary" onClick={() => start(level)}>Tekrar</button>
            <button className="btn btn-ghost" onClick={() => setLevel(null)}>Başka seviye</button>
            <button className="btn btn-ghost" onClick={onExit}>Ana sayfa</button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Cümle ----------
  return (
    <div className="page dictation">
      <div className="dict-head">
        <button className="btn btn-ghost" onClick={() => setLevel(null)}>← Seviyeler</button>
        <span className="muted small">{level} · {index + 1} / {items.length}</span>
      </div>
      <div className="reader-progress"><span style={{ width: `${(index / items.length) * 100}%` }} /></div>

      <div className="panel dict-card">
        <div className="dict-play">
          <button className="btn btn-primary" onClick={() => speak(current.example, 0.9)}>🔊 Dinle</button>
          <button className="btn btn-ghost" onClick={() => speak(current.example, 0.6)}>🐢 Yavaş</button>
          <span className="muted small">İpucu: cümlede <b>{current.headword}</b> geçiyor</span>
        </div>

        <textarea
          ref={inputRef}
          className="dict-input"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Duyduğunu yaz, Enter ile kontrol et..."
          disabled={!!result}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />

        {result && (
          <div className="dict-result">
            <div className="dict-score">%{result.score}</div>
            <ResultLine tokens={result.tokens} />
            {current.exampleTr && <p className="muted small">🇹🇷 {current.exampleTr}</p>}
            <div className="dict-legend muted small">
              <span className="dict-tok dict-ok">doğru</span>
              <span className="dict-tok dict-wrong">yanlış</span>
              <span className="dict-tok dict-missing">eksik</span>
              <span className="dict-tok dict-extra">fazla</span>
            </div>
          </div>
        )}

        <div className="dict-actions">
          {result
            ? <button className="btn btn-primary" onClick={next}>Sonraki →</button>
            : <button className="btn btn-primary" onClick={check} disabled={!typed.trim()}>Kontrol et</button>}
        </div>
      </div>
    </div>
  )
}

export default Dictation