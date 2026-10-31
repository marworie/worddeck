// ============================================================
// CustomTextModal.jsx
// Kullanıcı kendi İngilizce metnini yapıştırır, okuyucuda açılır.
// Metin veritabanına değil tarayıcıya (localStorage) kaydedilir.
// ============================================================

import { useState } from 'react'
import { loadCustomText, saveCustomText } from './readerText'

const MIN_WORDS = 10
const MAX_WORDS = 5000

function CustomTextModal({ onClose, onOpen }) {
  const last = loadCustomText()
  const [title, setTitle] = useState(last?.title ?? '')
  const [text, setText] = useState(last?.text ?? '')

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const tooLong = wordCount > MAX_WORDS

  function open() {
    // Aynı metinse kaldığın sayfa korunur, yeni metinse baştan başlar
    const page = last && last.text === text ? last.page ?? 0 : 0
    saveCustomText({ title: title.trim() || 'Kendi metnim', text, page })
    onOpen()
  }

  return (
    <div className="ct-backdrop" onClick={onClose}>
      <div className="ct-modal panel" onClick={e => e.stopPropagation()} data-lenis-prevent>
        <h2>✍️ Kendi metnin</h2>
        <p className="muted small">Bir haber, şarkı sözü ya da herhangi bir İngilizce metin yapıştır. Paragrafları boş satırla ayır.</p>

        <input
          className="ct-input"
          placeholder="Başlık (isteğe bağlı)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          className="ct-input ct-textarea"
          placeholder="Metni buraya yapıştır..."
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
          autoFocus
        />

        <div className={`ct-counter ${tooLong ? 'error' : ''}`}>{wordCount} / {MAX_WORDS} kelime</div>

        <div className="ct-actions">
          <button className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-primary" onClick={open} disabled={wordCount < MIN_WORDS || tooLong}>
            Okumaya başla
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomTextModal