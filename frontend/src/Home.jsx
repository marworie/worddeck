// ============================================================
// Home.jsx
// Ana sayfa: kısa karşılama, tek ana eylem (bugünkü çalışma), günün kelimesi,
// seviye yolculuğu ve küçük kısayollar. Panel değil, öğrenmenin başladığı yer.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { posTr } from './labels'
import { speak } from './preferences'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

// Örnek cümlede kelimeyi (çekimli haliyle) kalın göster: "She overcame her fear"
function highlight(sentence, headword) {
  const regex = new RegExp(`\\b(${headword}\\w*)\\b`, 'i')
  return sentence.split(regex).map((part, i) =>
    i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>)
}

function Home({ onStartStudy, onNavigate }) {
  const [progress, setProgress] = useState(null)
  const [home, setHome] = useState(null)
  const [details, setDetails] = useState(null)   // günün kelimesinin okunuşu ve örnek çevirisi
  const [hard, setHard] = useState(null)
  const [lastQuiz, setLastQuiz] = useState(null)

  useEffect(() => {
    apiFetch('/api/Study/progress').then(r => (r.ok ? r.json() : null)).then(setProgress)
    apiFetch('/api/Home').then(r => (r.ok ? r.json() : null)).then(setHome)
    apiFetch('/api/Hard/insights').then(r => (r.ok ? r.json() : null)).then(setHard)
    apiFetch('/api/Quiz/history').then(r => (r.ok ? r.json() : [])).then(h => setLastQuiz(h[0] ?? null))
  }, [])

  // Günün kelimesi gelince okunuşunu ve örnek cümlenin Türkçesini çek
  const wordId = home?.wordOfDay?.wordId
  useEffect(() => {
    if (!wordId) return
    apiFetch(`/api/Words/${wordId}/details`).then(r => (r.ok ? r.json() : null)).then(setDetails)
  }, [wordId])

  async function addWordOfDay() {
    const response = await apiFetch(`/api/Words/${wordId}/study`, { method: 'POST' })
    if (response.ok) setHome(prev => ({ ...prev, wordOfDay: { ...prev.wordOfDay, inStudy: true } }))
  }

  if (!progress || !home) return <p className="loading-text">Yükleniyor...</p>

  // Bugünkü çalışma: tekrarlar en çok hangi seviyedeyse oradan, tekrar yoksa kendi seviyenden başla
  const totalDue = progress.levels.reduce((sum, l) => sum + l.dueToday, 0)
  const busiest = [...progress.levels].sort((a, b) => b.dueToday - a.dueToday)[0]
  const startLevel = totalDue > 0 ? busiest.level : home.currentLevel
  const goalPct = Math.min(100, (progress.todayReviewed / progress.dailyGoal) * 100)

  const word = home.wordOfDay
  const currentIndex = LEVELS.indexOf(home.currentLevel)

  return (
    <div className="home">
      {/* 1. Kısa karşılama */}
      <header className="home-greet">
        <h2>Merhaba, {localStorage.getItem('username')} 👋</h2>
        <p>Bugün İngilizceni biraz geliştirelim mi?</p>
        <div className="home-pills">
          <span>🎯 {progress.todayReviewed} / {progress.dailyGoal} kart</span>
          <span className="warm">🔥 {progress.streak > 0 ? `${progress.streak} günlük seri` : 'Seriye bugün başla'}</span>
          <span>📅 Bu hafta {home.daysThisWeek} gün</span>
        </div>
      </header>

      <div className="home-main">
        {/* 2. Tek ana eylem */}
        <section className="today-panel">
          <span className="today-label">Bugünkü çalışma</span>
          <ul className="today-items">
            <li><b>{totalDue}</b> tekrar kartı</li>
            <li><b>{home.dailyNewWords}</b> yeni kelime <span className="today-level">{startLevel}</span></li>
          </ul>
          <button className="today-start" onClick={() => onStartStudy(startLevel)}>
            Çalışmaya başla <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
          <div className="today-goal">
            <div style={{ width: `${goalPct}%` }} />
          </div>
          <span className="today-goal-text">Günlük hedefin %{Math.round(goalPct)}</span>
        </section>

        {/* 3. Günün kelimesi */}
        {word ? (
          <section className="wotd panel">
            <span className="wotd-label">Günün kelimesi</span>
            <span className="wotd-meta">{word.level} · {posTr(word.partOfSpeech)}</span>
            <div className="wotd-head">
              <h3 className="wotd-word">{word.headword}</h3>
              <button className="speak-btn" onClick={() => speak(word.headword)} aria-label="Dinle">🔊</button>
            </div>
            {details?.phonetic && <span className="wotd-phonetic">{details.phonetic}</span>}
            <p className="wotd-meaning">{word.turkishMeaning}</p>

            <div className="wotd-example">
              <p>
                {highlight(word.example, word.headword)}
                <button className="wotd-example-speak" onClick={() => speak(word.example)} aria-label="Cümleyi dinle">🔊</button>
              </p>
              {details?.exampleTr && <p className="muted small">{details.exampleTr}</p>}
            </div>

            <button className="btn btn-primary wotd-btn" onClick={addWordOfDay} disabled={word.inStudy}>
              {word.inStudy ? 'Kartlarında ✓' : 'Kartlarıma ekle'}
            </button>
          </section>
        ) : (
          <section className="wotd panel">
            <span className="wotd-label">Günün kelimesi</span>
            <p className="muted">Bugün için uygun kelime bulunamadı, yarın tekrar bak 🙂</p>
          </section>
        )}
      </div>

      {/* 4. Öğrenme yolculuğu */}
      <section className="journey panel">
        <div className="journey-head">
          <h3 className="section-title">Öğrenme yolculuğun</h3>
          <button className="btn btn-ghost small" onClick={() => onNavigate('placement')}>Seviye testi</button>
        </div>

        <div className="journey-path">
          {home.journey.map((j, i) => {
            const learnedPct = j.total ? (j.learned / j.total) * 100 : 0
            const studiedPct = j.total ? (j.studied / j.total) * 100 : 0
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'next'
            return (
              <button key={j.level} className={`journey-step ${state}`} onClick={() => onStartStudy(j.level)}>
                <span className="journey-dot">{j.level}</span>
                {state === 'current' && <span className="journey-here">Buradasın</span>}
                <div className="journey-bar">
                  <div className="studied" style={{ width: `${studiedPct}%` }} />
                  <div className="learned" style={{ width: `${learnedPct}%` }} />
                </div>
                <span className="muted small">{j.learned} / {j.total}</span>
              </button>
            )
          })}
          <div className="journey-step locked">
            <span className="journey-dot">C2</span>
            <span className="muted small">Yakında</span>
          </div>
        </div>

        <p className="journey-summary">
          Toplam <b>{home.learnedTotal}</b> kelime öğrendin · <b>{home.studyingTotal}</b> kelime öğreniliyor
        </p>
      </section>

      {/* 5. Küçük kısayollar */}
      <nav className="home-shortcuts">
        <button onClick={() => onNavigate('hard')}>
          <i className="ti ti-flame" aria-hidden="true" /> Zorlandıklarım
          {hard && <span className="muted small">{hard.hardCount}</span>}
        </button>
        <button onClick={() => onNavigate('quizSetup')}>
          <i className="ti ti-checklist" aria-hidden="true" /> Sınav
          {lastQuiz && <span className="muted small">%{Math.round((lastQuiz.correctAnswers / lastQuiz.totalQuestions) * 100)}</span>}
        </button>
        <button onClick={() => onNavigate('themes')}>
          <i className="ti ti-category" aria-hidden="true" /> Temalar
        </button>
        <button onClick={() => onNavigate('stats')}>
          <i className="ti ti-chart-bar" aria-hidden="true" /> İstatistikler
        </button>
      </nav>
    </div>
  )
}

export default Home