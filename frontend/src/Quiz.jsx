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

// Sınav bölümleri: giriş ekranı ve sonuçta kullanılır
const SECTIONS = {
  reading: { icon: '📖', title: 'Okuma', desc: 'Cümleleri ve tanımları oku, doğru kelimeyi seç.' },
  listening: { icon: '🎧', title: 'Dinleme', desc: 'Cümleyi dinle, duyduğun kelimeyi seç. Sesini açmayı unutma!' },
  writing: { icon: '✍️', title: 'Yazma', desc: 'Boşluğa ya da anlama uyan kelimeyi yaz.' },
  speaking: { icon: '🎤', title: 'Konuşma', desc: 'Kelimeyi mikrofona söyle.' }
}

// 75 saniye → "1:15"
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function Quiz({ level, listId, listName, themeId, themeName, count, onExit }) {
  const { supported: micSupported } = useSpeechRecognition()
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [flash, setFlash] = useState(null)        // cevaptan sonraki kısa geri bildirim
  const [mistakes, setMistakes] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [answers, setAnswers] = useState([])          // { section, correct }: bölüm bazlı sonuç için
  const [showIntro, setShowIntro] = useState(true)    // bölüm giriş ekranı
  const startTime = useRef(0)
  
  // Başlangıç zamanını render'da değil, sınav ekrana gelince bir kez al
  useEffect(() => { startTime.current = Date.now() }, [])
  const ready = useQuestionDetails(questions, setQuestions, index)

  // Soruları yükle; mikrofon yoksa "söyle" sorularını "yaz"a çevir
  useEffect(() => {
    const source = listId
      ? `listId=${listId}`
      : themeId
        ? `themeId=${themeId}${level ? `&level=${level}` : ''}`
        : `level=${level}`
    apiFetch(`/api/Quiz?${source}&count=${count}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
          setQuestions(data.map(q =>
          q.questionType === 'speaking' && !micSupported
            ? { ...q, questionType: 'typing', section: q.section === 'speaking' ? 'writing' : q.section }
            : q))
        startTime.current = Date.now()   // süre sorular gelince başlasın
      })
  }, [level, listId, themeId, count, micSupported])

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
    setAnswers(prev => [...prev, { section: question.section, correct: data.correct }])
    setFlash({ correct: data.correct })
  }

  async function finish() {
    setFinished(true)
    const duration = Math.floor((Date.now() - startTime.current) / 1000)
    setElapsed(duration)
    if (listId || themeId) return   // liste ve tema sınavları geçmişe kaydedilmiyor (geçmiş seviye bazlı)
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
    if (index + 1 >= questions.length) {
      finish()
      return
    }
    if (questions[index + 1].section !== questions[index].section) setShowIntro(true)
    setIndex(i => i + 1)
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
        <p>{listId ? `"${listName}" listesinde` : themeId ? `"${themeName}" temasında` : `${level} seviyesinde`} henüz soru çıkacak kelime yok.</p>      
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

        {/* Bölüm bazlı sonuç */}
        <div className="quiz-sections">
          {[...new Set(answers.map(a => a.section))].filter(s => SECTIONS[s]).map(s => {
            const list = answers.filter(a => a.section === s)
            const ok = list.filter(a => a.correct).length
            return (
              <div key={s} className="quiz-section-score">
                <span className="quiz-section-icon">{SECTIONS[s].icon}</span>
                <b>{SECTIONS[s].title}</b>
                <span>{ok} / {list.length}</span>
              </div>
            )
          })}
        </div>

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

  // Bölüm giriş ekranı
  if (showIntro && SECTIONS[question.section]) {
    const info = SECTIONS[question.section]
    const sectionList = [...new Set(questions.map(q => q.section))]
    const count = questions.filter(q => q.section === question.section).length
    return (
      <div className="session">
        <div className="panel quiz-section-intro">
          <span className="quiz-section-icon big">{info.icon}</span>
          <p className="muted">Bölüm {sectionList.indexOf(question.section) + 1} / {sectionList.length}</p>
          <h2>{info.title}</h2>
          <p>{info.desc}</p>
          <p className="muted small">{count} soru</p>
          <button className="btn btn-primary" onClick={() => setShowIntro(false)}>Başla</button>
        </div>
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
        <span className="q-type-tag align-start">
          {SECTIONS[question.section]
            ? `${SECTIONS[question.section].icon} ${SECTIONS[question.section].title}`
            : QUESTION_TYPES_TR[question.questionType]}
        </span>

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