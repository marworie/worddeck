// Flashcard.jsx
// Tek bir kelime kartı. Ön yüz: kelime, tür, seviye, telaffuz.
// Arka yüz: Türkçe anlam, İngilizce tanım, örnek cümle.
// Dokununca 3D dönme animasyonuyla çevrilir.
// Detaylar (anlam/tanım) kart ekrana gelince arka planda çekilir.

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

// card: oturumdan gelen kart, flipped: arka yüz mü görünüyor, onFlip: çevirme
function Flashcard({ card, flipped, onFlip }) {
// oturumdan gelen kartta bilgiler zaten varsa önceden çekilmişse direkt göster 
  const [details, setDetails] = useState(() =>
    card.turkishMeaning || card.definition
      ? { turkishMeaning: card.turkishMeaning, definition: card.definition, example: card.example }
      : null
  )

  // Kart ekrana gelir gelmez detayları çek; kullanıcı çevirene kadar genelde hazır olur
  useEffect(() => {
    apiFetch(`/api/Words/${card.wordId}/details`)
      .then(res => res.ok ? res.json() : {})
      .then(data => setDetails(data))
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
                <p className="tr-meaning">{details.turkishMeaning || '—'}</p>
              </div>
              <div className="detail-row">
                <span className="lang-chip en">EN</span>
                <p>{details.definition || 'Tanım bulunamadı.'}</p>
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