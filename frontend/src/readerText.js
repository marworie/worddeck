// ============================================================
// reader.js
// Okuyucu yardımcıları: metni kelimelere böler, kelimeyi backend'deki
// Lemmatizer.Normalize ile aynı şekilde temizler.
// ============================================================

// "Doesn't" → "does", "John's," → "john" (backend ile aynı kurallar)
export function normalizeWord(raw) {
  let s = raw.toLowerCase().replace(/’/g, "'").replace(/^[^a-z]+|[^a-z]+$/g, '')
  if (s === "can't") return 'can'
  if (s === "won't") return 'will'
  if (s.endsWith("n't")) s = s.slice(0, -3)
  for (const suffix of ["'s", "'re", "'ve", "'ll", "'d", "'m"]) {
    if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break }
  }
  s = s.replace(/^'+|'+$/g, '')
  return /^[a-z-]+$/.test(s) ? s : ''
}

// Paragrafı kelime ve aradaki işaretler olarak böler
export function tokenize(text) {
  return text.split(/([A-Za-z’'-]+)/).filter(Boolean).map(part => {
    const key = /[A-Za-z]/.test(part) ? normalizeWord(part) : ''
    return { text: part, word: key !== '', key }
  })
}

// Hikayedeki tüm farklı kelimeler (backend'e tek seferde gönderilir)
export function uniqueWords(pages) {
  const set = new Set()
  for (const page of pages) {
    for (const t of tokenize(page)) if (t.word) set.add(t.key)
  }
  return [...set]
}

// İngilizce ses: önce bilgisayardaki yerel ses (kelime vurgulama onunla daha güvenilir)
export function pickEnglishVoice() {
  const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'))
  return voices.find(v => v.localService && v.lang === 'en-US')
    || voices.find(v => v.localService)
    || voices[0]
    || null
}

// Kelime durumlarının renkleri (kullanıcı değiştirebilir, tarayıcıda saklanır)
export const STATUS_LABELS = {
  new: 'Hiç bilmediklerin',
  studying: 'Tekrar edeceklerin',
  known: 'Bildiklerin',
  learned: 'Öğrendiklerin'
}

export const DEFAULT_COLORS = {
  new: { on: true, color: '#ef4444' },
  studying: { on: true, color: '#facc15' },
  known: { on: false, color: '#22c55e' },
  learned: { on: false, color: '#3b82f6' }
}

const COLORS_KEY = 'readerColors'

export function loadColors() {
  try {
    return { ...DEFAULT_COLORS, ...JSON.parse(localStorage.getItem(COLORS_KEY) || '{}') }
  } catch {
    return DEFAULT_COLORS
  }
}

export function saveColors(colors) {
  try { localStorage.setItem(COLORS_KEY, JSON.stringify(colors)) } catch { /* gizli sekme vs. */ }
}

// Arka plan için rengin yarı saydam hali (#ef4444 → #ef444455)
export function softColor(entry) {
  return entry.on ? `${entry.color}55` : 'transparent'
}