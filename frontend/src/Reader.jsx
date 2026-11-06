// ============================================================
// Reader.jsx
// Hikaye okuyucu: kitap görünümü, sayfa çevirme (ok, tuş, sürükleme),
// kelimenin üzerine gelince anlam; tıklayınca kullanıcı kelimeyi kendisi işaretler
// (bilmiyorum / az biliyorum), işaretler her kitap için ayrı kaydedilir ve
// "Kelime listesi" panelinde görünür; renkleri kullanıcı seçer,
// sesli okuma (okunan kelime vurgulanır, sayfa kendiliğinden çevrilir),
// okuma kontrolü (kullanıcı okur, doğru/atlanan kelimeler işaretlenir).
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import {
  DEFAULT_COLORS, alignReading, loadColors, loadCustomText, normalizeWord, paginateText,
  pickEnglishVoice, saveColors, saveCustomText, softColor, speakWord, tokenize, uniqueWords
} from './readerText'
import { useToast } from './ToastContext'
import WordDetailModal from './WordDetailModal'

// Kullanıcının işaretleri ve renk paletindeki karşılıkları (palette "new" kırmızı, "studying" sarı)
const MARKS = {
  unknown: { label: 'Bilmiyorum', emoji: '🔴', color: 'new' },
  shaky: { label: 'Az biliyorum', emoji: '🟡', color: 'studying' }
}
const PALETTE_LABELS = { new: 'Bilmiyorum', studying: 'Az biliyorum' }
const CUSTOM_MARKS_KEY = 'customTextMarks'   // kendi metnin için işaretler (veritabanında hikaye yok)

function loadCustomMarks() {
  try { return new Map(JSON.parse(localStorage.getItem(CUSTOM_MARKS_KEY)) ?? []) } catch { return new Map() }
}

function saveCustomMarks(map) {
  try { localStorage.setItem(CUSTOM_MARKS_KEY, JSON.stringify([...map])) } catch { /* önemli değil */ }
}
const DRAG_DISTANCE = 60   // bu kadar piksel sürüklenince sayfa çevrilir
const TURN_MS = 600        // sayfa çevirme animasyonu
const canSpeak = 'speechSynthesis' in window
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition   // sadece Chrome / Edge

// Kendi metnini, API'den gelen hikayeyle aynı şekle sokar
function customStory() {
  const c = loadCustomText()
  if (!c) return null
  return {
    id: 'custom',
    title: c.title,
    author: 'Kendi metnin',
    level: '✍️',
    emoji: '✍️',
    color: '#8b5cf6',
    page: c.page ?? 0,
    pages: paginateText(c.text)
  }
}

// Bir sayfanın metni: tanınan kelimeler etkileşimli, okunan kelime vurgulu,
// okuma kontrolünde doğru / atlanan kelimeler işaretli
function PageText({ text, pageIndex, words, wordMarks, active, marks, onHover, onLeave, onPick }) {
  return text.split('\n\n').map((para, i) => {
    let offset = 0   // kelimenin paragraf içindeki yeri (sesli okumadaki charIndex ile eşleşir)
    return (
      <p key={i}>
        {tokenize(para).map((t, j) => {
          const start = offset
          offset += t.text.length
          const reading = active && active.para === i && active.char === start
          const mark = marks.get(`${pageIndex}-${i}-${j}`)
          const extra = `${reading ? 'rw-speaking' : ''} ${mark ? `rd-${mark}` : ''}`
          const info = t.word ? words.get(t.key) : null

          if (!info) return <span key={j} className={extra.trim() || undefined}>{t.text}</span>
          const own = MARKS[wordMarks.get(info.wordId)]   // kullanıcının işareti (yoksa renksiz)
          return (
            <span
              key={j}
              className={`rw ${own ? `rw-${own.color}` : ''} ${extra}`}
              onMouseEnter={e => onHover(info, t.text, e.currentTarget)}
              onMouseLeave={onLeave}
              onClick={e => onPick(info, t.text, e.currentTarget)}
            >
              {t.text}
            </span>
          )
        })}
      </p>
    )
  })
}

