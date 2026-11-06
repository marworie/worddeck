// ============================================================
// Settings.jsx
// Ayarlar: günlük hedef ve yeni kelime sayısı (hesaba kaydedilir),
// aksan, dinleme hızı ve tema (sadece bu cihaza kaydedilir).
// ============================================================

import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { useToast } from './ToastContext'
import PageHeader from './PageHeader'
import { englishVoices, getPrefs, setPref, speak } from './preferences'

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

  const [voices, setVoices] = useState(englishVoices)

  // Tarayıcı sesleri geç yüklüyor (özellikle Chrome): hemen, biraz sonra ve hazır olunca listeyi yenile
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const update = () => setVoices(englishVoices())
    update()
    const t = setTimeout(update, 500)
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => {
      clearTimeout(t)
      window.speechSynthesis.removeEventListener('voiceschanged', update)
    }
  }, [])

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
      <PageHeader icon="ti-settings" tone="t-teal" title="Ayarlar" subtitle="Günlük hedef, ses ve görünüm" />

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
        <div className="setting-row">
          <div>
            <b>Kartları otomatik oku</b>
            <p className="muted small">Kart çalışırken her yeni kelime kendiliğinden seslendirilsin</p>
          </div>
          <OptionRow
            options={[{ value: true, label: 'Açık' }, { value: false, label: 'Kapalı' }]}
            value={prefs.autoSpeak}
            onChange={v => updatePref('autoSpeak', v)}
          />
        </div>
        <div className="setting-row">
          <div>
            <b>Okuyucu sesi</b>
            <p className="muted small">"Natural", "Online" ya da "Premium" yazan sesler en doğal olanlar</p>
          </div>
          <select
            className="rate-select"
            value={prefs.voiceName}
            onChange={e => { updatePref('voiceName', e.target.value); setTimeout(() => speak('Hello! This is how I sound.'), 50) }}
          >
            <option value="">Otomatik (en doğal ses)</option>
            {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
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