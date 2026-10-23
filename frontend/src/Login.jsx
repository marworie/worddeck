// ============================================================
// Login.jsx
// Giriş yap / kayıt ol ekranı (tek form, iki mod).
// Solda animasyon ve öne çıkan özellikler, sağda form. Telefonda sadece form.
// ============================================================

import { useState } from 'react'
import LottieModule from 'lottie-react'
import { useToast } from './ToastContext'
import introAnimation from './assets/intro.json'

// Paket eski modül yapısında: Vite bazen bileşeni { default: ... } içinde getiriyor
const Lottie = LottieModule.default ?? LottieModule

const FEATURES = [
  { icon: '🃏', text: 'Aralıklı tekrarla kelime kartları' },
  { icon: '📖', text: '32 hikaye, sesli okuma ve okuma kontrolü' },
  { icon: '🗺️', text: 'A1\'den C1\'e adım adım öğrenme yolu' }
]

function Login({ onLoginSuccess }) {
  const showToast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsLoading(true)
    const endpoint = isRegisterMode ? 'register' : 'login'

    try {
      // Burada apiFetch değil düz fetch: hata mesajlarını kendimiz gösteriyoruz (çift toast olmasın)
      const response = await fetch(`/api/Auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        if (isRegisterMode) {
          setIsRegisterMode(false)
          showToast('Kayıt başarılı, şimdi giriş yapabilirsin!')
        } else {
          localStorage.setItem('token', data.token)
          localStorage.setItem('username', data.username)
          onLoginSuccess()
        }
      } else {
        // Doğrulama hatası → errors içindeki ilk mesaj, diğerleri → message
        const firstError = data.errors ? Object.values(data.errors).flat()[0] : null
        showToast(firstError || data.message || 'Bir hata oluştu', 'error')
      }
    } catch {
      showToast('Sunucuya ulaşılamadı. Bağlantını kontrol et.', 'error')
    } finally {
      setIsLoading(false)   // başarılı da olsa hata da olsa buton tekrar açılsın
    }
  }

  return (
    <div className="auth-page">
      {/* Sol: tanıtım (telefonda gizli) */}
      <section className="auth-hero">
        <Lottie animationData={introAnimation} loop className="auth-lottie" />
        <h2>A1'den C1'e İngilizce</h2>
        <ul className="auth-features">
          {FEATURES.map(f => (
            <li key={f.text}><span>{f.icon}</span>{f.text}</li>
          ))}
        </ul>
      </section>

      {/* Sağ: form */}
      <section className="auth-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1 className="auth-logo">🃏 WordDeck</h1>
          <p className="auth-title">{isRegisterMode ? 'Hesap oluştur' : 'Tekrar hoş geldin'}</p>
          <p className="auth-subtitle muted">
            {isRegisterMode ? 'Birkaç saniyede kelime çalışmaya başla.' : 'Kaldığın yerden devam et.'}
          </p>

          <label className="auth-field">
            <i className="ti ti-user" aria-hidden="true" />
            <input
              type="text"
              placeholder="Kullanıcı adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              required
            />
          </label>

          <label className="auth-field">
            <i className="ti ti-lock" aria-hidden="true" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              required
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
            </button>
          </label>

          <button type="submit" className="btn btn-primary auth-submit" disabled={isLoading}>
            {isLoading ? '...' : isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>

          <p className="auth-toggle">
            {isRegisterMode ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
            <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)}>
              {isRegisterMode ? 'Giriş yap' : 'Kayıt ol'}
            </button>
          </p>
        </form>
      </section>
    </div>
  )
}

export default Login