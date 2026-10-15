// ============================================================
// Home.jsx
// Ana sayfa panosu: bugünün kartları (tek büyük çağrı), günlük hedef ve seri,
// bölüm kısayolları ve seviyelerin kompakt listesi.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import LevelList from './LevelList'

function Home({ onStartStudy, onNavigate }) {
  const [progress, setProgress] = useState(null)
  const [hard, setHard] = useState(null)
  const [lastQuiz, setLastQuiz] = useState(null)
  const [lists, setLists] = useState([])

  useEffect(() => {
    apiFetch('/api/Study/progress').then(r => (r.ok ? r.json() : null)).then(setProgress)
    apiFetch('/api/Hard/insights').then(r => (r.ok ? r.json() : null)).then(setHard)
    apiFetch('/api/Quiz/history').then(r => (r.ok ? r.json() : [])).then(h => setLastQuiz(h[0] ?? null))
    apiFetch('/api/Lists').then(r => (r.ok ? r.json() : [])).then(setLists)
  }, [])

  if (!progress) return <p className="loading-text">Yükleniyor...</p>

  // Bugün toplam kaç tekrar var, en çok hangi seviyede
  const totalDue = progress.levels.reduce((sum, l) => sum + l.dueToday, 0)
  const busiest = [...progress.levels].sort((a, b) => b.dueToday - a.dueToday)[0]
  // Tekrar yoksa: çalışmaya başladığın ilk seviyeden yeni kelimelerle devam
  const startLevel = totalDue > 0
    ? busiest.level
    : progress.levels.find(l => l.learning > 0)?.level ?? 'A1'

  const goalPct = Math.min(100, (progress.todayReviewed / progress.dailyGoal) * 100)
  const favorites = lists.find(l => l.isFavorites)
  const quizPct = lastQuiz ? Math.round((lastQuiz.correctAnswers / lastQuiz.totalQuestions) * 100) : null

  return (
    <div className="dashboard">
      <h2 className="dash-greeting">Merhaba, {localStorage.getItem('username')} 👋</h2>

      <div className="dash-top">
        {/* Günün ana çağrısı */}
        <div className="today-card">
          <span className="today-label">Bugün</span>
          <span className="today-count">
            {totalDue > 0 ? `${totalDue} kart seni bekliyor` : 'Tekrar edecek kart yok'}
          </span>
          <span className="today-sub">
            {totalDue > 0
              ? `En çok ${busiest.level} seviyesinde (${busiest.dueToday} tekrar)`
              : `${startLevel} seviyesinde yeni kelimelerle devam et`}
          </span>
          <button className="btn today-btn" onClick={() => onStartStudy(startLevel)}>
            Çalışmaya başla <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>

        <div className="dash-stats">
          <div className="stat-card">
            <span className="stat-label">Günlük hedef</span>
            <span className="stat-value">{progress.todayReviewed} / {progress.dailyGoal}</span>
            <div className="daily-goal-bar"><div style={{ width: `${goalPct}%` }} /></div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Seri</span>
              <span className="stat-value">
              {progress.streak > 0 ? `${progress.streak}. gün 🔥` : 'Bugün başla'}
            </span>
          </div>
        </div>
      </div>

      {/* Bölüm kısayolları */}
      <div className="shortcut-grid">
        <button className="shortcut-card" onClick={() => onNavigate('hard')}>
          <i className="ti ti-flame shortcut-icon hard" aria-hidden="true" />
          <b>Zorlandıklarım</b>
          <span className="muted small">
            {hard ? `${hard.hardCount} zor · ${hard.strengtheningCount} güçleniyor` : '…'}
          </span>
        </button>
        <button className="shortcut-card" onClick={() => onNavigate('quizSetup')}>
          <i className="ti ti-checklist shortcut-icon quiz" aria-hidden="true" />
          <b>Sınav</b>
          <span className="muted small">
            {lastQuiz ? `Son: ${lastQuiz.level} · %${quizPct}` : 'Henüz sınav olmadın'}
          </span>
        </button>
        <button className="shortcut-card" onClick={() => onNavigate('notebook')}>
          <i className="ti ti-notebook shortcut-icon notebook" aria-hidden="true" />
          <b>Defterim</b>
          <span className="muted small">
            {lists.length} liste · {favorites?.wordCount ?? 0} favori
          </span>
        </button>
      </div>

      <section className="panel">
        <h3 className="section-title">Seviyeler</h3>
        <LevelList levels={progress.levels} onStartStudy={onStartStudy} />
      </section>
    </div>
  )
}

export default Home