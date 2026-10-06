// ============================================================
// HardWords.jsx
// Zorlandıklarım sayfası: içgörüler, karıştırılan kelime çiftleri
// ve seviyelere göre gruplanmış zor kelimeler (durum + ilerleme).
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { HARD_STATES, QUESTION_TYPES_TR, posTr } from './labels'
import WordDetailModal from './WordDetailModal'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

// onStartPractice: bir seviyenin çalışmasını başlatmak için (3b'de bağlanacak)
function HardWords({ onStartPractice, onBack }) {
  const [words, setWords] = useState(null)
  const [insights, setInsights] = useState(null)
  const [confusions, setConfusions] = useState([])
  const [activeLevel, setActiveLevel] = useState(null)
  const [stateFilter, setStateFilter] = useState(0)   // 0 = hepsi
  const [selectedWord, setSelectedWord] = useState(null)

  useEffect(() => {
    apiFetch('/api/Hard').then(r => r.ok ? r.json() : []).then(data => {
      setWords(data)
      // İlk açılışta, zor kelimesi olan ilk seviye seçili gelsin
      const first = LEVELS.find(l => data.some(w => w.level === l))
      setActiveLevel(first ?? 'A1')
    })
    apiFetch('/api/Hard/insights').then(r => r.ok ? r.json() : null).then(setInsights)
    apiFetch('/api/Hard/confusions?min=2').then(r => r.ok ? r.json() : []).then(setConfusions)
  }, [])

  if (!words) return <p className="loading-text">Yükleniyor...</p>

  if (words.length === 0) {
    return (
      <div className="panel empty-state">
        <h2>Zorlandıklarım</h2>
        <p>Henüz zor kelimen yok. Kart çalışırken <b>Bilmiyorum</b> dediğin kelimeler burada toplanacak.</p>
      </div>
    )
  }

  // Seviye başına kelime sayıları (sekmelerde göstermek için)
  const countByLevel = Object.fromEntries(LEVELS.map(l => [l, words.filter(w => w.level === l).length]))

  const visibleWords = words.filter(w =>
    w.level === activeLevel && (stateFilter === 0 || w.hardState === stateFilter))

  // Bu seviyede bugün çalışılabilecek (zor + güçleniyor) kelime var mı
  const practicable = words.filter(w => w.level === activeLevel && w.hardState < 3).length

  return (
    <div className="hard-page">
    <button className="btn btn-ghost back-btn" onClick={onBack}>← Ana sayfa</button>
      <h2 className="page-title">Zorlandıklarım</h2>

      {insights && <InsightsPanel insights={insights} />}

      {confusions.length > 0 && (
        <section className="panel">
          <h3 className="section-title">Sık karıştırdıkların</h3>
          <div className="confusion-list">
            {confusions.map(c => <ConfusionCard key={`${c.wordId}-${c.otherWordId}`} confusion={c} />)}
          </div>
        </section>
      )}

      {/* Seviye sekmeleri */}
      <div className="level-tabs">
        {LEVELS.map(l => (
          <button
            key={l}
            className={`level-tab ${activeLevel === l ? 'active' : ''}`}
            onClick={() => setActiveLevel(l)}
            disabled={countByLevel[l] === 0}
          >
            {l} <span className="tab-count">{countByLevel[l]}</span>
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="hard-toolbar">
          {/* Durum filtresi */}
          <div className="state-filter">
            {[0, 1, 2, 3].map(s => (
              <button
                key={s}
                className={`filter-chip ${stateFilter === s ? 'active' : ''}`}
                onClick={() => setStateFilter(s)}
              >
                {s === 0 ? 'Hepsi' : HARD_STATES[s].label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onStartPractice(activeLevel)}
            disabled={practicable === 0}
          >
            {activeLevel} çalış ({practicable})
          </button>
        </div>

        {visibleWords.length === 0 ? (
          <p className="muted">Bu filtreye uyan kelime yok.</p>
        ) : (
          <ul className="hard-list">
            {visibleWords.map(w => (
              <li key={w.wordId} className="hard-row" onClick={() => setSelectedWord(w)}>
                <div className="hard-word">
                  <span className="hard-headword">{w.headword}</span>
                  <span className="hard-pos">{posTr(w.partOfSpeech)}</span>
                </div>
                <span className="hard-meaning">{w.turkishMeaning || '—'}</span>
                <div className="hard-status">
                  <span className={`state-tag ${HARD_STATES[w.hardState].className}`}>
                    {HARD_STATES[w.hardState].label}
                  </span>
                  {/* Üst üste doğru sayısı: 3 nokta */}
                  {w.hardState < 3 && (
                    <span className="streak-dots" title={`Üst üste ${w.hardStreak} doğru`}>
                      {[0, 1, 2].map(i => <i key={i} className={i < w.hardStreak ? 'on' : ''} />)}
                    </span>
                  )}
                  <span className="wrong-count" title="Toplam yanlış">✕ {w.wrongCount}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedWord && <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />}
    </div>
  )
}

// ===== İçgörüler paneli =====
function InsightsPanel({ insights }) {
  const total = insights.hardCount + insights.strengtheningCount + insights.masteredCount
  const topPos = insights.byPartOfSpeech[0]

  return (
    <section className="panel insights">
      <div className="insight-stats">
        <Stat value={insights.hardCount} label="Zor" className="state-hard" />
        <Stat value={insights.strengtheningCount} label="Güçleniyor" className="state-strengthening" />
        <Stat value={insights.masteredCount} label="Ustalaşıldı" className="state-mastered" />
      </div>

      <ul className="insight-notes">
        {/* En çok zorlanılan tür: toplamın en az %40'ıysa söylemeye değer */}
        {topPos && total > 0 && topPos.hardCount / total >= 0.4 && (
          <li>En çok <b>{posTr(topPos.partOfSpeech)}</b> türündeki kelimelerde zorlanıyorsun ({topPos.hardCount} kelime).</li>
        )}
        {insights.masteredThisWeek > 0 && (
          <li>Bu hafta <b>{insights.masteredThisWeek}</b> kelimede ustalaştın.</li>
        )}
      </ul>

      {/* Son 7 günde soru tiplerine göre başarı */}
      {insights.byQuestionType.length > 0 && (
        <div className="type-stats">
          <span className="network-title">Son 7 gün</span>
          {insights.byQuestionType.map(t => {
            const pct = Math.round((t.correct / t.total) * 100)
            return (
              <div key={t.questionType} className="type-stat">
                <span>{QUESTION_TYPES_TR[t.questionType]}</span>
                <div className="type-bar"><div style={{ width: `${pct}%` }} /></div>
                <span className="muted">%{pct} ({t.correct}/{t.total})</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Stat({ value, label, className }) {
  return (
    <div className="insight-stat">
      <span className={`insight-value ${className}`}>{value}</span>
      <span className="insight-label">{label}</span>
    </div>
  )
}

// ===== Karıştırılan iki kelimeyi yan yana gösteren kart =====
function ConfusionCard({ confusion }) {
  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)

  // Anlam/tanım eksik olabilir, ikisinin detaylarını da çek
  useEffect(() => {
    apiFetch(`/api/Words/${confusion.wordId}/details`).then(r => r.ok ? r.json() : null).then(setLeft)
    apiFetch(`/api/Words/${confusion.otherWordId}/details`).then(r => r.ok ? r.json() : null).then(setRight)
  }, [confusion.wordId, confusion.otherWordId])

  return (
    <div className="confusion-card">
      <ConfusionSide headword={confusion.headword} details={left} />
      <span className="confusion-vs">≠</span>
      <ConfusionSide headword={confusion.otherHeadword} details={right} />
      <span className="confusion-count">{confusion.timesConfused} kez karıştırdın</span>
    </div>
  )
}

function ConfusionSide({ headword, details }) {
  return (
    <div className="confusion-side">
      <b>{headword}</b>
      <span className="tr-meaning small">{details?.turkishMeaning || '—'}</span>
      <span className="muted small">{details?.definition}</span>
    </div>
  )
}

export default HardWords