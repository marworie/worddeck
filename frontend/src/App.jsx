// ============================================================
// App.jsx
// Giriş durumu, hangi sayfanın açık olduğu ve genel yerleşim:
// solda menü, üstte arama çubuğu, ortada sayfa.
// ============================================================

import { useEffect, useState } from 'react'
import Login from './Login'
import Sidebar from './Sidebar'
import Home from './Home'
import Levels from './Levels'
import StudySession from './StudySession'
import HardWords from './HardWords'
import HardPractice from './HardPractice'
import QuizCard, { QuizInfo } from './QuizCard'
import Quiz from './Quiz'
import Search from './Search'
import Notebook from './Notebook'
import PhoneticGuide from './PhoneticGuide'
import Settings from './Settings'
import { useToast } from './ToastContext'
import Stats from './Stats'
import PlacementTest from './PlacementTest'
import Themes from './Themes'
import Library from './Library'
import Reader from './Reader'
import SentencePractice from './SentencePractice'
import LearningPath from './LearningPath'

function App() {
  const showToast = useToast()
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null)
  const [view, setView] = useState('home')
  const [studyLevel, setStudyLevel] = useState(null)
  const [practiceLevel, setPracticeLevel] = useState(null)
  const [quizConfig, setQuizConfig] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [storyId, setStoryId] = useState(null)

  // Sayfa değiştir: aramadan çıkınca kutuyu temizle, sayfanın başına dön
  function navigate(next) {
    if (next !== 'search') setSearchQuery('')
    setView(next)
    window.scrollTo(0, 0)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
    setView('home')
  }

  function startStudy(level) {
    setStudyLevel(level)
    navigate('study')
  }

  function startQuiz(config) {
    setQuizConfig(config)
    navigate('quiz')
  }

  // Üst çubuktaki arama: yazmaya başlayınca arama sayfasına geç
  function handleSearchInput(value) {
    setSearchQuery(value)
    if (view !== 'search') setView('search')
  }

  // api.js'ten gelen olayları dinle
  useEffect(() => {
    const onApiError = (e) => showToast(e.detail, 'error')
    const onAuthExpired = () => {
      handleLogout()
      showToast('Oturumun sona erdi, tekrar giriş yap.', 'error')
    }
    window.addEventListener('api-error', onApiError)
    window.addEventListener('auth-expired', onAuthExpired)
    return () => {
      window.removeEventListener('api-error', onApiError)
      window.removeEventListener('auth-expired', onAuthExpired)
    }
  }, [showToast])

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />
  }

  const goHome = () => navigate('home')

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} onLogout={handleLogout} />

      <div className="app-content">
        <header className="topbar">
          <div className="topbar-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Kelime ara: ability, yetenek..."
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          {/* Telefonda ayarlar menüde yok, buradan açılsın */}
          <button className="icon-btn mobile-only" onClick={() => navigate('settings')} aria-label="Ayarlar">
            <i className="ti ti-settings" aria-hidden="true" />
          </button>
        </header>

        <main className="app-main">
          {view === 'home' && <Home onStartStudy={startStudy} onNavigate={navigate} />}
          {view === 'levels' && <Levels onStartStudy={startStudy} />}
          {view === 'study' && <StudySession level={studyLevel} onExit={goHome} />}
          {view === 'stats' && <Stats />}
          {view === 'hard' && (
            <HardWords
              onBack={goHome}
              onStartPractice={(level) => { setPracticeLevel(level); navigate('hardPractice') }}
            />
          )}

          {view === 'hardPractice' && <HardPractice level={practiceLevel} onExit={() => navigate('hard')} />}
          {view === 'quizSetup' && (
            <div className="page quiz-setup">
              <h2 className="page-title">Sınav</h2>
              <QuizCard onStart={(level, count, sections) => startQuiz({ level, count, sections })} />
              <QuizInfo onNavigate={navigate} />
            </div>
          )}

          {view === 'quiz' && (
            <Quiz
              level={quizConfig.level}
              listId={quizConfig.listId}
              listName={quizConfig.listName}
              themeId={quizConfig.themeId}
              themeName={quizConfig.themeName}
              sections={quizConfig.sections}
              count={quizConfig.count}
              wordIds={quizConfig.wordIds}
              pathUnit={quizConfig.pathUnit}
              onExit={() => navigate(
                quizConfig.pathUnit ? 'path'
                  : quizConfig.listId ? 'notebook'
                  : quizConfig.themeId ? 'themes'
                  : 'quizSetup'
              )}
            />
          )}
          {view === 'search' && <Search query={searchQuery} onQueryChange={handleSearchInput} onNavigate={navigate} />}
          {view === 'notebook' && <Notebook onBack={goHome} onStartQuiz={startQuiz} />}
          {view === 'themes' && <Themes onStartQuiz={startQuiz} />}
          {view === 'phonetics' && <PhoneticGuide onBack={goHome} />}
          {view === 'settings' && <Settings onBack={goHome} />}
          {view === 'placement' && <PlacementTest onExit={goHome} onStartLevel={startStudy} />}
          {view === 'library' && (
            <Library onOpen={id => { setStoryId(id); navigate('reader') }} />
          )}
          {view === 'reader' && <Reader storyId={storyId} onExit={() => navigate('library')} />}
          {view === 'sentence' && <SentencePractice onExit={goHome} />}
          {view === 'path' && (
            <LearningPath
              onStartTest={({ level, unit, words }) => startQuiz({
                wordIds: words.map(w => w.wordId),
                count: Math.min(10, words.length),
                pathUnit: {
                  level,
                  themeId: unit.themeId,
                  part: unit.part,
                  name: unit.partCount > 1 ? `${unit.name} ${unit.part}` : unit.name
                }
              })}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App