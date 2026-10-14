// ============================================================
// QuizCard.jsx
// Ana sayfadaki "Sınav" kartı: seviye ve soru sayısı seçimi, son sınavlar.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const COUNTS = [10, 20, 30]

// onStart(level, count): sınavı başlatmak için
function QuizCard({ onStart }) {
  const [level, setLevel] = useState('A1')
  const [count, setCount] = useState(10)
  const [history, setHistory] = useState([])

  useEffect(() => {
    apiFetch('/api/Quiz/history').then(r => (r.ok ? r.json() : [])).then(setHistory)
  }, [])

  return (
    <div className="quiz-card panel">
      <div className="quiz-card-head">
        <h3>Sınav</h3>
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

        <button className="btn btn-primary quiz-start-btn" onClick={() => onStart(level, count)}>
          Başla →
        </button>
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

export default QuizCard