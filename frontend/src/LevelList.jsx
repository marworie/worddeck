// ============================================================
// LevelList.jsx
// Seviyelerin kompakt listesi (ana sayfada ve "Kart çalış" sayfasında).
// ============================================================

const LEVEL_INFO = { A1: 'Başlangıç', A2: 'Temel', B1: 'Orta', B2: 'Orta üstü', C1: 'İleri' }

function LevelList({ levels, onStartStudy }) {
  return (
    <div className="level-list">
      {levels.map(l => {
        const learnedPct = (l.learned / l.total) * 100
        const learningPct = (l.learning / l.total) * 100
        return (
          <div key={l.level} className="level-list-row">
            <span className="level-badge">{l.level}</span>
            <div className="level-list-info">
              <div className="level-list-top">
                <b>{LEVEL_INFO[l.level]}</b>
                <span className="muted small">{l.learned + l.learning} / {l.total}</span>
              </div>
              <div className="level-bar">
                <div className="level-bar-learned" style={{ width: `${learnedPct}%` }} />
                <div className="level-bar-learning" style={{ width: `${learningPct}%` }} />
              </div>
            </div>
            {l.dueToday > 0 ? <span className="due-badge">{l.dueToday} tekrar</span> : <span />}
            <button className="btn btn-secondary" onClick={() => onStartStudy(l.level)}>Çalış</button>
          </div>
        )
      })}
    </div>
  )
}

export default LevelList