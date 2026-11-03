// ============================================================
// GameShell.jsx
// Oyunların ortak parçaları: üst çubuk, "kelime yok" ve oyun sonu ekranı
// ============================================================

// Üstte geri butonu + sağda skor bilgisi
export function GameHead({ onBack, children }) {
  return (
    <div className="dict-head">
      <button className="btn btn-ghost" onClick={onBack}>← Oyunlar</button>
      <span className="muted small">{children}</span>
    </div>
  )
}

export function NotEnough({ onBack }) {
  return (
    <div className="panel">
      Bu kaynakta yeterli kelime yok. Önce birkaç kelime çalış ya da bir seviye seç.
      <div><button className="btn btn-ghost" onClick={onBack}>← Geri</button></div>
    </div>
  )
}

// Oyun sonu: büyük emoji, sonuç, tekrar oyna
export function GameOver({ emoji, title, text, onAgain, onBack, children }) {
  return (
    <div className="page">
      <div className="panel dict-summary">
        <div className="dict-big">{emoji}</div>
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
        {children}
        <div className="dict-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onAgain}>Tekrar oyna</button>
          <button className="btn btn-ghost" onClick={onBack}>Oyunlar</button>
        </div>
      </div>
    </div>
  )
}