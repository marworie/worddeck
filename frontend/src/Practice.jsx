// ============================================================
// Practice.jsx
// Telefon için "Pratik" sayfası: sınav, oyunlar, dikte ve cümle kurma
// tek yerde (alt menüde hepsine yer olmadığı için).
// ============================================================

import PageHeader from './PageHeader'

const ITEMS = [
  { view: 'quizSetup', emoji: '📝', tone: 't-blue',  title: 'Sınav',     desc: 'Okuma, dinleme, yazma, konuşma' },
  { view: 'games',     emoji: '🎮', tone: 't-peach', title: 'Oyunlar',   desc: '12 kelime oyunu' },
  { view: 'dictation', emoji: '🎧', tone: 't-lilac', title: 'Dikte',     desc: 'Dinle, duyduğunu yaz' },
  { view: 'sentence',  emoji: '✍️', tone: 't-pink',  title: 'Cümle kur', desc: 'Kelimeyle kendi cümleni yaz' }
]

function Practice({ onNavigate }) {
  return (
    <div className="page">
      <PageHeader icon="ti-bolt" tone="t-peach" title="Pratik" subtitle="Öğrendiklerini kullanarak pekiştir" />
      <div className="game-grid">
        {ITEMS.map(i => (
          <button key={i.view} className={`game-card panel ${i.tone}`} onClick={() => onNavigate(i.view)}>
            <span className="game-emoji">{i.emoji}</span>
            <b>{i.title}</b>
            <span className="muted small">{i.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Practice