// ============================================================
// Flashcard.jsx
// Tek bir kelime kartı. Ön yüz: kelime, tür, seviye, telaffuz.
// Arka yüz: Türkçe anlam, İngilizce tanım (+ Türkçesi), örnek cümle.
// Dokununca 3D dönme animasyonuyla çevrilir.
// Detaylar kart ekrana gelince arka planda çekilir.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

// card: oturumdan gelen kart, flipped: arka yüz mü görünüyor, onFlip: çevirme
function Flashcard({ card, flipped, onFlip }) {
  // Oturumdan gelen kartta bilgiler zaten varsa (önceden çekilmişse) direkt göster, "Yükleniyor" deme
  const [details, setDetails] = useState(() =>
    card.turkishMeaning || card.definition
      ? {
          turkishMeaning: card.turkishMeaning,
          definition: card.definition,
          definitionTr: card.definitionTr,
          example: card.example
        }
      : null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  // Kart ekrana gelir gelmez detayları çek (veritabanında hazırsa anında gelir)
  useEffect(() => {
    apiFetch(`/api/Words/${card.wordId}/details`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setDetails(data) })
  }, [card.wordId])

  // Tarayıcının kendi seslendirme özelliği (ücretsiz, internet gerekmez)
  function speak(e) {
    e.stopPropagation()   // butona basınca kart dönmesin
    const utterance = new SpeechSynthesisUtterance(card.headword)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()   // önceki okuma sürüyorsa kes
    window.speechSynthesis.speak(utterance)
  }

    // ✏️ Düzelt: düzenleme kutusunu mevcut anlamla aç
  function startEdit(e) {
    e.stopPropagation()   // kart dönmesin
    setEditValue(details?.turkishMeaning || '')
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
          <p className="flashcard-pos">{card.partOfSpeech}</p>

          <button className="speak-btn" onClick={speak} title="Telaffuzu dinle">🔊</button>
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
                      {details.turkishMeaning || '—'}
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
                  <p className="example">"{details.example}"</p>
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