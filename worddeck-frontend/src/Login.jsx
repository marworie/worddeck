// Login.jsx
// Giriş yap / kayıt ol ekranı (tek form, iki mod)

import { useState } from 'react'
import { useToast } from './ToastContext'

function Login({ onLoginSuccess }) {
  const showToast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="login-page">
      <form className="login-form panel" onSubmit={handleSubmit}>
        <h1 className="login-logo">🃏 WordDeck</h1>
        <p className="login-subtitle">
          {isRegisterMode ? 'Yeni hesap oluştur' : 'Kelime çalışmaya devam et'}
        </p>

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
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
          required
        />

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? '...' : isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap'}
        </button>

        <p className="toggle-mode">
          {isRegisterMode ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
          <span onClick={() => setIsRegisterMode(!isRegisterMode)}>
            {isRegisterMode ? 'Giriş yap' : 'Kayıt ol'}
          </span>
        </p>
      </form>
    </div>
  )
}

export default Login