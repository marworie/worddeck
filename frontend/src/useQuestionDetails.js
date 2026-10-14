// ============================================================
// useQuestionDetails.js
// Sınav ve zor kelime çalışmasında: şu anki sorunun anlam/tanım/örneğini
// veritabanından (yoksa dış API'lerden) tamamlar, bir sonrakini arka planda hazırlar.
// Dönen değer: şu anki soru gösterilmeye hazır mı
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

export function useQuestionDetails(questions, setQuestions, index) {
  const [ready, setReady] = useState(false)
  const question = questions?.[index]

  useEffect(() => {
    if (!question) return
    let cancelled = false
    setReady(false)

    apiFetch(`/api/Words/${question.wordId}/details`)
      .then(r => (r.ok ? r.json() : null))
      .then(details => {
        if (cancelled) return
        if (details) {
          setQuestions(prev => prev.map((q, i) => i === index ? {
            ...q,
            turkishMeaning: details.turkishMeaning ?? q.turkishMeaning,
            definition: details.definition ?? q.definition,
            example: details.example ?? q.example
          } : q))
        }
        setReady(true)
      })

    // Bir sonraki soruyu arka planda hazırla
    const next = questions[index + 1]
    if (next) apiFetch(`/api/Words/${next.wordId}/details`)

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, question?.wordId])

  return ready
}