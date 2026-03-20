import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { bresAPI, UserProfile, BehavioralBaseline, CheckInHistoryItem } from '../services/api'

function safeGetLocalStorage(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function ToneDot({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" title="No data" />
  }
  let color = 'bg-yellow-400'
  if (score > 0.2) color = 'bg-green-500'
  if (score < -0.2) color = 'bg-red-400'
  return <span className={`w-3 h-3 rounded-full ${color} inline-block`} title={`Score: ${score.toFixed(2)}`} />
}

function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? 'w-5 h-5' : 'w-8 h-8'
  return (
    <div className={`${size} border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin`} />
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [baseline, setBaseline] = useState<BehavioralBaseline | null>(null)
  const [history, setHistory] = useState<CheckInHistoryItem[]>([])
  const [todayDone, setTodayDone] = useState(false)

  const [profileLoading, setProfileLoading] = useState(true)
  const [baselineLoading, setBaselineLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)

  const [profileError, setProfileError] = useState<string | null>(null)
  const [baselineError, setBaselineError] = useState<string | null>(null)

  useEffect(() => {
    bresAPI.getMe()
      .then(data => { setProfile(data) })
      .catch(err => { setProfileError(err instanceof Error ? err.message : t('errors.generic')) })
      .finally(() => setProfileLoading(false))

    bresAPI.getBaseline()
      .then(data => { setBaseline(data) })
      .catch(() => { setBaselineError(null) }) // non-critical if baseline not yet available
      .finally(() => setBaselineLoading(false))

    bresAPI.getCheckinHistory(7)
      .then(data => {
        setHistory(data)
        const today = new Date().toISOString().slice(0, 10)
        const doneToday = data.some(
          item => item.responded && item.scheduled_at.slice(0, 10) === today,
        )
        setTodayDone(doneToday)
      })
      .catch(() => { /* non-critical */ })
      .finally(() => setHistoryLoading(false))
  }, [t])

  const storedName = safeGetLocalStorage('breso_user_name')
  const greetingBase = i18n.language?.startsWith('es') ? 'Hola' : 'Hi'

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        {profileLoading ? (
          <div className="h-8 bg-gray-100 animate-pulse rounded w-48" />
        ) : (
          <h1 className="text-2xl font-bold text-gray-800">
            {storedName ? `${greetingBase}, ${storedName}` : greetingBase}
          </h1>
        )}
        {profileError && (
          <p className="text-xs text-red-500 mt-1">{profileError}</p>
        )}
      </div>

      {/* Today's check-in card */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t('nav.checkin')}
        </h2>
        {historyLoading ? (
          <div className="flex items-center gap-3">
            <Spinner small />
            <span className="text-sm text-gray-400">{t('checkin.loading')}</span>
          </div>
        ) : todayDone ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p className="text-green-700 font-medium text-sm">{t('dashboard.checkin_done')}</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-gray-700 text-sm flex-1">{t('dashboard.checkin_pending')}</p>
            <Link
              to="/checkin"
              className="inline-block py-2 px-5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition text-center"
            >
              {t('dashboard.go_to_checkin')}
            </Link>
          </div>
        )}
      </section>

      {/* Baseline status */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Bienestar / Wellness
        </h2>
        {baselineLoading ? (
          <div className="h-5 bg-gray-100 animate-pulse rounded w-56" />
        ) : baseline ? (
          <div>
            {profile?.baseline_ready || baseline.checkins_count >= 7 ? (
              <p className="text-green-700 font-medium text-sm">{t('dashboard.baseline_ready')} ✓</p>
            ) : (
              <p className="text-blue-600 text-sm">
                {t('dashboard.baseline_building', { count: baseline.checkins_count })}
              </p>
            )}
            {baseline.checkins_count >= 7 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Avg tone:</span>
                <ToneDot score={baseline.avg_tone_score} />
                <span>{(baseline.avg_tone_score * 100).toFixed(0)}%</span>
                <span className="ml-3">Engagement: {(baseline.engagement_rate * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            {t('dashboard.baseline_building', { count: 0 })}
          </p>
        )}
        {baselineError && <p className="text-xs text-red-500">{baselineError}</p>}
      </section>

      {/* Tone trend */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t('dashboard.tone_trend')}
        </h2>
        {historyLoading ? (
          <div className="flex gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-gray-400 text-sm">{t('dashboard.no_data')}</p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {history.map((item, idx) => {
              const date = new Date(item.scheduled_at)
              const label = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  {item.responded ? (
                    <ToneDot score={item.tone_score} />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" title="No response" />
                  )}
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              )
            })}
            <div className="ml-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Positive</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Neutral</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" /> No data</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
