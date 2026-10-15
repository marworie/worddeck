// ============================================================
// WordRow.jsx
// Arama sonuçlarında ve listelerde tek bir kelime satırı:
// ⭐ favori, ➕ listeye ekle, 📚 çalışmaya ekle, (isteğe bağlı) ✕ listeden çıkar.
// Satıra tıklayınca kelime detay penceresi açılır.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from './api'
import { useToast } from './ToastContext'
import { HARD_STATES, posTr } from './labels'
import WordDetailModal from './WordDetailModal'

// word: WordSummaryDto, lists: kullanıcının listeleri, onRemove: verilirse "listeden çıkar" butonu görünür
function WordRow({ word, lists = [], onRemove }) {
  const showToast = useToast()
  const [isFavorite, setIsFavorite] = useState(word.isFavorite)
  const [inStudy, setInStudy] = useState(word.box != null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const menuRef = useRef(null)

  // Menü açıkken dışarı tıklanırsa kapat
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function toggleFavorite(e) {
    e.stopPropagation()   // satır tıklaması (detay penceresi) tetiklenmesin
    const res = await apiFetch(`/api/Lists/favorites/${word.wordId}`, { method: 'POST' })
    if (res.ok) setIsFavorite((await res.json()).isFavorite)
  }

  async function addToList(list) {
    setMenuOpen(false)
    const res = await apiFetch(`/api/Lists/${list.id}/words/${word.wordId}`, { method: 'POST' })
    if (res.ok) showToast(`"${list.name}" listesine eklendi`)
  }

  async function addToStudy(e) {
    e.stopPropagation()
    const res = await apiFetch(`/api/Words/${word.wordId}/study`, { method: 'POST' })
    if (res.ok) {
      setInStudy(true)
      showToast('Çalışmaya eklendi, bugünkü kartlarında görünecek')
    }
  }

  // Kullanıcının bu kelimeyle durumu
  let status = <span className="word-status new">Yeni</span>
  if (word.hardState) {
    status = <span className={`state-tag ${HARD_STATES[word.hardState].className}`}>{HARD_STATES[word.hardState].label}</span>
  } else if (word.box === 6) {
    status = <span className="word-status learned">Öğrenildi</span>
  } else if (inStudy) {
    status = <span className="word-status learning">Çalışılıyor</span>
  }

  const customLists = lists.filter(l => !l.isFavorites)

  return (
    <>
      <li className="word-row" onClick={() => setShowDetail(true)}>
        <div className="word-row-main">
          <span className="word-row-headword">{word.headword}</span>
          <span className="word-row-meta">
            <span className="level-badge small">{word.level}</span> {posTr(word.partOfSpeech)}
          </span>
        </div>
        <span className="word-row-meaning">{word.turkishMeaning || '—'}</span>
        {status}

        <div className="word-row-actions" onClick={(e) => e.stopPropagation()}>
          <button className={`icon-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite} title="Favori">
            {isFavorite ? '★' : '☆'}
          </button>

          {customLists.length > 0 && (
            <div className="menu-wrap" ref={menuRef}>
              <button className="icon-btn" onClick={() => setMenuOpen(o => !o)} title="Listeye ekle">＋</button>
              {menuOpen && (
                <div className="dropdown">
                  {customLists.map(l => (
                    <button key={l.id} onClick={() => addToList(l)}>{l.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!inStudy && (
            <button className="icon-btn" onClick={addToStudy} title="Çalışmaya ekle">📚</button>
          )}

          {onRemove && (
            <button className="icon-btn danger" onClick={() => onRemove(word)} title="Listeden çıkar">✕</button>
          )}
        </div>
      </li>

      {showDetail && <WordDetailModal word={word} onClose={() => setShowDetail(false)} />}
    </>
  )
}

export default WordRow