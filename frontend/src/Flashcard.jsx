// ============================================================
// Flashcard.jsx
// Tek bir kelime kartı. Ön yüz: kelime, tür, seviye, telaffuz.
// Arka yüz: Türkçe anlam, İngilizce tanım (+ Türkçesi), örnek cümle.
// Dokununca 3D dönme animasyonuyla çevrilir.
// Detaylar kart ekrana gelince arka planda çekilir.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useSpeechRecognition } from './useSpeechRecognition'
import { checkSpoken } from './answerCheck'
import { speak as speakText } from './preferences'
import { ipaToTurkish } from './phonetics'
import { cleanMeanings } from './meaning'
import { posTr } from './labels'

// card: oturumdan gelen kart, flipped: arka yüz mü görünüyor, onFlip: çevirme
function Flashcard({ card, flipped, onFlip }) {
  // Oturumdan gelen kartta bilgiler zaten varsa (önceden çekilmişse) direkt göster, "Yükleniyor" deme
  const [details, setDetails] = useState(() =>
    card.turkishMeaning || card.definition
      ? {
          turkishMeaning: card.turkishMeaning,
          definition: card.definition,
          definitionTr: card.definitionTr,
          example: card.example,
          exampleTr: card.exampleTr,
          phonetic: card.phonetic
        }
      : null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const { supported: micSupported, listening, listen } = useSpeechRecognition()
  const [speechResult, setSpeechResult] = useState(null)   // { ok, heard }
  // Fonetik oturumdan gelmemiş olabilir (henüz çekilmemişse), detaylar gelince oradan alınır
  const phonetic = details?.phonetic ?? card.phonetic

  // Kart ekrana gelir gelmez detayları çek (veritabanında hazırsa anında gelir)
  useEffect(() => {
    apiFetch(`/api/Words/${card.wordId}/details`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setDetails(data) })
  }, [card.wordId])

  // Tarayıcının kendi seslendirme özelliği (ücretsiz, internet gerekmez)
  function speak(e) {
    e.stopPropagation()   // butona basınca kart dönmesin
    speakText(card.headword)
  }

  // Kelimeyi söyle, tarayıcı doğru anlıyor mu bak
  async function checkPronunciation(e) {
    e.stopPropagation()   // kart dönmesin
    setSpeechResult(null)
    try {
      const alternatives = await listen()
      setSpeechResult({ ok: checkSpoken(alternatives, card.headword), heard: alternatives[0] ?? '' })
    } catch {
      setSpeechResult({ ok: false, heard: '' })
    }
  }

    // Düzelt: düzenleme kutusunu mevcut anlamla aç
  function startEdit(e) {
    e.stopPropagation()   // kart dönmesin
    setEditValue(details?.isCustomMeaning ? details.turkishMeaning : cleanMeanings(details?.turkishMeaning) || '')
    setIsEditing(true)
  }

  async function saveMeaning(e) {
    e.preventDefault()
    const response = await apiFetch(`/api/Words/${card.wordId}/meaning`, {
      method: 'PUT',
      body: JSON.stringify({ meaning: editValue })
    })
    if (response.ok) {
      const data = await response.json()
      setDetails(prev => ({ ...prev, ...data }))
      setIsEditing(false)
    }
  }

  return (
    <div className="flashcard-scene" onClick={onFlip}>
      <div className={`flashcard ${flipped ? 'flipped' : ''}`}>

        {/* ===== Ön yüz ===== */}
        <div className="flashcard-face flashcard-front">
          <div className="flashcard-badges">
            <span className="level-badge">{card.level}</span>
            {card.isNew && <span className="new-badge">Yeni</span>}
          </div>
          <h2 className="flashcard-word">{card.headword}</h2>
          <p className="flashcard-pos">{posTr(card.partOfSpeech)}</p>
           {phonetic && (
            <p className="flashcard-phonetic">
              {phonetic}
              <span className="phonetic-tr">{ipaToTurkish(phonetic)}</span>
            </p>
          )}

          <div className="front-buttons">
            <button className="speak-btn" onClick={speak} title="Telaffuzu dinle">🔊</button>
            {micSupported && (
              <button
                className={`speak-btn ${listening ? 'listening' : ''}`}
                onClick={checkPronunciation}
                title="Kelimeyi söyle"
                disabled={listening}
              >
                🎤
              </button>
            )}
          </div>
          {speechResult && (
            <p className={`speech-result ${speechResult.ok ? 'ok' : 'fail'}`}>
              {speechResult.ok
                ? '✓ Doğru!'
                : speechResult.heard ? `✗ Şunu duydum: "${speechResult.heard}"` : 'Duyamadım, tekrar dene'}
            </p>
          )}
          <p className="flashcard-hint">Çevirmek için dokun</p>
        </div>

        {/* ===== Arka yüz ===== */}
        <div className="flashcard-face flashcard-back">
          <h3 className="flashcard-word-small">
            {card.headword}
            <button className="speak-btn small" onClick={speak}>🔊</button>
          </h3>

          {!details ? (
            <p className="loading-text">Yükleniyor...</p>
          ) : (
            <>
              <div className="detail-row">
                <span className="lang-chip tr">TR</span>
                {isEditing ? (
                  // Düzenleme formu: içine tıklamak kartı çevirmesin
                  <form className="meaning-edit" onSubmit={saveMeaning} onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      maxLength={300}
                      placeholder="Boş bırakırsan otomatik çeviri kullanılır"
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary">Kaydet</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Vazgeç</button>
                  </form>
                ) : (
                  <>
                    <p className="tr-meaning">
                      {/* Kendi yazdığın anlam olduğu gibi, otomatik çeviri temizlenerek */}
                      {(details.isCustomMeaning ? details.turkishMeaning : cleanMeanings(details.turkishMeaning)) || '—'}
                      {details.isCustomMeaning && <span className="custom-tag">senin</span>}
                    </p>
                    <button className="edit-meaning-btn" onClick={startEdit} title="Anlamı düzelt">✏️</button>
                  </>
                )}
              </div>

              <div className="detail-row">
                <span className="lang-chip en">EN</span>
                <div>
                  <p>{details.definition || 'Tanım bulunamadı.'}</p>
                  {details.definitionTr && <p className="definition-tr">{details.definitionTr}</p>}
                </div>
              </div>

              {details.example && (
                <div className="detail-row">
                  <span className="detail-icon">💬</span>
                  <div>
                    <p className="example">"{details.example}"</p>
                    {details.exampleTr && <p className="definition-tr">{details.exampleTr}</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Flashcard