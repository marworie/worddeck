// ============================================================
// App.jsx
// Giriş durumu, hangi sayfanın açık olduğu ve genel yerleşim:
// solda menü, üstte arama çubuğu, ortada sayfa.
// Sayfalar lazy yüklenir: kodları ilk açıldıklarında indirilir.
// ============================================================

import { lazy, Suspense, useEffect, useState } from 'react'
import { ReactLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'
import Login from './Login'
import Sidebar from './Sidebar'
import Home from './Home'
import QuizCard, { QuizInfo } from './QuizCard'
import Badges from './Badges'
import { checkNewBadges } from './badgeNotify'
import { useToast } from './ToastContext'
import PageHeader from './PageHeader'

// Sayfalar ilk açıldıklarında indirilir (ilk yükleme hızlansın)
const Levels = lazy(() => import('./Levels'))
const StudySession = lazy(() => import('./StudySession'))
const HardWords = lazy(() => import('./HardWords'))
const HardPractice = lazy(() => import('./HardPractice'))
const Quiz = lazy(() => import('./Quiz'))
const Search = lazy(() => import('./Search'))
const Notebook = lazy(() => import('./Notebook'))
const PhoneticGuide = lazy(() => import('./PhoneticGuide'))
const Settings = lazy(() => import('./Settings'))
const Stats = lazy(() => import('./Stats'))
const PlacementTest = lazy(() => import('./PlacementTest'))
const Themes = lazy(() => import('./Themes'))
const Library = lazy(() => import('./Library'))
const Reader = lazy(() => import('./Reader'))
const SentencePractice = lazy(() => import('./SentencePractice'))
const LearningPath = lazy(() => import('./LearningPath'))
const LoginIntro = lazy(() => import('./LoginIntro'))
const Dictation = lazy(() => import('./Dictation'))
const Games = lazy(() => import('./Games'))
const Practice = lazy(() => import('./Practice'))

// Her sayfanın bölüm rengi (başlık ve üstteki renkli parıltı bu renkte olur)
const SECTION_COLOR = {
  home: '#0d9488', levels: '#0d9488', study: '#0d9488',
  hard: '#ef4444', hardPractice: '#ef4444',
  quizSetup: '#3b82f6', quiz: '#3b82f6', placement: '#3b82f6', path: '#3b82f6',
  games: '#f97316', sentence: '#ec4899', dictation: '#a855f7',
  library: '#7c3aed', reader: '#7c3aed', search: '#0ea5e9', themes: '#22c55e',
  badges: '#eab308', notebook: '#d97706', stats: '#6366f1',
  phonetics: '#64748b', settings: '#64748b',
  practice: '#f97316'
}

function App() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches   // Sistem ayarlarında "hareketi azalt" açık olanlara yumuşak kaydırma uygulanmasın
  const showToast = useToast()
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null)
  const [view, setView] = useState('home')
  const [studyLevel, setStudyLevel] = useState(null)
  const [practiceLevel, setPracticeLevel] = useState(null)
  const [quizConfig, setQuizConfig] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [storyId, setStoryId] = useState(null)
  const [showIntro, setShowIntro] = useState(false)

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

  // Ana sayfaya her dönüşte yeni rozet var mı bak
  useEffect(() => {
    if (isLoggedIn && view === 'home') checkNewBadges(showToast)
  }, [isLoggedIn, view, showToast])

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => { setIsLoggedIn(true); if (!reduceMotion) setShowIntro(true) }} />
  }

  const goHome = () => navigate('home')

  return (
    <div className="app-shell">
      {!reduceMotion && <ReactLenis root options={{ lerp: 0.03, smoothWheel: true }} />}
      {showIntro && (
        <Suspense fallback={null}>
          <LoginIntro onDone={() => setShowIntro(false)} />
        </Suspense>
      )}
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

        <main className="app-main" style={{ '--section': SECTION_COLOR[view] ?? '#0d9488' }}>
         {/* Lazy sayfanın kodu inene kadar "Yükleniyor..." görünür */}
          <Suspense fallback={<div className="panel">Yükleniyor...</div>}>
            {view === 'home' && (
              <Home
                onStartStudy={startStudy}
                onNavigate={navigate}
                onOpenStory={id => { setStoryId(id); navigate('reader') }}
              />
            )}
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
                <PageHeader icon="ti-checklist" tone="t-blue" title="Sınav" subtitle="Çalıştığın kelimelerden karışık sorularla kendini test et" />                
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
                  quizConfig.fromStory ? 'reader'
                    : quizConfig.pathUnit ? 'path'
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
              <Library
                onOpen={id => { setStoryId(id); navigate('reader') }}
                onOpenCustom={() => { setStoryId('custom'); navigate('reader') }}
              />
            )}
            {view === 'reader' && (
              <Reader
                storyId={storyId}
                onExit={() => navigate('library')}
                onStartQuiz={ids => startQuiz({ wordIds: ids, count: Math.min(10, ids.length), fromStory: true })}
              />
            )}

            {view === 'sentence' && <SentencePractice onExit={goHome} />}
            {view === 'dictation' && <Dictation onExit={goHome} />}
            {view === 'games' && <Games />}
            {view === 'practice' && <Practice onNavigate={navigate} />}
            {view === 'badges' && <Badges />}
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
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default App