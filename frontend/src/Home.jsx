// ============================================================
// Home.jsx
// Ana sayfa: karşılama, bugünkü çalışma (hero kart), pastel istatistik
// kutucukları, günün kelimesi, hızlı pratik, devam et kartları ve
// seviye yolculuğu.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { posTr } from './labels'
import { speak } from './preferences'
import ContinueCards from './ContinueCards'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

// Örnek cümlede kelimeyi (çekimli haliyle) kalın göster: "She overcame her fear"
function highlight(sentence, headword) {
  const regex = new RegExp(`\\b(${headword}\\w*)\\b`, 'i')
  return sentence.split(regex).map((part, i) =>
    i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>)
}

function Home({ onStartStudy, onNavigate, onOpenStory }) {
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
  const quizPct = lastQuiz ? Math.round((lastQuiz.correctAnswers / lastQuiz.totalQuestions) * 100) : null

  // Hızlı pratik kutucukları: renk sınıfı, ikon, ad, sayfa, küçük bilgi
  const quick = [
    { tone: 't-peach', icon: 'ti-puzzle', label: 'Oyunlar', view: 'games' },
    { tone: 't-lilac', icon: 'ti-headphones', label: 'Dikte', view: 'dictation' },
    { tone: 't-pink', icon: 'ti-pencil', label: 'Cümle kur', view: 'sentence' },
    { tone: 't-blue', icon: 'ti-book', label: 'Okuma', view: 'library' },
    { tone: 't-red', icon: 'ti-flame', label: 'Zorlandıklarım', view: 'hard', info: hard ? `${hard.hardCount} kelime` : null },
    { tone: 't-teal', icon: 'ti-checklist', label: 'Sınav', view: 'quizSetup', info: quizPct != null ? `son: %${quizPct}` : null }
  ]

  return (
    <div className="home">
      {/* 1. Karşılama */}
      <header className="home-top">
        <div>
          <h2>Merhaba, {localStorage.getItem('username')} 👋</h2>
          <p>Bugün İngilizceni biraz geliştirelim mi?</p>
        </div>
        <span className="streak-pill" title="Günlük seri">🔥 {progress.streak}</span>
      </header>

      {/* 2. Bugünkü çalışma */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-label">Bugünkü çalışma</span>
          <h3 className="hero-title">
            {totalDue} tekrar kartı <span>ve {home.dailyNewWords} yeni {startLevel} kelimesi</span>
          </h3>
          <div className="hero-goal">
            <div className="today-goal"><div style={{ width: `${goalPct}%` }} /></div>
            <small>Günlük hedef %{Math.round(goalPct)}</small>
          </div>
          <button className="hero-btn" onClick={() => onStartStudy(startLevel)}>
            Çalışmaya başla <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
        </div>

        {/* Süs: üst üste kartlar, en üstte günün kelimesi */}
        <div className="hero-stack" aria-hidden="true">
          <div />
          <div />
          <div>
            <b>{word?.headword ?? 'WordDeck'}</b>
            {word && <small>{word.turkishMeaning}</small>}
          </div>
        </div>
      </section>

      {/* 3. Pastel istatistik kutucukları */}
      <section className="stat-tiles">
        <div className="stat-tile t-teal">
          <i className="ti ti-target" aria-hidden="true" />
          <b>{progress.todayReviewed}/{progress.dailyGoal}</b>
          <span>Bugünkü kart</span>
        </div>
        <div className="stat-tile t-peach">
          <i className="ti ti-flame" aria-hidden="true" />
          <b>{progress.streak}</b>
          <span>Günlük seri</span>
        </div>
        <div className="stat-tile t-blue">
          <i className="ti ti-calendar-week" aria-hidden="true" />
          <b>{home.daysThisWeek}</b>
          <span>Bu hafta çalıştığın gün</span>
        </div>
        <div className="stat-tile t-lilac">
          <i className="ti ti-brain" aria-hidden="true" />
          <b>{home.knownTotal}</b>
          <span>Bildiğin kelime</span>
        </div>
      </section>

      {/* 4. Günün kelimesi + hızlı pratik */}
      <div className="home-grid">
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

        <section className="panel">
          <div className="card-head">
            <span className="card-label">Hızlı pratik</span>
            <span className="muted">Birkaç dakikan mı var?</span>
          </div>
          <div className="quick-grid">
            {quick.map(q => (
              <button key={q.view} className={`quick-item ${q.tone}`} onClick={() => onNavigate(q.view)}>
                <i className={`ti ${q.icon}`} aria-hidden="true" />
                {q.label}
                {q.info && <small>{q.info}</small>}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 5. Kaldığın yerden devam */}
      <ContinueCards onOpenStory={onOpenStory} onNavigate={onNavigate} />

      {/* 6. Öğrenme yolculuğu */}
      <section className="journey panel">
        <div className="journey-head">
          <h3 className="section-title">Öğrenme yolculuğun</h3>
          <button className="btn btn-ghost small" onClick={() => onNavigate('placement')}>Seviye testi</button>
        </div>
        <div className="journey-path">
          {home.journey.map((j, i) => {
            const knownPct = j.total ? (j.known / j.total) * 100 : 0
            const studiedPct = j.total ? (j.studied / j.total) * 100 : 0
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'next'
            return (
              <button key={j.level} className={`journey-step ${state}`} onClick={() => onStartStudy(j.level)}>
                <span className="journey-dot">{j.level}</span>
                {state === 'current' && <span className="journey-here">Buradasın</span>}
                <div className="journey-bar">
                  <div className="studied" style={{ width: `${studiedPct}%` }} />
                  <div className="learned" style={{ width: `${knownPct}%` }} />
                </div>
                <span className="muted small">
                  {state === 'done' ? '✓ Geçildi' : `${j.known} / ${j.total}`}
                </span>
              </button>
            )
          })}
          <div className="journey-step locked">
            <span className="journey-dot">C2</span>
            <span className="muted small">Yakında</span>
          </div>
        </div>

        <p className="journey-summary">
          <b>{home.knownTotal}</b> kelimeyi biliyorsun · <b>{home.learnedTotal}</b> kalıcı öğrenildi · <b>{home.studyingTotal}</b> öğreniliyor
        </p>
      </section>
    </div>
  )
}

export default Home