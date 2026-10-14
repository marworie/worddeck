// ============================================================
// Quiz.jsx
// Sınav ekranı: karışık tipte sorular, süre ve skor.
// Cevaptan sonra kısa bir ✅/❌ gösterilip otomatik olarak sonraki soruya geçilir.
// Sonunda skor ve yanlışlar listelenir; yanlışlar backend'de Zorlandıklarım'a eklenir.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import { useSpeechRecognition } from './useSpeechRecognition'
import { useQuestionDetails } from './useQuestionDetails'
import { QUESTION_TYPES_TR } from './labels'
import {
  ChoiceQuestion, ClozeQuestion, TypingQuestion, ListeningQuestion, SpeakingQuestion
} from './PracticeQuestions'

const QUESTION_COMPONENTS = {
  choice: ChoiceQuestion,
  cloze: ClozeQuestion,
  typing: TypingQuestion,
  listening: ListeningQuestion,
  speaking: SpeakingQuestion
}

// 75 saniye → "1:15"
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function Quiz({ level, count, onExit }) {
  const { supported: micSupported } = useSpeechRecognition()
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [flash, setFlash] = useState(null)        // cevaptan sonraki kısa geri bildirim
  const [mistakes, setMistakes] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const startTime = useRef(Date.now())

  const ready = useQuestionDetails(questions, setQuestions, index)

  // Soruları yükle; mikrofon yoksa "söyle" sorularını "yaz"a çevir
  useEffect(() => {
    apiFetch(`/api/Quiz?level=${level}&count=${count}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setQuestions(data.map(q =>
          q.questionType === 'speaking' && !micSupported ? { ...q, questionType: 'typing' } : q))
        startTime.current = Date.now()   // süre sorular gelince başlasın
      })
  }, [level, count, micSupported])

  // Süre sayacı
  useEffect(() => {
    if (finished || !questions?.length) return
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [finished, questions])

  const question = questions?.[index]
  const correctCount = index - mistakes.length + (flash && flash.correct ? 1 : 0)

  async function handleAnswer(isCorrect, extra = {}) {
    const response = await apiFetch('/api/Quiz/answer', {
      method: 'POST',
      body: JSON.stringify({
        wordId: question.wordId,
        questionType: question.questionType,
        isCorrect,
        chosenWordId: extra.chosenWordId ?? null
      })
    })
    const data = response.ok ? await response.json() : { correct: isCorrect }

    if (!data.correct) {
      setMistakes(prev => [...prev, {
        wordId: question.wordId,
        headword: question.headword,
        turkishMeaning: question.turkishMeaning,
        type: question.questionType
      }])
    }
    setFlash({ correct: data.correct })
  }

  async function finish() {
    setFinished(true)
    const duration = Math.floor((Date.now() - startTime.current) / 1000)
    setElapsed(duration)
    await apiFetch('/api/Quiz/finish', {
      method: 'POST',
      body: JSON.stringify({
        level,
        totalQuestions: questions.length,
        correctAnswers: questions.length - mistakes.length,
        durationSeconds: duration
      })
    })
  }

  function goNext() {
    setFlash(null)
    if (index + 1 >= questions.length) finish()
    else setIndex(i => i + 1)
  }

  // Geri bildirimden sonra otomatik geç: doğruda kısa, yanlışta doğru cevabı okuyabilmek için biraz daha uzun
  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(goNext, flash.correct ? 900 : 2200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash])

  // ===== Yükleniyor / boş =====
  if (!questions) return <p className="loading-text">Sınav hazırlanıyor...</p>

  if (questions.length === 0) {
    return (
      <div className="panel session-end">
        <h2>Henüz sınav olamazsın</h2>
        <p>{level} seviyesinde henüz hiç kelime çalışmadın. Önce birkaç kart çalış, sonra kendini test et.</p>
        <button className="btn btn-primary" onClick={onExit}>Ana sayfaya dön</button>
      </div>
    )
  }

  // ===== Sonuç =====
  if (finished) {
    const total = questions.length
    const correct = total - mistakes.length
    const pct = Math.round((correct / total) * 100)
    return (
      <div className="panel session-end quiz-result">
        <h2>{pct >= 80 ? 'Harika!' : pct >= 50 ? 'İyi gidiyorsun' : 'Biraz daha çalışmalı'}</h2>
        <p className="session-score">{correct} / {total} · %{pct}</p>
        <p className="muted">Süre: {formatTime(elapsed)}</p>

        {mistakes.length > 0 && (
          <div className="quiz-mistakes">
            <p className="network-title">Yanlışların ({mistakes.length})</p>
            {mistakes.map(m => (
              <div key={m.wordId} className="quiz-mistake-row">
                <b>{m.headword}</b>
                <span className="muted">{m.turkishMeaning || '—'}</span>
                <span className="q-type-tag small">{QUESTION_TYPES_TR[m.type]}</span>
              </div>
            ))}
            <p className="muted small">Bu kelimeler Zorlandıklarım'a eklendi.</p>
          </div>
        )}

        <button className="btn btn-primary" onClick={onExit}>Ana sayfaya dön</button>
      </div>
    )
  }

  const QuestionComponent = QUESTION_COMPONENTS[question.questionType]

  // ===== Sınav sürüyor =====
  return (
    <div className="session">
      <div className="session-top">
        <button className="btn btn-ghost" onClick={onExit}>← Çık</button>
        <div className="quiz-meta">
          <span className="quiz-timer">⏱ {formatTime(elapsed)}</span>
          <span className="quiz-score">✓ {correctCount}</span>
        </div>
        <span className="session-counter">{index + 1} / {questions.length}</span>
      </div>

      <div className="session-progress">
        <div className="session-progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="panel q-card">
        <span className="q-type-tag align-start">{QUESTION_TYPES_TR[question.questionType]}</span>

        {!ready ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <QuestionComponent key={question.wordId} question={question} answered={!!flash} onAnswer={handleAnswer} />
        )}

        {/* Kısa geri bildirim: otomatik kaybolur, istersen beklemeden geç */}
        {flash && (
          <div className={`quiz-flash ${flash.correct ? 'ok' : 'fail'}`}>
            <span>
              {flash.correct
                ? '✅ Doğru'
                : <>❌ Doğrusu: <b>{question.headword}</b>{question.turkishMeaning && ` · ${question.turkishMeaning}`}</>}
            </span>
            <button className="btn btn-ghost" onClick={goNext}>Devam →</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Quiz