// ============================================================
// Reader.jsx
// Hikaye okuyucu: kitap görünümü, sayfa çevirme (ok, tuş, sürükleme),
// kelimenin üzerine gelince anlam, tıklayınca kelime detayı,
// kelime durumlarına göre renkler (kullanıcı seçer),
// sesli okuma (okunan kelime vurgulanır, sayfa kendiliğinden çevrilir).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import {
  DEFAULT_COLORS, STATUS_LABELS, loadColors, pickEnglishVoice, saveColors, softColor, tokenize, uniqueWords
} from './readerText'
import { useToast } from './ToastContext'
import WordDetailModal from './WordDetailModal'

const STATUS_TEXT = { new: 'Hiç bilmiyorsun', studying: 'Tekrar etmen gerek', known: 'Biliyorsun', learned: 'Öğrendin' }
const DRAG_DISTANCE = 60   // bu kadar piksel sürüklenince sayfa çevrilir
const TURN_MS = 600        // sayfa çevirme animasyonu
const canSpeak = 'speechSynthesis' in window

// Bir sayfanın metni: tanınan kelimeler etkileşimli, okunan kelime vurgulu
function PageText({ text, words, active, onHover, onLeave, onPick }) {
  return text.split('\n\n').map((para, i) => {
    let offset = 0   // kelimenin paragraf içindeki yeri (sesli okumadaki charIndex ile eşleşir)
    return (
      <p key={i}>
        {tokenize(para).map((t, j) => {
          const start = offset
          offset += t.text.length
          const reading = active && active.para === i && active.char === start
          const info = t.word ? words.get(t.key) : null

          if (!info) return <span key={j} className={reading ? 'rw-speaking' : undefined}>{t.text}</span>
          return (
            <span
              key={j}
              className={`rw rw-${info.status} ${reading ? 'rw-speaking' : ''}`}
              onMouseEnter={e => onHover(info, t.text, e.currentTarget)}
              onMouseLeave={onLeave}
              onClick={() => onPick(info)}
            >
              {t.text}
            </span>
          )
        })}
      </p>
    )
  })
}

