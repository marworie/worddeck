// ============================================================
// SentencePractice.jsx
// Kelimeyle cümle kurma: çalışılan kelimelerden 5 tanesiyle cümle yazılır,
// backend kelimenin kullanılıp kullanılmadığına ve dil bilgisine (LanguageTool) bakar.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { posTr } from './labels'

const COUNT = 5

// Cümleyi hatalı kısımları işaretli parçalara böler
function Highlighted({ sentence, issues }) {
  const parts = []
  let pos = 0
  ;[...issues].sort((a, b) => a.offset - b.offset).forEach((issue, i) => {
    if (issue.offset < pos) return   // iç içe hatalar: ilki yeter
    if (issue.offset > pos) parts.push(<span key={`t${i}`}>{sentence.slice(pos, issue.offset)}</span>)
    parts.push(
      <span key={`e${i}`} className="sentence-error" title={`${issue.category}: ${issue.message}`}>
        {sentence.slice(issue.offset, issue.offset + issue.length) || '·'}
      </span>
    )
    pos = issue.offset + issue.length
  })
  if (pos < sentence.length) parts.push(<span key="end">{sentence.slice(pos)}</span>)
  return <p className="sentence-highlight">{parts}</p>
}

function SentencePractice({ onExit }) {
  const [words, setWords] = useState(null)
  const [current, setCurrent] = useState(0)
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [checkedText, setCheckedText] = useState('')
  const [checking, setChecking] = useState(false)
  const [showExample, setShowExample] = useState(false)
  const [scores, setScores] = useState([])   // her kelime için ilk denemede doğru mu
  const [tries, setTries] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    apiFetch(`/api/Sentence/words?count=${COUNT}`)
      .then(r => (r.ok ? r.json() : []))
      .then(list => {
        setWords(list)
        setCurrent(0)
        setScores([])
      })
  }, [reloadKey])

  async function check() {
    if (!text.trim() || checking) return
    setChecking(true)
    const response = await apiFetch('/api/Sentence/check', {
      method: 'POST',
      body: JSON.stringify({ wordId: words[current].wordId, sentence: text })
    })
    setChecking(false)
    if (!response.ok) return
    setResult(await response.json())
    setCheckedText(text.trim())
    setTries(t => t + 1)
  }

  // Önerilen düzeltmeyi cümleye uygula
  function applyFix(issue, value) {
    const s = checkedText
    setText(s.slice(0, issue.offset) + value + s.slice(issue.offset + issue.length))
    setResult(null)
  }

  function next() {
    setScores(s => [...s, { word: words[current].headword, sentence: checkedText, firstTry: tries === 1 }])
    setCurrent(c => c + 1)
    setText('')
    setResult(null)
    setTries(0)
    setShowExample(false)
  }

  if (!words) return <p className="loading-text">Yükleniyor...</p>
  if (words.length === 0) return <div className="page"><p>Alıştırma için kelime bulunamadı.</p></div>

  // Bitti: özet
  if (current >= words.length) {
    const firstTry = scores.filter(s => s.firstTry).length
    return (
      <div className="page sentence-page">
        <h2 className="page-title">✍️ Tebrikler!</h2>
        <p>{words.length} kelimeyle cümle kurdun, <b>{firstTry}</b> tanesini ilk denemede doğru yazdın.</p>
        <ul className="sentence-summary">
          {scores.map(s => (
            <li key={s.word}><b>{s.word}</b> · <span className="muted">{s.sentence}</span> {s.firstTry && '⭐'}</li>
          ))}
        </ul>
        <div className="placement-actions">
          <button className="btn btn-primary" onClick={() => setReloadKey(k => k + 1)}>5 kelime daha</button>
          {onExit && <button className="btn btn-ghost" onClick={onExit}>Ana sayfa</button>}
        </div>
      </div>
    )
  }

  const word = words[current]

  return (
    <div className="page sentence-page">
      <div className="sentence-top">
        <h2 className="page-title">✍️ Cümle kur</h2>
        <span className="muted">{current + 1} / {words.length}</span>
      </div>

      <div className="panel sentence-word">
        <div>
          <h3>{word.headword} <span className="level-badge">{word.level}</span></h3>
          <p className="muted">{posTr(word.partOfSpeech)} · {word.turkishMeaning || '—'}</p>
        </div>
        {word.example && (
          showExample
            ? <p className="example small">💬 "{word.example}"</p>
            : <button className="btn btn-ghost small" onClick={() => setShowExample(true)}>💡 Örnek göster</button>
        )}
      </div>

      <textarea
        className="sentence-input"
        value={text}
        onChange={e => { setText(e.target.value); setResult(null) }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check() } }}
        placeholder={`"${word.headword}" kelimesiyle bir İngilizce cümle yaz...`}
        maxLength={300}
        spellCheck={false}
        rows={3}
        autoFocus
      />

      <div className="placement-actions">
        <button className="btn btn-primary" onClick={check} disabled={!text.trim() || checking}>
          {checking ? 'Kontrol ediliyor...' : 'Kontrol et'}
        </button>
        <button className="btn btn-ghost" onClick={next}>{result?.ok ? 'Sonraki →' : 'Geç'}</button>
      </div>

      {result && (
        <div className={`panel sentence-result ${result.ok ? 'ok' : 'bad'}`}>
          {result.ok ? (
            <p className="sentence-verdict">🎉 Harika! Kelimeyi doğru kullandın, hata bulunamadı.</p>
          ) : (
            <p className="sentence-verdict">Biraz daha düzeltelim:</p>
          )}

          <ul className="sentence-checks">
            <li>{result.usesWord ? '✅' : '❌'} <b>{word.headword}</b> kelimesini {result.usesWord ? 'kullandın' : 'kullanmadın'}</li>
            <li>{result.tooShort ? '❌' : '✅'} {result.wordCount} kelime {result.tooShort && '(en az 4 kelime olmalı)'}</li>
            <li>
              {!result.grammarChecked ? '⚠️ Dil bilgisi şu an kontrol edilemedi'
                : result.issues.length === 0 ? '✅ Dil bilgisi hatası yok'
                : `❌ ${result.issues.length} dil bilgisi / yazım hatası`}
            </li>
          </ul>

          {result.issues.length > 0 && (
            <>
              <Highlighted sentence={checkedText} issues={result.issues} />
              <ul className="sentence-issues">
                {result.issues.map((issue, i) => (
                  <li key={i}>
                    <span className="issue-category">{issue.category}</span> {issue.message}
                    {issue.replacements.length > 0 && (
                      <span className="issue-fixes">
                        {issue.replacements.map(r => (
                          <button key={r} className="chip" onClick={() => applyFix(issue, r)}>{r || '(sil)'}</button>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SentencePractice