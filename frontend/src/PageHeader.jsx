// ============================================================
// PageHeader.jsx
// Sayfaların ortak başlığı: pastel ikon kutucuğu + başlık + açıklama,
// sağda isteğe bağlı butonlar.
// ============================================================

function PageHeader({ icon, tone = 't-teal', title, subtitle, children }) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <span className={`page-header-icon ${tone}`}>
          <i className={`ti ${icon}`} aria-hidden="true" />
        </span>
        <div>
          <h2 className="page-header-title">{title}</h2>
          {subtitle && <p className="page-header-sub">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  )
}

export default PageHeader