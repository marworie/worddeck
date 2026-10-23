// ============================================================
// WordDetailModal.jsx
// Bir kelimeye tıklanınca açılan pencere: anlam, tanım, örnek cümle,
// kelime ailesi ve kelime ağı (eş/zıt anlamlılar, ilişkililer, birlikte kullanılanlar).
// Aile üyesine tıklanınca pencere o kelimeye geçer.
// ============================================================

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from './api'
import { posTr } from './labels'
import { speak as speakText } from './preferences'
import { cleanMeanings } from './meaning'

// word: listeden gelen kelime (wordId, headword, partOfSpeech, level), onClose: kapat
function WordDetailModal({ word, onClose, extra }) {  // Şu an gösterilen kelime: aile üyesine tıklanınca değişir
  const [current, setCurrent] = useState(word)
  const [details, setDetails] = useState(null)
  const [network, setNetwork] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  async function saveMeaning(e) {
    e.preventDefault()
    const response = await apiFetch(`/api/Words/${current.wordId}/meaning`, {
      method: 'PUT',
      body: JSON.stringify({ meaning: editValue })
    })
    if (response.ok) {
      const data = await response.json()
      setDetails(prev => ({ ...prev, ...data }))
      setIsEditing(false)
    }
  }

  // Gösterilen kelime değişince detaylar ve kelime ağı baştan çekilsin
  useEffect(() => {
    setIsEditing(false)
    setDetails(null)
    setNetwork(null)
    apiFetch(`/api/Words/${current.wordId}/details`)
      .then(res => res.ok ? res.json() : {})
      .then(setDetails)
    apiFetch(`/api/Words/${current.wordId}/network`)
      .then(res => res.ok ? res.json() : null)
      .then(setNetwork)
  }, [current.wordId])

  // Esc ile kapat
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function speak() {
    speakText(current.headword)
  }

  // Birlikte kullanılanları kalıba oturt: "narrow lane" ya da "run out"
  function collocationText(other) {
    return network.collocationPosition === 'before'
      ? <><b>{other}</b> {current.headword}</>
      : <>{current.headword} <b>{other}</b></>
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box panel" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Aileden başka bir kelimeye geçildiyse ilk kelimeye dönüş */}
        {current.wordId !== word.wordId && (
          <button className="btn btn-ghost back-btn" onClick={() => setCurrent(word)}>← {word.headword}</button>
        )}

        <div className="word-detail-head">
          <h2>{current.headword}</h2>
          <button className="speak-btn small" onClick={speak}>🔊</button>
        </div>
        <p className="word-detail-meta">
          <span className="level-badge">{current.level}</span> {posTr(current.partOfSpeech)}
          {details?.phonetic && <span className="flashcard-phonetic small"> {details.phonetic}</span>}
        </p>

        {extra && <div className="modal-extra">{extra}</div>}

        {/* Anlam, tanım, örnek */}
        {!details ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <div className="word-detail-section">
            <div className="detail-row">
              <span className="lang-chip tr">TR</span>
              {isEditing ? (
                <form className="meaning-edit" onSubmit={saveMeaning}>
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
                    {(details.isCustomMeaning ? details.turkishMeaning : cleanMeanings(details.turkishMeaning)) || '—'}
                    {details.isCustomMeaning && <span className="custom-tag">senin</span>}
                  </p>
                  <button
                    className="edit-meaning-btn"
                    onClick={() => { setEditValue(details.turkishMeaning || ''); setIsEditing(true) }}
                    title="Anlamı düzelt"
                  >
                    ✏️
                  </button>
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
          </div>
        )}

        {/* Kelime ağı */}
        <h3 className="section-title">Kelime ağı</h3>
        {!network ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <div className="network">
            {network.family.length > 0 && (
              <div className="network-group">
                <span className="network-title">Kelime ailesi</span>
                <div className="chip-list">
                  {network.family.map(f => (
                    <button key={f.wordId} className="chip family" onClick={() => setCurrent(f)}>
                      <b>{f.headword}</b>
                      <span className="muted small"> {posTr(f.partOfSpeech)}</span>
                      {f.turkishMeaning && <span className="small"> · {f.turkishMeaning}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
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