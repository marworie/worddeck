// ============================================================
// Sidebar.jsx
// Sol kenar menüsü. Telefonda alttaki menü çubuğuna dönüşür (sadece ana 5 öğe).
// ============================================================

// mobile: telefonda alt çubukta da görünsün mü, short: telefondaki kısa adı
const NAV = [
  { view: 'home', icon: 'ti-home', label: 'Ana sayfa', mobile: true },
  { view: 'levels', icon: 'ti-cards', label: 'Kart çalış', short: 'Çalış', mobile: true },
    { view: 'path', icon: 'ti-route', label: 'Öğrenme yolu' },
  { view: 'hard', icon: 'ti-flame', label: 'Zorlandıklarım', short: 'Zorlar', mobile: true },
  { view: 'quizSetup', icon: 'ti-checklist', label: 'Sınav', mobile: true },
  { view: 'search', icon: 'ti-search', label: 'Kelime ara' },
  { view: 'themes', icon: 'ti-category', label: 'Temalar' },
  { view: 'library', icon: 'ti-book', label: 'Okuma' },
  { view: 'sentence', icon: 'ti-pencil', label: 'Cümle kur' },
  { view: 'notebook', icon: 'ti-notebook', label: 'Defterim', mobile: true },
  { view: 'stats', icon: 'ti-chart-bar', label: 'İstatistikler' },
  { view: 'phonetics', icon: 'ti-language', label: 'Fonetik rehberi' }
]

// Alt sayfalardayken ana menüdeki hangi öğe vurgulansın
const PARENT_VIEW = { study: 'levels', hardPractice: 'hard', quiz: 'quizSetup' }

function Sidebar({ view, onNavigate, onLogout }) {
  const active = PARENT_VIEW[view] ?? view

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => onNavigate('home')}>🃏 WordDeck</div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.view}
            className={`nav-item ${active === item.view ? 'active' : ''} ${item.mobile ? '' : 'desktop-only'}`}
            onClick={() => onNavigate(item.view)}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" />
            <span className="nav-label">{item.label}</span>
            <span className="nav-short">{item.short ?? item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className={`nav-item ${active === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
          <i className="ti ti-settings" aria-hidden="true" />
          <span className="nav-label">Ayarlar</span>
        </button>
        <button className="nav-item muted" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          <span className="nav-label">{localStorage.getItem('username')} · Çıkış</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar