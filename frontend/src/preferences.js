// ============================================================
// preferences.js
// Bu cihaza özel tercihler (aksan, yavaş dinleme, tema) ve
// uygulamadaki tüm seslendirmelerin geçtiği ortak speak() fonksiyonu.
// ============================================================

const DEFAULTS = { accent: 'en-US', slowSpeech: false, theme: 'system', autoSpeak: true, voiceName: '' }

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

// ---------- Ses seçimi ----------
// Doğal sesler önce: tarayıcıların "Natural / Online / Premium / Enhanced" sesleri çok daha insan gibi
const QUALITY = [/natural/i, /neural/i, /online/i, /premium/i, /enhanced/i, /google/i, /\b(ava|zoe|samantha|allison|evan|aria|jenny|guy)\b/i]

function voiceScore(v, accent) {
  let score = 0
  QUALITY.forEach((re, i) => { if (re.test(v.name)) score += (QUALITY.length - i) * 10 })
  if (v.lang === accent) score += 6        // seçili aksan (Amerikan / İngiliz)
  if (!v.localService) score += 2          // çevrimiçi sesler genelde daha doğal
  return score
}

// Cihazdaki İngilizce sesler, en doğaldan başlayarak
export function englishVoices() {
  if (!('speechSynthesis' in window)) return []
  const { accent } = getPrefs()
  return window.speechSynthesis.getVoices()
    .filter(v => v.lang.replace('_', '-').startsWith('en'))
    .sort((a, b) => voiceScore(b, accent) - voiceScore(a, accent))
}

// Kullanıcının seçtiği ses; seçmediyse en doğal olan
export function pickEnglishVoice() {
  const voices = englishVoices()
  const { voiceName } = getPrefs()
  return voices.find(v => v.name === voiceName) || voices[0] || null
}

// Ortak seslendirme: seçili aksan ve hızla okur
export function speak(text) {
  const { accent, slowSpeech } = getPrefs()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent
  utterance.rate = slowSpeech ? 0.6 : 0.9

  // Seçili aksanda bir ses varsa onu kullan (Windows'ta İngiliz aksanı için "Microsoft Hazel" gibi)
  const voice = pickEnglishVoice()
  if (voice) utterance.voice = voice

  window.speechSynthesis.cancel()   // önceki okuma sürüyorsa kes
  window.speechSynthesis.speak(utterance)
}