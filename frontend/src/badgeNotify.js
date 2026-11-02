// Yeni kazanılan rozetleri bildirme (Badges.jsx'ten ayrı: o dosya sadece bileşen dışa aktarsın)

import { apiFetch } from './api'

const SEEN_KEY = 'seenBadges'

function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) } catch { return null }
}

function saveSeen(ids) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)) } catch { /* önemli değil */ }
}

// Yeni kazanılan rozetleri bulur ve bildirir.
// İlk çalışmada (hiç kayıt yoksa) eski rozetler için bildirim yağmuru olmasın, sessizce kaydedilir.
export async function checkNewBadges(showToast) {
  const r = await apiFetch('/api/Badges')
  if (!r.ok) return
  const earned = (await r.json()).filter(b => b.earned)
  const seen = loadSeen()

  if (seen) {
    earned
      .filter(b => !seen.includes(b.id))
      .forEach(b => showToast(`${b.emoji} Yeni rozet: ${b.title}!`, 'success'))
  }
  saveSeen(earned.map(b => b.id))
}