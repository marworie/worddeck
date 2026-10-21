// ============================================================
// QuizCard.jsx
// Ana sayfadaki "Sınav" kartı: seviye ve soru sayısı seçimi, son sınavlar.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useSpeechRecognition } from './useSpeechRecognition'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const COUNTS = [10, 20, 30]

const SECTIONS = [
  { key: '', label: 'Tümü' },
  { key: 'reading', label: '📖 Okuma' },
  { key: 'listening', label: '🎧 Dinleme' },
  { key: 'writing', label: '✍️ Yazma' },
  { key: 'speaking', label: '🎤 Konuşma' }
]

// onStart(level, count): sınavı başlatmak için
function QuizCard({ onStart }) {
  const [level, setLevel] = useState('A1')
  const [count, setCount] = useState(10)
  const [history, setHistory] = useState([])
  const [section, setSection] = useState('')   // '' = 4 bölüm karışık
  const { supported: micSupported } = useSpeechRecognition()

  useEffect(() => {
    apiFetch('/api/Quiz/history').then(r => (r.ok ? r.json() : [])).then(setHistory)
  }, [])

  return (
    <div className="quiz-card panel">
      <div className="quiz-card-head">
        <p className="muted">Çalıştığın kelimelerden karışık sorularla kendini test et</p>
      </div>

      <div className="quiz-options">
        <div className="quiz-option-group">
          <span className="network-title">Seviye</span>
          <div className="chip-row">
            {LEVELS.map(l => (
              <button key={l} className={`filter-chip ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-option-group">
          <span className="network-title">Soru sayısı</span>
          <div className="chip-row">
            {COUNTS.map(c => (
              <button key={c} className={`filter-chip ${count === c ? 'active' : ''}`} onClick={() => setCount(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-option-group">
          <span className="network-title">Bölüm</span>
          <div className="chip-row">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                className={`filter-chip ${section === s.key ? 'active' : ''}`}
                onClick={() => setSection(s.key)}
                disabled={s.key === 'speaking' && !micSupported}
                title={s.key === 'speaking' && !micSupported ? 'Bu tarayıcı mikrofonu desteklemiyor' : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        
        <button className="btn btn-primary quiz-start-btn" onClick={() => onStart(level, count, section)}></button>
        
      </div>

      {history.length > 0 && (
        <div className="quiz-history">
          <span className="network-title">Son sınavların</span>
          {history.map(h => {
            const pct = Math.round((h.correctAnswers / h.totalQuestions) * 100)
            return (
              <div key={h.id} className="quiz-history-row">
                <span className="level-badge">{h.level}</span>
                <span><b>{h.correctAnswers}</b> / {h.totalQuestions}</span>
                <span className={`quiz-pct ${pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low'}`}>%{pct}</span>
                <span className="muted small">
                  {new Date(h.takenAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const SECTION_INFO = [
  { icon: '📖', title: 'Okuma', desc: 'Cümle, tanım ve anlamdan doğru kelimeyi seç' },
  { icon: '🎧', title: 'Dinleme', desc: 'Cümleyi dinle, duyduğun kelimeyi bul' },
  { icon: '✍️', title: 'Yazma', desc: 'Boşluğa gelen kelimeyi kendin yaz' },
  { icon: '🎤', title: 'Konuşma', desc: 'Kelimeyi mikrofona doğru söyle' }
]

// Sınav sayfasındaki bilgi alanı: bölümler ve diğer sınav kısayolları
export function QuizInfo({ onNavigate }) {
  return (
    <>
      <section className="panel">
        <h3 className="section-title">Sınav 4 bölümden oluşur</h3>
        <div className="quiz-info-grid">
          {SECTION_INFO.map(s => (
            <div key={s.title} className="quiz-info">
              <span className="quiz-info-icon">{s.icon}</span>
              <b>{s.title}</b>
              <span className="muted small">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <nav className="home-shortcuts">
        <button onClick={() => onNavigate('themes')}><i className="ti ti-category" aria-hidden="true" /> Temadan sınav ol</button>
        <button onClick={() => onNavigate('placement')}><i className="ti ti-target" aria-hidden="true" /> Seviye testini tekrarla</button>
        <button onClick={() => onNavigate('hard')}><i className="ti ti-flame" aria-hidden="true" /> Zorlandıklarımı çalış</button>
      </nav>
    </>
  )
}

export default QuizCard