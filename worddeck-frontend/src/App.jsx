// App.jsx
// Giriş durumunu ve hangi sayfanın açık olduğunu yönetir.
// API hatalarını toast olarak gösterir oturum düşerse giriş ekranına döner.

import { useEffect, useState } from 'react'
import Login from './Login'
import Home from './Home'
import { useToast } from './ToastContext'
import StudySession from './StudySession'

function App() {
  const showToast = useToast()
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('token') !== null)
  const [view, setView] = useState('home')   // 'home' | 'study' | 'settings'
  const [studyLevel, setStudyLevel] = useState(null) // çalışılan seviye

  function startStudy(level){
    setStudyLevel(level)
    setView('study')
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
    setView('home')
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

  // Giriş yapılmış, ana uygulama
  return (
    <>
      <header className="app-header">
        <span className="app-logo" onClick={() => setView('home')}>🃏 WordDeck</span>
        <nav className="app-nav">
          <button className="btn btn-ghost" onClick={() => setView('settings')}>⚙️</button>
          <button className="btn btn-ghost" onClick={handleLogout}>Çıkış</button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'home' && <Home onStartStudy={startStudy}/>}
        {view === 'study' && <StudySession level={studyLevel} onExit={() => setView('home')}/>}
        {view === 'settings' && <p>Ayarlar</p>}
      </main>
    </>
  )
}

export default App