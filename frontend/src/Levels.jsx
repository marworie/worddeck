// "Kart çalış" sayfası: seviye seçip çalışmaya başlamak için
import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import LevelList from './LevelList'
import PageHeader from './PageHeader'

function Levels({ onStartStudy }) {
  const [levels, setLevels] = useState(null)

  useEffect(() => {
    apiFetch('/api/Study/progress').then(r => (r.ok ? r.json() : null)).then(d => setLevels(d?.levels ?? []))
  }, [])

  return (
    <div className="page">
      <PageHeader icon="ti-cards" tone="t-teal" title="Kart çalış" subtitle="Bir seviye seç: tekrar zamanı gelen kartlar ve yeni kelimeler birlikte gelir." />
      <section className="panel">
        {levels ? <LevelList levels={levels} onStartStudy={onStartStudy} /> : <p className="loading-text">Yükleniyor...</p>}
      </section>
    </div>
  )
}

export default Levels