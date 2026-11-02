// ============================================================
// Sidebar.jsx
// Sol kenar menüsü: gruplu, her öğenin kendi rengi var.
// Telefonda alttaki menü çubuğuna dönüşür:
// 4 ana öğe + "Daha" butonu (kalan sayfalar aşağıdan açılan panelde).
// ============================================================

import { useState } from 'react'

// group: masaüstünde üstünde başlık görünen grup, color: ikon kutucuğunun rengi
// mobile: telefonda alt çubukta görünsün mü (en fazla 4), short: telefondaki kısa adı
const NAV = [
  { view: 'home', icon: 'ti-home', label: 'Ana sayfa', color: '#0d9488', mobile: true },

  { group: 'Çalış', view: 'levels', icon: 'ti-cards', label: 'Kart çalış', short: 'Çalış', color: '#0d9488', mobile: true },
  { view: 'hard', icon: 'ti-flame', label: 'Zorlandıklarım', color: '#ef4444' },
  { view: 'quizSetup', icon: 'ti-checklist', label: 'Sınav', color: '#3b82f6', mobile: true },

  { group: 'Pratik', view: 'games', icon: 'ti-puzzle', label: 'Oyunlar', color: '#f97316', mobile: true },
  { view: 'sentence', icon: 'ti-pencil', label: 'Cümle kur', color: '#ec4899' },
  { view: 'dictation', icon: 'ti-headphones', label: 'Dikte', color: '#a855f7' },

  { group: 'Keşfet', view: 'library', icon: 'ti-book', label: 'Okuma', short: 'Oku', color: '#7c3aed', mobile: true },
  { view: 'search', icon: 'ti-search', label: 'Kelime ara', color: '#0ea5e9' },
  { view: 'themes', icon: 'ti-category', label: 'Temalar', color: '#22c55e' },

  { group: 'Ben', view: 'badges', icon: 'ti-award', label: 'Rozetler', color: '#eab308' },
  { view: 'notebook', icon: 'ti-notebook', label: 'Defterim', color: '#d97706' },
  { view: 'stats', icon: 'ti-chart-bar', label: 'İstatistikler', color: '#6366f1' },
  { view: 'phonetics', icon: 'ti-language', label: 'Fonetik rehberi', color: '#64748b' }
]

// Telefonda "Daha" panelinde gösterilenler: alt çubukta olmayanlar + ayarlar
const MORE = [
  ...NAV.filter(item => !item.mobile),
  { view: 'settings', icon: 'ti-settings', label: 'Ayarlar', color: '#64748b' }
]

// Alt sayfalardayken ana menüdeki hangi öğe vurgulansın
const PARENT_VIEW = { study: 'levels', hardPractice: 'hard', quiz: 'quizSetup', reader: 'library' }

function Sidebar({ view, onNavigate, onLogout }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const active = PARENT_VIEW[view] ?? view
  const moreActive = MORE.some(item => item.view === active)

  function go(next) {
    setMoreOpen(false)
    onNavigate(next)
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => go('home')}>
          <span className="logo-mark">W</span>
          <span className="logo-text">WordDeck</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <div key={item.view} className={item.mobile ? 'nav-wrap' : 'nav-wrap desktop-only'}>
              {item.group && <div className="nav-group desktop-only">{item.group}</div>}
              <button
                className={`nav-item ${active === item.view ? 'active' : ''}`}
                style={{ '--nav': item.color }}
                onClick={() => go(item.view)}
              >
                <span className="nav-icon"><i className={`ti ${item.icon}`} aria-hidden="true" /></span>
                <span className="nav-label">{item.label}</span>
                <span className="nav-short">{item.short ?? item.label}</span>
              </button>
            </div>
          ))}

          {/* Sadece telefonda: kalan sayfaları açan buton */}
          <div className="nav-wrap mobile-only">
            <button
              className={`nav-item ${moreActive || moreOpen ? 'active' : ''}`}
              style={{ '--nav': '#64748b' }}
              onClick={() => setMoreOpen(open => !open)}
              aria-expanded={moreOpen}
            >
              <span className="nav-icon"><i className="ti ti-menu-2" aria-hidden="true" /></span>
              <span className="nav-short">Daha</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${active === 'settings' ? 'active' : ''}`}
            style={{ '--nav': '#64748b' }}
            onClick={() => go('settings')}
          >
            <span className="nav-icon"><i className="ti ti-settings" aria-hidden="true" /></span>
            <span className="nav-label">Ayarlar</span>
          </button>
          <button className="nav-item muted" style={{ '--nav': '#94a3b8' }} onClick={onLogout}>
            <span className="nav-icon"><i className="ti ti-logout" aria-hidden="true" /></span>
            <span className="nav-label">{localStorage.getItem('username')} · Çıkış</span>
          </button>
        </div>
      </aside>

      {/* Telefonda aşağıdan açılan panel (sidebar'ın dışında: sabit konumu bozulmasın) */}
      {moreOpen && (
        <div className="more-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" data-lenis-prevent onClick={e => e.stopPropagation()}>
            <div className="more-handle" />
            <div className="more-grid">
              {MORE.map(item => (
                <button
                  key={item.view}
                  className={`more-item ${active === item.view ? 'active' : ''}`}
                  style={{ '--nav': item.color }}
                  onClick={() => go(item.view)}
                >
                  <span className="nav-icon"><i className={`ti ${item.icon}`} aria-hidden="true" /></span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <button className="more-logout" onClick={() => { setMoreOpen(false); onLogout() }}>
              <i className="ti ti-logout" aria-hidden="true" /> {localStorage.getItem('username')} · Çıkış
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar