// ============================================================
// Sidebar.jsx
// Sol kenar menüsü. Telefonda alttaki menü çubuğuna dönüşür:
// 4 ana öğe + "Daha" butonu (kalan sayfalar aşağıdan açılan panelde).
// ============================================================

import { useState } from 'react'

// mobile: telefonda alt çubukta görünsün mü (en fazla 4), short: telefondaki kısa adı
const NAV = [
  { view: 'home', icon: 'ti-home', label: 'Ana sayfa', mobile: true },
  { view: 'levels', icon: 'ti-cards', label: 'Kart çalış', short: 'Çalış', mobile: true },
  { view: 'path', icon: 'ti-route', label: 'Öğrenme yolu' },
  { view: 'hard', icon: 'ti-flame', label: 'Zorlandıklarım' },
  { view: 'quizSetup', icon: 'ti-checklist', label: 'Sınav', mobile: true },
  { view: 'search', icon: 'ti-search', label: 'Kelime ara' },
  { view: 'themes', icon: 'ti-category', label: 'Temalar' },
  { view: 'library', icon: 'ti-book', label: 'Okuma', short: 'Oku', mobile: true },
  { view: 'sentence', icon: 'ti-pencil', label: 'Cümle kur' },
  { view: 'notebook', icon: 'ti-notebook', label: 'Defterim' },
  { view: 'stats', icon: 'ti-chart-bar', label: 'İstatistikler' },
  { view: 'phonetics', icon: 'ti-language', label: 'Fonetik rehberi' }
]

// Telefonda "Daha" panelinde gösterilenler: alt çubukta olmayanlar + ayarlar
const MORE = [
  ...NAV.filter(item => !item.mobile),
  { view: 'settings', icon: 'ti-settings', label: 'Ayarlar' }
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
        <div className="sidebar-logo" onClick={() => go('home')}>🃏 WordDeck</div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.view}
              className={`nav-item ${active === item.view ? 'active' : ''} ${item.mobile ? '' : 'desktop-only'}`}
              onClick={() => go(item.view)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
              <span className="nav-short">{item.short ?? item.label}</span>
            </button>
          ))}

          {/* Sadece telefonda: kalan sayfaları açan buton */}
          <button
            className={`nav-item mobile-only ${moreActive || moreOpen ? 'active' : ''}`}
            onClick={() => setMoreOpen(open => !open)}
            aria-expanded={moreOpen}
          >
            <i className="ti ti-menu-2" aria-hidden="true" />
            <span className="nav-short">Daha</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}>
            <i className="ti ti-settings" aria-hidden="true" />
            <span className="nav-label">Ayarlar</span>
          </button>
          <button className="nav-item muted" onClick={onLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
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
                  onClick={() => go(item.view)}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
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