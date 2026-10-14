// ============================================================
// HardPractice.jsx
// Zor kelime çalışması: sorular sırayla gelir, her biri farklı tipte olabilir.
// Cevaptan sonra geri bildirim (doğru cevap, örnek cümle, durum değişikliği) gösterilir.
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useSpeechRecognition } from './useSpeechRecognition'
import { HARD_STATES, QUESTION_TYPES_TR } from './labels'
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

function HardPractice({ level, onExit }) {
  const { supported: micSupported } = useSpeechRecognition()
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)       // şu anki sorunun detayları yüklendi mi
  const [result, setResult] = useState(null)      // cevaptan sonraki geri bildirim
  const [stats, setStats] = useState({ correct: 0, wrong: 0, promoted: [] })

  // Soruları yükle. Tarayıcı mikrofonu desteklemiyorsa "söyle" sorularını "yaz"a çevir
  useEffect(() => {
    apiFetch(`/api/Hard/practice?level=${level}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setQuestions(data.map(q =>
        q.questionType === 'speaking' && !micSupported ? { ...q, questionType: 'typing' } : q)))
  }, [level, micSupported])

  const question = questions?.[index]

  // Sorunun anlam/tanımı eksik olabilir (henüz hiç çekilmemiş): göstermeden önce tamamla
  useEffect(() => {
    if (!question) return
    setReady(false)
    apiFetch(`/api/Words/${question.wordId}/details`)
      .then(r => r.ok ? r.json() : null)
      .then(details => {
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
    // Bir sonrakini arka planda hazırla
    const next = questions?.[index + 1]
    if (next) apiFetch(`/api/Words/${next.wordId}/details`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions?.length])

  async function handleAnswer(isCorrect, extra = {}) {
    const response = await apiFetch('/api/Hard/answer', {
      method: 'POST',
      body: JSON.stringify({
        wordId: question.wordId,
        questionType: question.questionType,
        isCorrect,
        chosenWordId: extra.chosenWordId ?? null
      })
    })
    if (!response.ok) return
    const data = await response.json()

    setResult({ ...data, ...extra })
    setStats(prev => ({
      correct: prev.correct + (data.correct ? 1 : 0),
      wrong: prev.wrong + (data.correct ? 0 : 1),
      // Bir üst duruma çıkan kelimeleri özette göstermek için topla
      promoted: data.stateChanged && data.state > question.hardState
        ? [...prev.promoted, { headword: question.headword, state: data.state }]
        : prev.promoted
    }))
  }

  const goNext = useCallback(() => {
    setResult(null)
    setIndex(i => i + 1)
  }, [])

  // Geri bildirim açıkken Enter = Devam
  useEffect(() => {
    if (!result) return
    const onKey = (e) => { if (e.key === 'Enter') goNext() }
    // Kısa gecikme: cevabı gönderen Enter tuşu hemen "Devam"ı da tetiklemesin
    const timer = setTimeout(() => window.addEventListener('keydown', onKey), 300)
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey) }
  }, [result, goNext])

  // ===== Yükleniyor / boş / bitti =====
  if (!questions) return <p className="loading-text">Sorular hazırlanıyor...</p>

  if (questions.length === 0) {
    return (
      <div className="panel session-end">
        <h2>Bugünlük bu kadar</h2>
        <p>{level} seviyesinde şu an çalışılacak zor kelime yok. Güçlenen kelimeler yarın tekrar gelecek.</p>
        <button className="btn btn-primary" onClick={onExit}>Zorlandıklarım'a dön</button>
      </div>
    )
  }

  if (index >= questions.length) {
    const total = stats.correct + stats.wrong
    return (
      <div className="panel session-end">
        <h2>Çalışma tamamlandı</h2>
        <p className="session-score">{stats.correct} / {total} doğru</p>
        {stats.promoted.length > 0 && (
          <div className="promoted-list">
            <p className="muted">Durumu yükselen kelimeler:</p>
            {stats.promoted.map(p => (
              <span key={p.headword} className={`state-tag ${HARD_STATES[p.state].className}`}>
                {p.headword} → {HARD_STATES[p.state].label}
              </span>
            ))}
          </div>
        )}
        <button className="btn btn-primary" onClick={onExit}>Zorlandıklarım'a dön</button>
      </div>
    )
  }

  const QuestionComponent = QUESTION_COMPONENTS[question.questionType]

  return (
    <div className="session">
      <div className="session-top">
        <button className="btn btn-ghost" onClick={onExit}>← Çık</button>
        <span className="q-type-tag">{QUESTION_TYPES_TR[question.questionType]}</span>
        <span className="session-counter">{index + 1} / {questions.length}</span>
      </div>

      <div className="session-progress">
        <div className="session-progress-fill" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>

      <div className="panel q-card">
        {!ready ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          // key: her soruda bileşen sıfırdan oluşsun (önceki cevap/seçim kalmasın)
          <QuestionComponent key={question.wordId} question={question} answered={!!result} onAnswer={handleAnswer} />
        )}

        {/* ===== Geri bildirim ===== */}
        {result && (
          <div className={`q-feedback ${result.correct ? 'ok' : 'fail'}`}>
            <p className="q-feedback-title">
              {result.correct ? (result.typo ? '✅ Doğru (küçük bir yazım hatası var)' : '✅ Doğru!') : '❌ Yanlış'}
            </p>

            {/* Doğru cevabı her zaman göster (doğruysa da pekişsin) */}
            <p className="q-correct-answer">
              <b>{question.headword}</b>
              {question.turkishMeaning && <span className="muted"> · {question.turkishMeaning}</span>}
            </p>
            {result.heard && !result.correct && <p className="muted small">Duyduğum: "{result.heard}"</p>}
            {question.example && <p className="example">"{question.example}"</p>}

            {/* Durum değiştiyse belirt */}
            {result.stateChanged && (
              <p className="q-state-change">
                Bu kelime artık <span className={`state-tag ${HARD_STATES[result.state].className}`}>{HARD_STATES[result.state].label}</span>
              </p>
            )}

            <button className="btn btn-primary q-next-btn" onClick={goNext} autoFocus>Devam →</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HardPractice