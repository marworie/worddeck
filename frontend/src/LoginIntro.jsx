// ============================================================
// LoginIntro.jsx
// Giriş yaptıktan sonra kısa açılış animasyonu (LottieFiles).
// Animasyon bitince (en geç 3 sn) ya da tıklayınca yumuşakça kaybolur.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import introAnimation from './assets/intro.json'

import LottieModule from 'lottie-react'

// Paket eski modül yapısında: Vite bazen bileşeni { default: ... } içinde getiriyor
const Lottie = LottieModule.default ?? LottieModule
const MAX_MS = 3000     // animasyon uzun olsa bile en geç bu kadar sürsün
const FADE_MS = 400     // kaybolma süresi (CSS'teki intro-out ile aynı)

function LoginIntro({ onDone }) {
  const [closing, setClosing] = useState(false)
  const closedRef = useRef(false)   // iki kez kapanmasın (hem animasyon bitti hem tıklandı)

  let name = null
  try { name = localStorage.getItem('username') } catch { /* yoksay */ }

  function close() {
    if (closedRef.current) return
    closedRef.current = true
    setClosing(true)
    setTimeout(onDone, FADE_MS)
  }

  useEffect(() => {
    const timer = setTimeout(close, MAX_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`login-intro ${closing ? 'closing' : ''}`} onClick={close}>
      <Lottie animationData={introAnimation} loop={false} onComplete={close} className="intro-lottie" />
      <h1 className="intro-title">WordDeck</h1>
      {name && <p className="intro-hello">Hoş geldin, {name} 👋</p>}
    </div>
  )
}

export default LoginIntro