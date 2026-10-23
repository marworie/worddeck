// ============================================================
// preferences.js
// Bu cihaza özel tercihler (aksan, yavaş dinleme, tema) ve
// uygulamadaki tüm seslendirmelerin geçtiği ortak speak() fonksiyonu.
// ============================================================

const DEFAULTS = { accent: 'en-US', slowSpeech: false, theme: 'system' }

export function getPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('prefs') || '{}') }
  } catch {
    return DEFAULTS   // bozuk kayıt varsa varsayılanlara dön
  }
}

export function setPref(key, value) {
  localStorage.setItem('prefs', JSON.stringify({ ...getPrefs(), [key]: value }))
  if (key === 'theme') applyTheme()
}

// Temayı sayfaya uygula. "system" ise işletim sisteminin ayarına bak
export function applyTheme() {
  const { theme } = getPrefs()
  const dark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

// Ortak seslendirme: seçili aksan ve hızla okur
export function speak(text) {
  const { accent, slowSpeech } = getPrefs()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent
  utterance.rate = slowSpeech ? 0.6 : 0.9

  // Seçili aksanda bir ses varsa onu kullan (Windows'ta İngiliz aksanı için "Microsoft Hazel" gibi)
  const voice = window.speechSynthesis.getVoices().find(v => v.lang === accent)
  if (voice) utterance.voice = voice

  window.speechSynthesis.cancel()   // önceki okuma sürüyorsa kes
  window.speechSynthesis.speak(utterance)
}