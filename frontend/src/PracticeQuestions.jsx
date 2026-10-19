// ============================================================
// PracticeQuestions.jsx
// Zor kelime çalışmasındaki 5 soru tipi. Hepsi aynı şekilde kullanılır:
//   <XQuestion question={q} answered={bool} onAnswer={(correct, extra) => ...} />
// extra: { chosenWordId } (çoktan seçmeli), { typo } (yazma), { heard } (söyleme)
// ============================================================

import { useEffect, useState } from 'react'
import { checkTyped, checkSpoken } from './answerCheck'
import { useSpeechRecognition } from './useSpeechRecognition'
import { speak } from './preferences'

// Soruda gösterilecek anlam: Türkçe yoksa İngilizce tanım
function MeaningPrompt({ question }) {
  return (
    <div className="q-prompt">
      {question.turkishMeaning && <p className="q-meaning">{question.turkishMeaning}</p>}
      {question.definition && <p className="q-definition">{question.definition}</p>}
      {!question.turkishMeaning && !question.definition && <p className="muted">Anlam bilgisi yok</p>}
    </div>
  )
}

// Yeni çoktan seçmeli soruların başlıkları (sınav)
const CHOICE_TITLES = {
  cloze: 'Boşluğa hangisi gelir?',
  definition: 'Bu tanım hangi kelimeye ait?',
  'tr-en': 'Bu kelimenin İngilizcesi hangisi?',
  'en-tr': 'Bu kelime ne demek?'
}

// Yeni çoktan seçmeli sorunun metni: boşluk vurgulu cümle, tanım ya da tek kelime
function ChoicePrompt({ question }) {
  const { choiceType, prompt } = question
  if (choiceType === 'cloze') {
    const parts = prompt.split('_____')
    return (
      <p className="q-cloze">
        {parts.map((part, i) => (
          <span key={i}>{part}{i < parts.length - 1 && <span className="q-blank">_____</span>}</span>
        ))}
      </p>
    )
  }
  if (choiceType === 'definition') return <p className="q-definition">{prompt}</p>
  return <p className="q-big">{prompt}</p>
}

// Yazarak cevaplanan sorularda ortak giriş kutusu (+ isteğe bağlı harf ipucu)
function AnswerInput({ answer, answered, onAnswer, allowHint = true }) {
  const [value, setValue] = useState('')
  const [hintCount, setHintCount] = useState(0)   // kaç harf gösterildi

  // İpucu: ilk harfler açık, gerisi alt çizgi → "r _ _"
  const hint = answer.split('').map((ch, i) => (i < hintCount || ch === ' ' ? ch : '_')).join(' ')

  function submit(e) {
    e.preventDefault()
    if (answered || !value.trim()) return
    const result = checkTyped(value, answer)
    onAnswer(result.correct, { typo: result.typo })
  }

  return (
    <form className="q-answer" onSubmit={submit}>
      {hintCount > 0 && <p className="q-hint">{hint}</p>}
      <div className="q-input-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="İngilizcesini yaz..."
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={answered}
        />
        <button type="submit" className="btn btn-primary" disabled={answered || !value.trim()}>Kontrol et</button>
      </div>
      {allowHint && !answered && hintCount < answer.length - 1 && (
        <button type="button" className="btn btn-ghost q-hint-btn" onClick={() => setHintCount(h => h + 1)}>
          💡 Harf ipucu
        </button>
      )}
    </form>
  )
}

// ===== 1. Çoktan seçmeli =====
// Sınavda soru ve şıklar sunucudan hazır gelir (options); Zorlandıklarım'da eski şekilde (choices)
export function ChoiceQuestion({ question, answered, onAnswer }) {
  const [chosen, setChosen] = useState(null)
  const isNew = Array.isArray(question.options)

  // İki biçimi tek tipe çevir: { id, text }
  const options = isNew
    ? question.options
    : question.choices.map(c => ({ id: c.wordId, text: c.headword }))

  function choose(option) {
    if (answered) return
    setChosen(option.id)
    onAnswer(option.id === question.wordId, { chosenWordId: option.id })
  }

  return (
    <>
      <p className="q-instruction">{isNew ? CHOICE_TITLES[question.choiceType] : 'Bu anlama gelen kelime hangisi?'}</p>
      {isNew ? <ChoicePrompt question={question} /> : <MeaningPrompt question={question} />}
      <div className="q-choices">
        {options.map(o => {
          // Cevaplandıktan sonra doğru şık yeşil, yanlış seçilen kırmızı
          let cls = ''
          if (answered && o.id === question.wordId) cls = 'correct'
          else if (answered && o.id === chosen) cls = 'wrong'
          return (
            <button key={o.id} className={`q-choice ${cls}`} onClick={() => choose(o)} disabled={answered}>
              {o.text}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ===== 2. Boşluk doldurma: örnek cümlede kelime gizli =====
export function ClozeQuestion({ question, answered, onAnswer }) {
  return (
    <>
      <p className="q-instruction">Boşluğa gelen kelimeyi yaz</p>
      <p className="q-cloze">{question.clozeSentence}</p>
      {question.turkishMeaning && <p className="q-small-hint">İpucu: {question.turkishMeaning}</p>}
      <AnswerInput answer={question.headword} answered={answered} onAnswer={onAnswer} />
    </>
  )
}

// ===== 3. Yazma: anlam ve tanım verilir, kelime yazılır =====
export function TypingQuestion({ question, answered, onAnswer }) {
  return (
    <>
      <p className="q-instruction">Bu anlama gelen kelimeyi yaz</p>
      <MeaningPrompt question={question} />
      <AnswerInput answer={question.headword} answered={answered} onAnswer={onAnswer} />
    </>
  )
}

// ===== 4. Dinleme: kelime seslendirilir, duyulan yazılır =====
export function ListeningQuestion({ question, answered, onAnswer }) {
  // Soru açılınca kelimeyi bir kez otomatik oku
  useEffect(() => { speak(question.headword) }, [question.headword])

  return (
    <>
      <p className="q-instruction">Duyduğun kelimeyi yaz</p>
      <button className="q-listen-btn" onClick={() => speak(question.headword)}>🔊 Tekrar dinle</button>
      {/* Dinlemede harf ipucu vermiyoruz, amaç sesi yazıyla eşleştirmek */}
      <AnswerInput answer={question.headword} answered={answered} onAnswer={onAnswer} allowHint={false} />
    </>
  )
}

// ===== 5. Söyleme: anlam verilir, kelime mikrofona söylenir =====
export function SpeakingQuestion({ question, answered, onAnswer }) {
  const { listening, listen } = useSpeechRecognition()
  const [error, setError] = useState(null)

  async function handleMic() {
    setError(null)
    try {
      const alternatives = await listen()
      if (alternatives.length === 0) {
        setError('Bir şey duyamadım, tekrar dene.')
        return
      }
      onAnswer(checkSpoken(alternatives, question.headword), { heard: alternatives[0] })
    } catch (err) {
      setError(err.message === 'not-allowed'
        ? 'Mikrofon izni verilmedi. Tarayıcının adres çubuğundan izin verebilirsin.'
        : 'Ses algılanamadı, tekrar dene.')
    }
  }

  return (
    <>
      <p className="q-instruction">Bu anlama gelen kelimeyi söyle</p>
      <MeaningPrompt question={question} />
      <button
        className={`q-mic-btn ${listening ? 'listening' : ''}`}
        onClick={handleMic}
        disabled={answered || listening}
      >
        {listening ? '🎙️ Dinliyorum...' : '🎤 Söylemek için bas'}
      </button>
      {error && <p className="q-error">{error}</p>}
    </>
  )
}