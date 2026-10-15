// ============================================================
// Notebook.jsx
// Kelime defterim: favoriler ve kendi listelerin.
// Liste oluştur / yeniden adlandır / sil, listedeki kelimeler, listeden sınav.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useToast } from './ToastContext'
import WordRow from './WordRow'

// onStartQuiz({ listId, listName, count }): listeden sınav başlatmak için
function Notebook({ onBack, onStartQuiz }) {
  const showToast = useToast()
  const [lists, setLists] = useState(null)
  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState(null)   // { list, words }
  const [renameValue, setRenameValue] = useState(null)   // null = yeniden adlandırma kapalı

  function loadLists() {
    apiFetch('/api/Lists').then(r => (r.ok ? r.json() : [])).then(setLists)
  }

  useEffect(loadLists, [])

  async function openList(id) {
    const res = await apiFetch(`/api/Lists/${id}/words`)
    if (res.ok) {
      setSelected(await res.json())
      setRenameValue(null)
    }
  }

  async function createList(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const res = await apiFetch('/api/Lists', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
    if (res.ok) {
      setNewName('')
      loadLists()
      showToast('Liste oluşturuldu')
    } else {
      const data = await res.json().catch(() => ({}))
      if (data.message) showToast(data.message, 'error')
    }
  }

  async function renameList(e) {
    e.preventDefault()
    const res = await apiFetch(`/api/Lists/${selected.list.id}`, {
      method: 'PUT', body: JSON.stringify({ name: renameValue.trim() })
    })
    if (res.ok) {
      setSelected(s => ({ ...s, list: { ...s.list, name: renameValue.trim() } }))
      setRenameValue(null)
      loadLists()
    } else {
      const data = await res.json().catch(() => ({}))
      if (data.message) showToast(data.message, 'error')
    }
  }

  async function deleteList() {
    if (!window.confirm(`"${selected.list.name}" listesi silinsin mi? Kelimeler sözlükte kalır.`)) return
    const res = await apiFetch(`/api/Lists/${selected.list.id}`, { method: 'DELETE' })
    if (res.ok) {
      setSelected(null)
      loadLists()
    }
  }

  async function removeWord(word) {
    const res = await apiFetch(`/api/Lists/${selected.list.id}/words/${word.wordId}`, { method: 'DELETE' })
    if (res.ok) {
      setSelected(s => ({ ...s, words: s.words.filter(w => w.wordId !== word.wordId) }))
      loadLists()   // kelime sayısı güncellensin
    }
  }

  if (!lists) return <p className="loading-text">Yükleniyor...</p>

  // ===== Bir liste açık =====
  if (selected) {
    const { list, words } = selected
    return (
      <div className="notebook-page">
        <button className="btn btn-ghost back-btn" onClick={() => setSelected(null)}>← Listelerim</button>

        <div className="list-head">
          {renameValue !== null ? (
            <form className="rename-form" onSubmit={renameList}>
              <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={60} autoFocus />
              <button className="btn btn-primary" type="submit">Kaydet</button>
              <button className="btn btn-ghost" type="button" onClick={() => setRenameValue(null)}>Vazgeç</button>
            </form>
          ) : (
            <h2 className="page-title">{list.isFavorites ? '★ ' : ''}{list.name}</h2>
          )}

          <div className="list-actions">
            <button
              className="btn btn-primary"
              disabled={words.length === 0}
              onClick={() => onStartQuiz({ listId: list.id, listName: list.name, count: Math.min(words.length, 20) })}
            >
              Bu listeden sınav ol
            </button>
            {!list.isFavorites && renameValue === null && (
              <>
                <button className="btn btn-secondary" onClick={() => setRenameValue(list.name)}>Adını değiştir</button>
                <button className="btn btn-ghost danger-text" onClick={deleteList}>Sil</button>
              </>
            )}
          </div>
        </div>

        {words.length === 0 ? (
          <p className="muted center">Bu liste boş. Kelime aramadan ＋ ile kelime ekleyebilirsin.</p>
        ) : (
          <ul className="panel word-list">
            {words.map(w => <WordRow key={w.wordId} word={w} lists={lists} onRemove={removeWord} />)}
          </ul>
        )}
      </div>
    )
  }

  // ===== Listeler =====
  return (
    <div className="notebook-page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← Ana sayfa</button>
      <h2 className="page-title">Kelime defterim</h2>

      <div className="list-grid">
        {lists.map(l => (
          <button key={l.id} className={`list-card panel ${l.isFavorites ? 'favorites' : ''}`} onClick={() => openList(l.id)}>
            <span className="list-card-name">{l.isFavorites ? '★ ' : ''}{l.name}</span>
            <span className="muted small">{l.wordCount} kelime</span>
          </button>
        ))}
      </div>

      <form className="panel new-list-form" onSubmit={createList}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni liste adı (ör. İş İngilizcesi)"
          maxLength={60}
        />
        <button className="btn btn-primary" type="submit" disabled={!newName.trim()}>Oluştur</button>
      </form>
    </div>
  )
}

export default Notebook