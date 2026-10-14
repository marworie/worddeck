// ============================================================
// Settings.jsx
// Ayarlar: günlük hedef ve yeni kelime sayısı (hesaba kaydedilir),
// aksan, dinleme hızı ve tema (sadece bu cihaza kaydedilir).
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useToast } from './ToastContext'
import { getPrefs, setPref, speak } from './preferences'

const GOALS = [10, 20, 30, 50]
const NEW_WORDS = [5, 10, 20, 30]

// Tekrarlanan "seçenek düğmeleri" satırı
function OptionRow({ options, value, onChange }) {
  return (
    <div className="chip-row">
      {options.map(o => (
        <button
          key={o.value}
          className={`filter-chip ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Settings({ onBack }) {
  const showToast = useToast()
  const [account, setAccount] = useState(null)   // { dailyNewWords, dailyGoal }
  const [prefs, setPrefs] = useState(getPrefs())

  useEffect(() => {
    apiFetch('/api/Settings').then(r => (r.ok ? r.json() : null)).then(setAccount)
  }, [])

  // Hesap ayarı değişince hemen kaydet
  async function updateAccount(key, value) {
    const next = { ...account, [key]: value }
    setAccount(next)
    const response = await apiFetch('/api/Settings', { method: 'PUT', body: JSON.stringify(next) })
    if (response.ok) showToast('Kaydedildi')
  }

  // Cihaz tercihi değişince localStorage'a yaz
  function updatePref(key, value) {
    setPref(key, value)
    setPrefs(getPrefs())
  }

  return (
    <div className="settings-page">
      <button className="btn btn-ghost back-btn" onClick={onBack}>← Ana sayfa</button>
      <h2 className="page-title">Ayarlar</h2>

      <section className="panel settings-section">
        <h3 className="section-title">Çalışma</h3>
        {!account ? (
          <p className="loading-text">Yükleniyor...</p>
        ) : (
          <>
            <div className="setting-row">
              <div>
                <b>Günlük hedef</b>
                <p className="muted small">Bir günde kaç kart çalışmak istiyorsun</p>
              </div>
              <OptionRow
                options={GOALS.map(g => ({ value: g, label: `${g} kart` }))}
                value={account.dailyGoal}
                onChange={v => updateAccount('dailyGoal', v)}
              />
            </div>
            <div className="setting-row">
              <div>
                <b>Oturum başına yeni kelime</b>
                <p className="muted small">Her çalışmada tekrarların yanına kaç yeni kelime eklensin</p>
              </div>
              <OptionRow
                options={NEW_WORDS.map(n => ({ value: n, label: `${n}` }))}
                value={account.dailyNewWords}
                onChange={v => updateAccount('dailyNewWords', v)}
              />
            </div>
          </>
        )}
      </section>

      <section className="panel settings-section">
        <h3 className="section-title">Ses</h3>
        <div className="setting-row">
          <div>
            <b>Aksan</b>
            <p className="muted small">Telaffuz ve dinleme sorularındaki ses</p>
          </div>
          <OptionRow
            options={[{ value: 'en-US', label: 'Amerikan' }, { value: 'en-GB', label: 'İngiliz' }]}
            value={prefs.accent}
            onChange={v => updatePref('accent', v)}
          />
        </div>
        <div className="setting-row">
          <div>
            <b>Dinleme hızı</b>
          </div>
          <OptionRow
            options={[{ value: false, label: 'Normal' }, { value: true, label: 'Yavaş' }]}
            value={prefs.slowSpeech}
            onChange={v => updatePref('slowSpeech', v)}
          />
        </div>
        <button className="btn btn-secondary" onClick={() => speak('Pronunciation')}>🔊 Dene</button>
      </section>

      <section className="panel settings-section">
        <h3 className="section-title">Görünüm</h3>
        <div className="setting-row">
          <b>Tema</b>
          <OptionRow
            options={[
              { value: 'light', label: 'Açık' },
              { value: 'dark', label: 'Koyu' },
              { value: 'system', label: 'Sistem' }
            ]}
            value={prefs.theme}
            onChange={v => updatePref('theme', v)}
          />
        </div>
      </section>
    </div>
  )
}

export default Settings