// ============================================================
// Reader.jsx
// Hikaye okuyucu: kitap görünümü, sayfa çevirme (ok, tuş, sürükleme),
// kelimenin üzerine gelince anlam, tıklayınca kelime detayı.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import { tokenize, uniqueWords } from './readerText'
import WordDetailModal from './WordDetailModal'
import { useToast } from './ToastContext'

const STATUS_TEXT = { new: 'Yeni kelime', studying: 'Çalışıyorsun', known: 'Biliyorsun', learned: 'Öğrendin' }
const DRAG_DISTANCE = 60   // bu kadar piksel sürüklenince sayfa çevrilir

// Bir sayfanın metni: tanınan kelimeler etkileşimli
function PageText({ text, words, showColors, onHover, onLeave, onPick }) {
  return text.split('\n\n').map((para, i) => (
    <p key={i}>
      {tokenize(para).map((t, j) => {
        const info = t.word ? words.get(t.key) : null
        if (!info) return <span key={j}>{t.text}</span>
        return (
          <span
            key={j}
            className={`rw ${showColors ? `rw-${info.status}` : ''}`}
            onMouseEnter={e => onHover(info, t.text, e.currentTarget)}
            onMouseLeave={onLeave}
            onClick={() => onPick(info)}
          >
            {t.text}
          </span>
        )
      })}
    </p>
  ))
}

function Reader({ storyId, onExit }) {
  const showToast = useToast()
  const [story, setStory] = useState(null)
  const [words, setWords] = useState(new Map())
  const [index, setIndex] = useState(0)          // görünen ilk sayfa
  const [turning, setTurning] = useState(null)   // çevrilen sayfa (animasyon)
  const [tip, setTip] = useState(null)
  const [selected, setSelected] = useState(null)
  const [showColors, setShowColors] = useState(true)
  const [wide] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  const dragStart = useRef(null)
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

  const turn = useCallback(dir => {
    if (!story || turning) return
    const next = index + dir * perView
    if (next < 0 || next >= story.pages.length) return

    const current = story.pages.slice(index, index + perView)
    setTip(null)
    setTurning({
      dir,
      text: dir > 0 ? current[current.length - 1] : current[0],
      number: dir > 0 ? index + current.length : index + 1
    })
    setIndex(next)
    apiFetch(`/api/Stories/${story.id}/progress`, { method: 'PUT', body: JSON.stringify({ page: next }) })
    setTimeout(() => setTurning(null), 600)
  }, [story, index, perView, turning])

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
  const newCount = [...words.values()].filter(w => w.status === 'new').length

  return (
    <div className="reader" style={{ '--book': story.color }}>
      <div className="reader-head">
        <button className="btn btn-ghost" onClick={onExit}>← Kitaplık</button>
        <div className="reader-title">
          <span className="reader-emoji">{story.emoji}</span>
          <div>
            <h2>{story.title}</h2>
            <p className="muted small">{story.author} · {story.level} · bu hikayede {newCount} yeni kelime</p>
          </div>
        </div>
        <label className="reader-toggle">
          <input type="checkbox" checked={showColors} onChange={e => setShowColors(e.target.checked)} /> Renkler
        </label>
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
                showColors={showColors}
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