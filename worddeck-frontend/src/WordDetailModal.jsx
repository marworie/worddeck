// ============================================================
// WordDetailModal.jsx
// Bir zor kelimeye tıklanınca açılan pencere:
// anlam, tanım, örnek cümle ve kelime ağı (eş/zıt anlamlılar, ilişkililer, birlikte kullanılanlar).
// ============================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from './api'
import { posTr } from './labels'

// word: listeden gelen kelime (wordId, headword, partOfSpeech, level), onClose: kapat
function WordDetailModal({ word, onClose }) {
  const [details, setDetails] = useState(null)
  const [network, setNetwork] = useState(null)

  // Detaylar ve kelime ağı aynı anda çekilsin
  useEffect(() => {
    apiFetch(`/api/Words/${word.wordId}/details`)
      .then(res => res.ok ? res.json() : {})
      .then(setDetails)
    apiFetch(`/api/Words/${word.wordId}/network`)
      .then(res => res.ok ? res.json() : null)
      .then(setNetwork)
  }, [word.wordId])

  // Esc ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function speak() {
    const u = new SpeechSynthesisUtterance(word.headword)
    u.lang = 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  // Birlikte kullanılanları kalıba oturt: "narrow lane" ya da "run out"
  function collocationText(other) {
    return network.collocationPosition === 'before'
      ? <><b>{other}</b> {word.headword}</>
      : <>{word.headword} <b>{other}</b></>
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="word-detail-head">
          <h2>{word.headword}</h2>
          <button className="speak-btn small" onClick={speak}>🔊</button>
        </div>
        <p className="word-detail-meta">
          <span className="level-badge">{word.level}</span> {posTr(word.partOfSpeech)}
        </p>

        {/* Anlam, tanım, örnek */}
        {!details ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <div className="word-detail-section">
            <div className="detail-row">
              <span className="lang-chip tr">TR</span>
              <p className="tr-meaning">{details.turkishMeaning || '—'}</p>
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
          </div>
        )}

        {/* Kelime ağı */}
        <h3 className="section-title">Kelime ağı</h3>
        {!network ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <div className="network">
            <NetworkGroup title="Eş anlamlılar" items={network.synonyms} />
            <NetworkGroup title="Zıt anlamlılar" items={network.antonyms} />
            <NetworkGroup title="İlişkili kelimeler" items={network.associated} />
            {network.collocations.length > 0 && (
              <div className="network-group">
                <span className="network-title">Sık kullanılan kalıplar</span>
                <div className="chip-list">
                  {network.collocations.map(c => (
                    <span key={c} className="chip collocation">{collocationText(c)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Kelime ağındaki tek bir grup (boşsa hiç gösterilmez)
function NetworkGroup({ title, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="network-group">
      <span className="network-title">{title}</span>
      <div className="chip-list">
        {items.map(i => <span key={i} className="chip">{i}</span>)}
      </div>
    </div>
  )
}

export default WordDetailModal