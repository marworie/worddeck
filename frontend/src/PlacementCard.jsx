// ============================================================
// PlacementCard.jsx
// Ana sayfadaki seviye testi kartı: test yapılmadıysa davet eder,
// yapıldıysa önerilen seviyeyi ve "çalış" / "tekrarla" butonlarını gösterir.
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'

function PlacementCard({ onNavigate, onStartStudy }) {
  const [result, setResult] = useState(undefined)   // undefined: yükleniyor, null: test yok

  useEffect(() => {
    apiFetch('/api/Placement/result')
      .then(res => res.ok ? res.json() : null)
      .then(data => setResult(data?.placementLevel ? data : null))
  }, [])

  if (result === undefined) return null

  if (!result) {
    return (
      <div className="placement-card panel">
        <div>
          <h3>Seviyeni biliyor musun?</h3>
          <p className="muted">Kısa bir testle nereden başlaman gerektiğini bulalım (2–5 dk).</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('placement')}>Teste başla</button>
      </div>
    )
  }

  return (
    <div className="placement-card panel">
      <div>
        <p className="muted">Önerilen seviyen</p>
        <span className="placement-card-level">{result.placementLevel}</span>
      </div>
      <div className="placement-actions">
        <button className="btn btn-primary" onClick={() => onStartStudy(result.placementLevel)}>Çalış</button>
        <button className="btn btn-ghost" onClick={() => onNavigate('placement')}>Testi tekrarla</button>
      </div>
    </div>
  )
}

export default PlacementCard