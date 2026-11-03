// ============================================================
// gameUtils.js
// Oyunların ortak yardımcıları: karıştırma, rekorlar, kelime çekme, seslendirme
// ============================================================

import { apiFetch } from './api'
import { pickEnglishVoice } from './readerText'

// Fisher–Yates: her sıralama eşit olasılıkla
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)]

// Sadece İngilizce harflerden oluşan, istenen uzunlukta kelime mi?
export const isLetters = (word, min = 3, max = 12) =>
  new RegExp(`^[a-z]{${min},${max}}$`).test(word.toLowerCase())

// Rekorlar: { kaynak: değer } şeklinde, oyun başına bir anahtar
export function getBest(key, source = 'all') {
  try { return (JSON.parse(localStorage.getItem(key)) ?? {})[source] ?? null } catch { return null }
}

export function setBestValue(key, source, value) {
  try {
    const all = JSON.parse(localStorage.getItem(key)) ?? {}
    localStorage.setItem(key, JSON.stringify({ ...all, [source]: value }))
  } catch { /* önemli değil */ }
}

// Oyun kelimeleri: { wordId, headword, meaning }
export async function fetchGameWords(source, count) {
  const r = await apiFetch(`/api/Games/words?source=${source}&count=${count}`)
  return r.ok ? r.json() : []
}

// Cümle ya da kelime seslendir (hız ayarlı)
export function speakText(text, rate = 0.9) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  const voice = pickEnglishVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}