function Reader({ storyId, onExit }) {
  const showToast = useToast()
  const [story, setStory] = useState(null)
  const [words, setWords] = useState(new Map())
  const [index, setIndex] = useState(0)          // görünen ilk sayfa
  const [turning, setTurning] = useState(null)   // çevrilen sayfa (animasyon)
  const [tip, setTip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [colors, setColors] = useState(loadColors)
  const [showPalette, setShowPalette] = useState(false)
  const [speaking, setSpeaking] = useState(null) // { page, para, char }: okunan yer
  const [rate, setRate] = useState(0.9)
  const [wide] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  const dragStart = useRef(null)
  const speakingRef = useRef(false)              // sesli okuma sürüyor mu (geri çağrılarda güncel değer)
  const indexRef = useRef(0)
  const turnRef = useRef(null)
  const rateRef = useRef(0.9)                    // geri çağrılarda güncel hız
  const genRef = useRef(0)                       // her okuma başlangıcının numarası; eski okumanın olayları yok sayılır
  const lastPos = useRef(null)                   // en son okunan kelime: { page, para, char }
  const perView = wide ? 2 : 1

  // Hikayedeki kelimelerin anlamı ve durumu
  const loadWords = useCallback(pages => {
    apiFetch('/api/Reader/analyze', { method: 'POST', body: JSON.stringify({ words: uniqueWords(pages) }) })
      .then(r => (r.ok ? r.json() : []))
      .then(list => setWords(new Map(list.map(w => [w.word, w]))))
  }, [])

  useEffect(() => {
    apiFetch(`/api/Stories/${storyId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(s => {
        if (!s) return
        setStory(s)
        setIndex(s.page - (s.page % perView))   // iki sayfalı görünümde soldaki sayfa çift olmalı
        loadWords(s.pages)
      })
  }, [storyId, perView, loadWords])

  const stopSpeaking = useCallback(() => {
    genRef.current++
    speakingRef.current = false
    if (canSpeak) window.speechSynthesis.cancel()
    setSpeaking(null)
  }, [])

  // Sayfadan çıkınca okuma dursun
  useEffect(() => () => {
    genRef.current++
    speakingRef.current = false
    if (canSpeak) window.speechSynthesis.cancel()
  }, [])

  // auto: sesli okuma kendisi çeviriyorsa okuma durmasın
  const turn = useCallback((dir, auto = false) => {
    if (!story || turning) return
    const next = index + dir * perView
    if (next < 0 || next >= story.pages.length) return
    if (!auto && speakingRef.current) stopSpeaking()

    const current = story.pages.slice(index, index + perView)
    setTip(null)
    setTurning({
      dir,
      text: dir > 0 ? current[current.length - 1] : current[0],
      number: dir > 0 ? index + current.length : index + 1
    })
    setIndex(next)
    apiFetch(`/api/Stories/${story.id}/progress`, { method: 'PUT', body: JSON.stringify({ page: next }) })
    setTimeout(() => setTurning(null), TURN_MS)
  }, [story, index, perView, turning, stopSpeaking])

  // Sesli okumanın geri çağrıları her zaman güncel sayfa ve turn'ü görsün
  useEffect(() => {
    indexRef.current = index
    turnRef.current = turn
  })

  // ← → tuşları
  useEffect(() => {
    const onKey = e => {
      if (selected) return
      if (e.key === 'ArrowRight') turn(1)
      if (e.key === 'ArrowLeft') turn(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, selected])

  // Paragrafı (istenirse ortasındaki bir kelimeden) oku, bitince sonrakine geç
  function speakFrom(page, para, startChar = 0) {
    if (!speakingRef.current) return
    const gen = genRef.current
    const paragraphs = story.pages[page].split('\n\n')

    if (para >= paragraphs.length) {
      const next = page + 1
      if (next >= story.pages.length) { lastPos.current = null; stopSpeaking(); return }
      const mustTurn = next >= indexRef.current + perView
      if (mustTurn) turnRef.current(1, true)
      setTimeout(() => { if (gen === genRef.current) speakFrom(next, 0) }, mustTurn ? TURN_MS : 0)
      return
    }

    const u = new SpeechSynthesisUtterance(paragraphs[para].slice(startChar))
    u.lang = 'en-US'
    u.rate = rateRef.current
    const voice = pickEnglishVoice()
    if (voice) u.voice = voice
    u.onboundary = e => {
      if (gen !== genRef.current || e.name === 'sentence') return
      const char = startChar + e.charIndex   // kesilmiş metindeki yer → paragraftaki yer
      lastPos.current = { page, para, char }
      setSpeaking({ page, para, char })
    }
    u.onend = () => { if (gen === genRef.current) speakFrom(page, para + 1) }
    window.speechSynthesis.speak(u)
  }

  // Verilen yerden okumaya başla (eski okuma iptal)
  function play(pos) {
    genRef.current++
    window.speechSynthesis.cancel()
    speakingRef.current = true
    setSpeaking({ page: pos.page, para: pos.para, char: -1 })
    speakFrom(pos.page, pos.para, pos.char)
  }

  // Kalınan yer hâlâ ekrandaysa oradan, değilse açık sayfanın başından
  function startSpeaking() {
    const last = lastPos.current
    const visibleNow = last && last.page >= index && last.page < index + perView
    play(visibleNow ? last : { page: index, para: 0, char: 0 })
  }

  function changeRate(value) {
    rateRef.current = value
    setRate(value)
    if (speakingRef.current && lastPos.current) play(lastPos.current)   // yeni hızla aynı kelimeden
  }

  // Fareyle / parmakla sürükleyerek çevirme
  function onPointerDown(e) { dragStart.current = e.clientX }
  function onPointerUp(e) {
    if (dragStart.current == null) return
    const dx = e.clientX - dragStart.current
    dragStart.current = null
    if (dx < -DRAG_DISTANCE) turn(1)
    else if (dx > DRAG_DISTANCE) turn(-1)
  }

  function showTip(info, text, el) {
    const rect = el.getBoundingClientRect()
    setTip({ info, text, x: rect.left + rect.width / 2, y: rect.top })
  }

  function updateColors(next) {
    setColors(next)
    saveColors(next)
  }

  function updateColor(status, patch) {
    updateColors({ ...colors, [status]: { ...colors[status], ...patch } })
  }

  // Detay penceresi kapanınca durumlar değişmiş olabilir (çalışmaya eklendi vs.)
  function closeModal() {
    setSelected(null)
    loadWords(story.pages)
  }

  async function addToStudy(info) {
    const response = await apiFetch(`/api/Reader/study/${info.wordId}`, { method: 'POST' })
    if (!response.ok) return
    showToast(`"${info.headword}" çalışmaya eklendi, kart çalışmasında karşına çıkacak.`, 'success')
    closeModal()
  }

  if (!story) return <div className="panel">Yükleniyor...</div>

  const visible = story.pages.slice(index, index + perView)
  const lastVisible = index + visible.length

  // Durumlara göre kelime sayıları ve renk değişkenleri
  const counts = { new: 0, studying: 0, known: 0, learned: 0 }
  for (const w of words.values()) counts[w.status]++
  const colorVars = Object.fromEntries(Object.keys(colors).map(k => [`--c-${k}`, softColor(colors[k])]))

  return (
    <div className="reader" style={{ '--book': story.color, ...colorVars }}>
      <div className="reader-head">
        <button className="btn btn-ghost" onClick={onExit}>← Kitaplık</button>
        <div className="reader-title">
          <span className="reader-emoji">{story.emoji}</span>
          <div>
            <h2>{story.title}</h2>
            <p className="muted small">{story.author} · {story.level}</p>
            <div className="reader-legend">
              {['new', 'studying'].map(k => (
                <span key={k}>
                  <i className="legend-dot" style={{ background: colors[k].on ? colors[k].color : 'var(--border)' }} />
                  {counts[k]} {k === 'new' ? 'hiç bilmediğin' : 'tekrar edeceğin'}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="reader-actions">
          {canSpeak && (speaking
            ? <button className="btn btn-ghost" onClick={stopSpeaking}>⏹ Durdur</button>
            : <button className="btn btn-primary" onClick={startSpeaking}>🔊 Sesli oku</button>)}
          {canSpeak && (
            <select className="rate-select" value={rate} onChange={e => changeRate(Number(e.target.value))} title="Okuma hızı">
              <option value={0.7}>Yavaş</option>
              <option value={0.9}>Normal</option>
              <option value={1.1}>Hızlı</option>
            </select>
          )}

          <div className="palette-wrap">
            <button className="btn btn-ghost" onClick={() => setShowPalette(p => !p)}>🎨 Renkler</button>
            {showPalette && (
              <div className="color-panel panel">
                {Object.keys(STATUS_LABELS).map(k => (
                  <label key={k} className="color-row">
                    <input type="checkbox" checked={colors[k].on} onChange={e => updateColor(k, { on: e.target.checked })} />
                    <span className="color-sample" style={{ background: softColor(colors[k]) }}>word</span>
                    <span className="color-label">{STATUS_LABELS[k]} <span className="muted small">({counts[k]})</span></span>
                    <input type="color" value={colors[k].color} onChange={e => updateColor(k, { color: e.target.value, on: true })} />
                  </label>
                ))}
                <button className="btn btn-ghost small" onClick={() => updateColors(DEFAULT_COLORS)}>Varsayılana dön</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="reader-stage">
        <button className="page-arrow" onClick={() => turn(-1)} disabled={index === 0} aria-label="Önceki sayfa">‹</button>

        <div
          className={`book-spread ${wide ? 'two' : 'one'}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {visible.map((text, i) => (
            <article key={index + i} className="book-page">
              <PageText
                text={text}
                words={words}
                active={speaking && speaking.page === index + i ? speaking : null}
                onHover={showTip}
                onLeave={() => setTip(null)}
                onPick={info => { setTip(null); setSelected(info) }}
              />
              <span className="page-number">{index + i + 1}</span>
            </article>
          ))}

          {/* Çevrilen eski sayfa: kendi kenarı etrafında döner */}
          {turning && (
            <article className={`book-page turning turning-${turning.dir > 0 ? 'next' : 'prev'}`}>
              {turning.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              <span className="page-number">{turning.number}</span>
            </article>
          )}
        </div>

        <button className="page-arrow" onClick={() => turn(1)} disabled={lastVisible >= story.pages.length} aria-label="Sonraki sayfa">›</button>
      </div>

      <div className="reader-foot">
        <span className="muted small">
          Sayfa {index + 1}{visible.length > 1 ? `–${lastVisible}` : ''} / {story.pages.length}
          {' · '}← → tuşları ya da sürükleyerek çevir
        </span>
        <div className="reader-progress"><span style={{ width: `${(lastVisible / story.pages.length) * 100}%` }} /></div>
      </div>

      {tip && (
        <div className="word-tip" style={{ left: tip.x, top: tip.y }}>
          <b>
            {tip.text.toLowerCase() !== tip.info.headword ? `${tip.text} → ${tip.info.headword}` : tip.info.headword}
          </b>
          <span className="word-tip-meta"> {tip.info.partOfSpeech} · {tip.info.level}</span>
          <div>{tip.info.meaning || 'Anlam henüz yok'}</div>
          <div className={`word-tip-status ${tip.info.status}`}>{STATUS_TEXT[tip.info.status]} · tıkla, kaydet</div>
        </div>
      )}

      {selected && (
        <WordDetailModal
          word={selected}
          onClose={closeModal}
          extra={selected.status === 'new' && (
            <button className="btn btn-primary" onClick={() => addToStudy(selected)}>+ Çalışmaya ekle</button>
          )}
        />
      )}
    </div>
  )
}

export default Reader