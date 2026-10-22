// ============================================================
// Library.jsx
// Hikaye kitaplığı: seviyelere göre raflar, kapaklar, kaldığın sayfa.
// Kitaba tıklayınca okuyucu açılır.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const LEVEL_NAMES = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'İleri orta', C1: 'İleri' }

// Tek bir kitap kapağı
function BookCover({ story, onOpen }) {
  const started = story.page != null
  const finished = started && story.page + 1 >= story.pageCount
  const progress = started ? Math.round(((story.page + 1) / story.pageCount) * 100) : 0

  return (
    <button className="book" style={{ '--book': story.color }} onClick={() => onOpen(story.id)} title={story.title}>
      {story.coverUrl
        ? <img className="book-image" src={story.coverUrl} alt="" />
        : <span className="book-emoji">{story.emoji}</span>}

      <span className="book-level">{story.level}</span>
      <span className="book-title">{story.title}</span>
      <span className="book-author">{story.author}</span>

      <span className="book-meta">
        {finished ? '✓ Bitti' : started ? `Sayfa ${story.page + 1} / ${story.pageCount}` : `${story.pageCount} sayfa`}
      </span>
      {started && !finished && (
        <span className="book-progress"><span style={{ width: `${progress}%` }} /></span>
      )}
    </button>
  )
}

// Bir raf: başlık ve kitaplar
function Shelf({ title, subtitle, stories, onOpen }) {
  if (stories.length === 0) return null
  return (
    <section className="shelf">
      <h3 className="shelf-title">
        {title} {subtitle && <span className="muted small">{subtitle}</span>}
      </h3>
      <div className="shelf-books">
        {stories.map(s => <BookCover key={s.id} story={s} onOpen={onOpen} />)}
      </div>
    </section>
  )
}

function Library({ onOpen }) {
  const [stories, setStories] = useState(null)
  const [level, setLevel] = useState('all')

  useEffect(() => {
    apiFetch('/api/Stories').then(r => (r.ok ? r.json() : [])).then(setStories)
  }, [])

  if (!stories) return <div className="panel">Yükleniyor...</div>

  // Başlanmış ama bitmemiş hikayeler en üstte
  const reading = stories.filter(s => s.page != null && s.page + 1 < s.pageCount)
  const levels = level === 'all' ? LEVELS : [level]

  return (
    <div className="library">
      <div className="library-head">
        <div>
          <h2>📚 Okuma Kitaplığı</h2>
          <p className="muted">{stories.length} hikaye · Kelimelerin üzerine gelince anlamını gör, tıklayınca kaydet</p>
        </div>

        <div className="chip-row">
          <button className={`chip ${level === 'all' ? 'active' : ''}`} onClick={() => setLevel('all')}>Tümü</button>
          {LEVELS.filter(l => stories.some(s => s.level === l)).map(l => (
            <button key={l} className={`chip ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
      </div>

      {level === 'all' && <Shelf title="📖 Okumaya devam et" stories={reading} onOpen={onOpen} />}

      {levels.map(l => (
        <Shelf
          key={l}
          title={l}
          subtitle={LEVEL_NAMES[l]}
          stories={stories.filter(s => s.level === l)}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

export default Library