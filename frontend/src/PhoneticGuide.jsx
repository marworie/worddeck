// ============================================================
// PhoneticGuide.jsx
// Fonetik Rehberi: kartlardaki /əˈtʃiːv/ gibi işaretlerin ne demek olduğu.
// Tarayıcı tek bir sesi düzgün okuyamadığı için her ses örnek kelimeyle dinletilir.
// ============================================================

import { PHONETIC_GROUPS, ipaToTurkish } from './phonetics'
import { speak } from './preferences'

function PhoneticGuide({ onBack }) {
  return (
    <div className="guide-page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← Ana sayfa</button>
      <h2 className="page-title">Fonetik Rehberi</h2>

      <section className="panel guide-intro">
        <p>
          Kartlarda kelimenin altında <b>/əˈbɪl.ə.ti/</b> gibi bir yazı görürsün. Bu, kelimenin
          <b> nasıl okunduğunu</b> gösteren uluslararası fonetik alfabedir (IPA). İngilizcede yazılış
          ile okunuş çoğu zaman farklı olduğu için çok işe yarar.
        </p>
        <p className="muted">
          Yanındaki <b>ı-Bİ-lı-ti</b> ise Türkçe harflerle <b>yaklaşık</b> okunuşu.
          Büyük harfli kısım vurgulu hece. Asıl doğru ses için her zaman 🔊'ye bas.
        </p>
      </section>

      {PHONETIC_GROUPS.map(group => (
        <section key={group.title} className="panel guide-section">
          <h3 className="section-title">{group.title}</h3>
          <p className="muted small">{group.intro}</p>

          <div className="guide-grid">
            {group.items.map(item => (
              <div key={item.symbol} className="guide-item">
                <div className="guide-item-head">
                  <span className="guide-symbol">{item.symbol}</span>
                  <span className="guide-tr">≈ {item.tr}</span>
                </div>
                <p className="guide-tip">{item.tip}</p>
                <button className="guide-example" onClick={() => speak(item.word)}>
                  🔊 <b>{item.word}</b>
                  <span className="muted">{item.ipa}</span>
                  <span className="phonetic-tr">{ipaToTurkish(item.ipa)}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default PhoneticGuide