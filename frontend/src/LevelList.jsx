// ============================================================
// LevelList.jsx
// Seviye kartları ("Kart çalış" sayfası): her seviyenin kendi pastel rengi,
// ilerleme çubuğu, bugünkü tekrar sayısı. Karta tıklayınca çalışma başlar.
// ============================================================

import { LEVEL_NAME, LEVEL_TONE } from './labels'

function LevelList({ levels, onStartStudy }) {
  return (
    <div className="level-cards">
      {levels.map(l => {
        const learnedPct = (l.learned / l.total) * 100
        const learningPct = (l.learning / l.total) * 100
        return (
          <button key={l.level} className={`level-card ${LEVEL_TONE[l.level]}`} onClick={() => onStartStudy(l.level)}>
            <div className="level-card-top">
              <b className="level-card-code">{l.level}</b>
              {l.dueToday > 0 && <span className="level-card-due">🔁 {l.dueToday} tekrar</span>}
            </div>
            <span className="level-card-name">{LEVEL_NAME[l.level]}</span>

            <div className="level-card-bar">
              <div className="learned" style={{ width: `${learnedPct}%` }} />
              <div className="learning" style={{ width: `${learningPct}%` }} />
            </div>
            <span className="level-card-count">{l.learned + l.learning} / {l.total} kelime</span>

            <span className="level-card-go">Çalış <i className="ti ti-arrow-right" aria-hidden="true" /></span>
          </button>
        )
      })}
    </div>
  )
}

export default LevelList