// ============================================================
// Stats.jsx
// İstatistikler: özet kartlar, son 30 gün çalışma grafiği,
// kutulara göre dağılım, sınav gelişimi ve en çok unutulan kelimeler.
// ============================================================

import { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { apiFetch } from './api'
import { posTr } from './labels'

// Chart.js'te sadece kullandığımız parçaları kaydediyoruz (paket küçük kalsın)
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler)

const TEAL = '#14b8a6'
const TEAL_LIGHT = 'rgba(20, 184, 166, 0.15)'
const BOX_LABELS = ['Kutu 1', 'Kutu 2', 'Kutu 3', 'Kutu 4', 'Kutu 5', 'Öğrenildi']

// Tüm grafiklerde ortak ayarlar: açıklama kutusu yok, ızgara sade
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9aa1ab' } },
    y: { beginAtZero: true, ticks: { color: '#9aa1ab', precision: 0 }, grid: { color: 'rgba(154, 161, 171, 0.15)' } }
  }
}

const shortDate = (d) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

function Stats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiFetch('/api/Stats').then(r => (r.ok ? r.json() : null)).then(setStats)
  }, [])

  if (!stats) return <p className="loading-text">Yükleniyor...</p>

  // Kutuları 1'den 6'ya sıralı diz, eksik kutu 0 olsun
  const boxCounts = [1, 2, 3, 4, 5, 6].map(b => stats.boxes.find(x => x.box === b)?.count ?? 0)
  const activeDays = stats.daily.filter(d => d.count > 0).length

  return (
    <div className="page stats-page">
      <h2 className="page-title">İstatistikler</h2>

      {/* Özet kartlar */}
      <div className="stats-cards">
        <StatCard label="Çalışılan kelime" value={stats.totalStudied} />
        <StatCard label="Bilinen" value={stats.known} sub={stats.totalStudied ? `Çalışılanların %${Math.round((stats.known / stats.totalStudied) * 100)}'i` : null}/>
        <StatCard label="Kalıcı Öğrenilen" value={stats.learned} />
        <StatCard label="Toplam tekrar" value={stats.totalReviews} />
        <StatCard label="En uzun seri" value={`${stats.longestStreak} gün`} />
        <StatCard label="Başarı oranı" value={stats.successRate != null ? `%${stats.successRate}` : '—'} />
      </div>
      <section className="panel">
        <div className="chart-head">
          <h3 className="section-title">Son 30 gün</h3>
          <span className="muted small">{activeDays} gün çalıştın</span>
        </div>
        <div className="chart-box">
          <Bar
            options={baseOptions}
            data={{
              labels: stats.daily.map(d => shortDate(d.date)),
              datasets: [{ data: stats.daily.map(d => d.count), backgroundColor: TEAL, borderRadius: 4 }]
            }}
          />
        </div>
      </section>

      <div className="stats-two">
        <section className="panel">
          <h3 className="section-title">Kutulara göre dağılım</h3>
          <p className="muted small">Kelimeler bildikçe sağa doğru ilerler.</p>
          <div className="chart-box">
            <Bar
              options={baseOptions}
              data={{
                labels: BOX_LABELS,
                datasets: [{ data: boxCounts, backgroundColor: [...Array(5).fill(TEAL), '#0f766e'], borderRadius: 4 }]
              }}
            />
          </div>
        </section>

        <section className="panel">
          <h3 className="section-title">Sınav gelişimin</h3>
          {stats.quizzes.length === 0 ? (
            <p className="muted">Henüz sınav olmadın.</p>
          ) : (
            <div className="chart-box">
              <Line
                options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, max: 100 } } }}
                data={{
                  labels: stats.quizzes.map(q => `${q.level} · ${shortDate(q.takenAt)}`),
                  datasets: [{
                    data: stats.quizzes.map(q => Math.round((q.correctAnswers / q.totalQuestions) * 100)),
                    borderColor: TEAL,
                    backgroundColor: TEAL_LIGHT,
                    fill: true,
                    tension: 0.3
                  }]
                }}
              />
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <h3 className="section-title">En çok unuttukların</h3>
        {stats.mostForgotten.length === 0 ? (
          <p className="muted">Henüz unuttuğun bir kelime yok. 👏</p>
        ) : (
          <ul className="forgotten-list">
            {stats.mostForgotten.map(w => (
              <li key={w.wordId} className="forgotten-row">
                <div>
                  <b>{w.headword}</b>
                  <span className="muted small"> · {w.level} · {posTr(w.partOfSpeech)}</span>
                </div>
                <span className="hard-meaning">{w.turkishMeaning || '—'}</span>
                <span className="muted small">✕ {w.wrongCount} · ✓ {w.correctCount}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="muted-mall">{sub}</span>}
    </div>
  )
}

export default Stats