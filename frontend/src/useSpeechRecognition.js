// ============================================================
// useSpeechRecognition.js
// Tarayıcının ses tanıma özelliğini (Web Speech API) kolay kullanmak için hook.
// Kullanım: const { supported, listening, listen } = useSpeechRecognition()
//           const alternatives = await listen()   // ["run", "ran", "rum", ...]
// Chrome, Edge ve Safari destekliyor; Firefox desteklemiyor (supported = false olur).
// ============================================================

import { useEffect, useRef, useState } from 'react'

// Chrome/Edge'de "webkit" önekiyle geliyor
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const supported = Boolean(SpeechRecognition)

  // Bileşen kapanırken dinleme sürüyorsa durdur
  useEffect(() => () => recognitionRef.current?.abort(), [])

  // Bir kez dinler; duyduğu en fazla 5 tahmini döndürür
  function listen() {
    return new Promise((resolve, reject) => {
      if (!supported) {
        reject(new Error('unsupported'))
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 5      // tek tahmin değil, 5 farklı tahmin
      recognition.interimResults = false   // sadece kesin sonuç
      recognition.continuous = false       // bir kelime/cümle duyunca dur
      recognitionRef.current = recognition

      let settled = false   // Promise bir kez sonuçlansın

      recognition.onresult = (e) => {
        settled = true
        resolve(Array.from(e.results[0]).map(alt => alt.transcript))
      }
      recognition.onerror = (e) => {
        settled = true
        reject(new Error(e.error))   // "no-speech", "not-allowed" (izin yok) gibi
      }
      recognition.onend = () => {
        setListening(false)
        if (!settled) resolve([])    // hiçbir şey duymadan bittiyse boş liste
      }

      setListening(true)
      recognition.start()
    })
  }

  return { supported, listening, listen }
}