function Reader({ storyId, onExit, onStartQuiz }) {
  const showToast = useToast()
  const [story, setStory] = useState(null)
  const [words, setWords] = useState(new Map())
  const [index, setIndex] = useState(0)          // görünen ilk sayfa
  const [turning, setTurning] = useState(null)   // çevrilen sayfa (animasyon)
  const [tip, setTip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [wordMarks, setWordMarks] = useState(new Map())   // wordId → 'unknown' | 'shaky'
  const [picked, setPicked] = useState(null)              // işaretleme penceresi: { info, text, x, y }
  const [showList, setShowList] = useState(false)         // kelime listesi paneli
  const [colors, setColors] = useState(loadColors)
  const [showPalette, setShowPalette] = useState(false)
  const [speaking, setSpeaking] = useState(null) // { page, para, char }: okunan yer
  const [rate, setRate] = useState(0.9)
  const [checking, setChecking] = useState(false) // mikrofon açık mı
  const [heard, setHeard] = useState('')          // kullanıcının okuduğu (tanınan) metin
  const [checkDone, setCheckDone] = useState(false)
  const [wide] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  const dragStart = useRef(null)
  const speakingRef = useRef(false)              // sesli okuma sürüyor mu (geri çağrılarda güncel değer)
  const indexRef = useRef(0)
  const turnRef = useRef(null)
  const rateRef = useRef(0.9)                    // geri çağrılarda güncel hız
  const genRef = useRef(0)                       // her okuma başlangıcının numarası; eski okumanın olayları yok sayılır
  const lastPos = useRef(null)                   // en son okunan kelime: { page, para, char }
  const recRef = useRef(null)                    // ses tanıma nesnesi
  const checkingRef = useRef(false)
  const finalRef = useRef('')                    // kesinleşmiş tanınan metin
  const perView = wide ? 2 : 1

  // Hikayedeki kelimelerin anlamı ve durumu
  const loadWords = useCallback(pages => {
    apiFetch('/api/Reader/analyze', { method: 'POST', body: JSON.stringify({ words: uniqueWords(pages) }) })
      .then(r => (r.ok ? r.json() : []))
      .then(list => setWords(new Map(list.map(w => [w.word, w]))))
  }, [])

   useEffect(() => {
    const open = s => {
      if (!s) return
      const page = Math.min(s.page, s.pages.length - 1)
      setStory(s)
      setIndex(page - (page % perView))   // iki sayfalı görünümde soldaki sayfa çift olmalı
      loadWords(s.pages)
    }

    if (storyId === 'custom') {
      open(customStory())
      setWordMarks(loadCustomMarks())
      return
    }

    apiFetch(`/api/Stories/${storyId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(open)
    apiFetch(`/api/Stories/${storyId}/words`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => setWordMarks(new Map(list.map(m => [m.wordId, m.mark]))))
  }, [storyId, perView, loadWords])

  const stopSpeaking = useCallback(() => {
    genRef.current++
    speakingRef.current = false
    if (canSpeak) window.speechSynthesis.cancel()
    setSpeaking(null)
  }, [])

  // Sayfadan çıkınca okuma ve mikrofon dursun
  useEffect(() => () => {
    genRef.current++
    speakingRef.current = false
    checkingRef.current = false
    recRef.current?.abort()
    if (canSpeak) window.speechSynthesis.cancel()
  }, [])

  // Sayfa değişince okuma kontrolü sıfırlanır (yeni sayfayı baştan okursun)
  useEffect(() => {
    checkingRef.current = false
    recRef.current?.abort()
    setChecking(false)
    setHeard('')
    setCheckDone(false)
  }, [index])

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
    if (story.id === 'custom') saveCustomText({ ...loadCustomText(), page: next })
    else apiFetch(`/api/Stories/${story.id}/progress`, { method: 'PUT', body: JSON.stringify({ page: next }) })
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
      if (selected || picked) return
      if (e.key === 'ArrowRight') turn(1)
      if (e.key === 'ArrowLeft') turn(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, selected, picked])

  // ---------- Sesli okuma ----------

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
    stopChecking()
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

  // ---------- Okuma kontrolü ----------

  // Chrome birkaç saniye sessizlikte tanımayı kapatıyor; okuma sürüyorsa yeniden başlatılır
  function listen() {
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += ' ' + text
        else interim += ' ' + text
      }
      setHeard(finalRef.current + ' ' + interim)
    }
    rec.onerror = e => {
      if (e.error === 'not-allowed') {
        showToast('Mikrofon izni verilmedi.', 'error')
        stopChecking()
      }
    }
    rec.onend = () => { if (checkingRef.current) listen() }
    recRef.current = rec
    rec.start()
  }

  function startChecking() {
    stopSpeaking()
    finalRef.current = ''
    setHeard('')
    setCheckDone(false)
    checkingRef.current = true
    setChecking(true)
    listen()
  }

  function stopChecking() {
    if (!checkingRef.current) return
    checkingRef.current = false
    recRef.current?.stop()
    setChecking(false)
  }

  function finishChecking() {
    stopChecking()
    setCheckDone(true)
  }

  // ---------- Diğer ----------

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

  // ---------- Kelime işaretleme ----------

  function pickWord(info, text, el) {
    const rect = el.getBoundingClientRect()
    setTip(null)
    setPicked({ info, text, x: rect.left + rect.width / 2, y: rect.bottom })
  }

  // mark: 'unknown' | 'shaky' | null (işareti kaldır)
  function setMark(info, mark) {
    const next = new Map(wordMarks)
    if (mark) next.set(info.wordId, mark)
    else next.delete(info.wordId)
    setWordMarks(next)
    setPicked(null)

    if (story.id === 'custom') { saveCustomMarks(next); return }
    const url = `/api/Stories/${story.id}/words/${info.wordId}`
    if (mark) apiFetch(url, { method: 'PUT', body: JSON.stringify({ mark }) })
    else apiFetch(url, { method: 'DELETE' })
  }

  // İşaretli kelimelerin hepsini kart çalışmasına ekle
  async function addAllToStudy(list) {
    await Promise.all(list.map(w => apiFetch(`/api/Reader/study/${w.wordId}`, { method: 'POST' })))
    showToast(`${list.length} kelime çalışmaya eklendi, kart çalışmasında karşına çıkacak.`, 'success')
    loadWords(story.pages)
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

  // İşaretli kelimeler (kelime listesi için anlamlarıyla) ve renk değişkenleri
  const infoById = new Map([...words.values()].map(w => [w.wordId, w]))
  const markedList = [...wordMarks]
    .map(([wordId, mark]) => ({ ...infoById.get(wordId), wordId, mark }))
    .filter(w => w.headword)   // kelime bilgisi henüz yüklenmediyse gösterme
  const counts = {
    new: markedList.filter(w => w.mark === 'unknown').length,
    studying: markedList.filter(w => w.mark === 'shaky').length
  }
  const colorVars = Object.fromEntries(Object.keys(colors).map(k => [`--c-${k}`, softColor(colors[k])]))

  // Okuma kontrolü: ekrandaki kelimeler sırayla, okunanlarla eşleştirilir
  const expected = []
  visible.forEach((text, vi) =>
    text.split('\n\n').forEach((para, i) =>
      tokenize(para).forEach((t, j) => {
        if (t.word) expected.push({ id: `${index + vi}-${i}-${j}`, key: t.key, text: t.text })
      })))
  const heardWords = heard.split(/\s+/).map(normalizeWord).filter(Boolean)
  const { states, pos } = alignReading(expected.map(e => e.key), heardWords)
  const marks = new Map(expected.map((e, i) => [e.id, states[i]]).filter(([, s]) => s))
  const okCount = states.filter(s => s === 'ok').length
  const missedWords = [...new Set(expected.filter((e, i) => states[i] === 'missed').map(e => e.key))]
  const score = pos > 0 ? Math.round((okCount / pos) * 100) : 0
  // Son sayfa: işaretlediğin kelimelerden test
  const atEnd = lastVisible >= story.pages.length
  const quizIds = markedList.map(w => w.wordId)

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
                  {counts[k]} {k === 'new' ? 'bilmediğin' : 'az bildiğin'}
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
          {SpeechRec && (checking
            ? <button className="btn btn-danger" onClick={finishChecking}>⏹ Bitir</button>
            : <button className="btn btn-ghost" onClick={startChecking}>🎤 Ben okuyayım</button>)}

          <button className="btn btn-ghost" onClick={() => setShowList(true)}>
            📋 <span className="palette-label">Kelime listesi</span> ({markedList.length})
          </button>

          <div className="palette-wrap">
            <button className="btn btn-ghost" onClick={() => setShowPalette(p => !p)}>🎨 <span className="palette-label">Renkler</span></button>
            {showPalette && (
              <div className="color-panel panel" data-lenis-prevent>
                {Object.keys(PALETTE_LABELS).map(k => (
                  <label key={k} className="color-row">
                    <input type="checkbox" checked={colors[k].on} onChange={e => updateColor(k, { on: e.target.checked })} />
                    <span className="color-sample" style={{ background: softColor(colors[k]) }}>word</span>
                    <span className="color-label">{PALETTE_LABELS[k]} <span className="muted small">({counts[k]})</span></span>
                    <input type="color" value={colors[k].color} onChange={e => updateColor(k, { color: e.target.value, on: true })} />
                  </label>
                ))}
                <button className="btn btn-ghost small" onClick={() => updateColors(DEFAULT_COLORS)}>Varsayılana dön</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Okuma kontrolü: canlı durum ya da sonuç */}
      {checking && (
        <div className="read-live">
          <span className="rec-dot" /> Dinliyorum... Sayfayı sesli oku · {pos} / {expected.length} kelime
        </div>
      )}
      {checkDone && pos > 0 && (
        <div className="read-result panel">
          <div className="read-score">
            <b>🎤 %{score} doğru</b>
            <span className="muted small"> {okCount} kelime doğru · {pos - okCount} kelime atlandı ya da anlaşılmadı</span>
          </div>
          {missedWords.length > 0 && (
            <div className="chip-list">
              <span className="muted small">Dinle ve tekrar dene:</span>
              {missedWords.map(w => (
                <button key={w} className="chip" onClick={() => speakWord(w)}>🔊 {w}</button>
              ))}
            </div>
          )}
          <button className="btn btn-ghost small" onClick={() => { setHeard(''); setCheckDone(false) }}>Kapat</button>
        </div>
      )}

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
                pageIndex={index + i}
                words={words}
                wordMarks={wordMarks}
                active={speaking && speaking.page === index + i ? speaking : null}
                marks={marks}
                onHover={showTip}
                onLeave={() => setTip(null)}
                onPick={pickWord}
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
          <span className="desktop-hint"> · ← → tuşları ya da sürükleyerek çevir</span>
        </span>
        <div className="reader-progress"><span style={{ width: `${(lastVisible / story.pages.length) * 100}%` }} /></div>
      </div>

      {atEnd && (
        <div className="story-end panel">
          <div className="story-end-emoji">🎉</div>
          <div>
            <b>Hikayeyi bitirdin!</b>
            {quizIds.length >= 4 ? (
              <p className="muted small">
                Bu hikayede {quizIds.length} kelime işaretledin. Hepsini hatırlıyor musun?
              </p>
            ) : (
              <p className="muted small">Kelime testi için en az 4 kelime işaretlemelisin. Bilmediklerine dokunup işaretle 👆</p>
            )}
          </div>
          {quizIds.length >= 4 && (
            <button className="btn btn-primary" onClick={() => { stopSpeaking(); onStartQuiz(quizIds) }}>
              📝 Kelime testi
            </button>
          )}
        </div>
      )}

      {tip && (
        <div className="word-tip" style={{ left: tip.x, top: tip.y }}>
          <b>
            {tip.text.toLowerCase() !== tip.info.headword ? `${tip.text} → ${tip.info.headword}` : tip.info.headword}
          </b>
          <span className="word-tip-meta"> {tip.info.partOfSpeech} · {tip.info.level}</span>
          <div>{tip.info.meaning || 'Anlam henüz yok'}</div>
          <div className="word-tip-status">
            {MARKS[wordMarks.get(tip.info.wordId)] ? `${MARKS[wordMarks.get(tip.info.wordId)].emoji} ${MARKS[wordMarks.get(tip.info.wordId)].label} · ` : ''}tıkla, işaretle
          </div>
        </div>
      )}

      {/* İşaretleme penceresi: kelimeye dokununca açılır */}
      {picked && (
        <div className="mark-backdrop" onClick={() => setPicked(null)}>
          <div
            className="mark-pop panel"
            style={{ left: Math.min(Math.max(picked.x, 150), window.innerWidth - 150), top: picked.y + 8 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mark-pop-head">
              <b>{picked.info.headword}</b>
              <span className="muted small">{picked.info.partOfSpeech} · {picked.info.level}</span>
              <button className="btn btn-ghost small" onClick={() => speakWord(picked.info.headword)} aria-label="Dinle">🔊</button>
            </div>
            <p className="mark-pop-meaning">{picked.info.meaning || 'Anlam henüz yok'}</p>
            <div className="mark-pop-buttons">
              {Object.entries(MARKS).map(([key, m]) => (
                <button
                  key={key}
                  className={`mark-btn mark-${key} ${wordMarks.get(picked.info.wordId) === key ? 'active' : ''}`}
                  onClick={() => setMark(picked.info, key)}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
              <button className="mark-btn" onClick={() => setMark(picked.info, null)}>✓ Biliyorum</button>
            </div>
            <button className="btn btn-ghost small" onClick={() => { setSelected(picked.info); setPicked(null) }}>
              Kelime detayı →
            </button>
          </div>
        </div>
      )}

      {/* Kelime listesi: bu kitapta işaretlenen kelimeler */}
      {showList && (
        <div className="wl-backdrop" onClick={() => setShowList(false)}>
          <div className="word-list-sheet" data-lenis-prevent onClick={e => e.stopPropagation()}>
            <div className="word-list-head">
              <h3>📋 {story.title}</h3>
              <button className="btn btn-ghost small" onClick={() => setShowList(false)}>Kapat</button>
            </div>

            {markedList.length === 0 ? (
              <p className="muted">Henüz kelime işaretlemedin. Okurken bilmediğin kelimelere dokun 👆</p>
            ) : (
              Object.entries(MARKS).map(([key, m]) => {
                const group = markedList.filter(w => w.mark === key)
                if (group.length === 0) return null
                return (
                  <section key={key} className="word-list-group">
                    <span className="card-label">{m.emoji} {m.label} · {group.length}</span>
                    {group.map(w => (
                      <div key={w.wordId} className={`word-list-row mark-${key}`}>
                        <button className="btn btn-ghost small" onClick={() => speakWord(w.headword)} aria-label="Dinle">🔊</button>
                        <div>
                          <b>{w.headword}</b>
                          <span className="muted small"> {w.level}</span>
                          <div className="muted small">{w.meaning || 'Anlam henüz yok'}</div>
                        </div>
                        <button className="btn btn-ghost small" onClick={() => setMark(w, key === 'unknown' ? 'shaky' : 'unknown')} title="İşareti değiştir">
                          {key === 'unknown' ? '🟡' : '🔴'}
                        </button>
                        <button className="btn btn-ghost small" onClick={() => setMark(w, null)} title="Listeden çıkar">✕</button>
                      </div>
                    ))}
                  </section>
                )
              })
            )}

            {markedList.length > 0 && (
              <button className="btn btn-primary" onClick={() => addAllToStudy(markedList)}>
                + Hepsini çalışmaya ekle ({markedList.length})
              </button>
            )}
          </div>
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