import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import CheckInHistory from '../components/CheckInHistory'
import { addContact, getCheckinHistory, getDashboard } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'

function safeGetLocalStorage(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const storedUserName = safeGetLocalStorage(USER_NAME_KEY)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dashboard, setDashboard] = useState(null)
  const [history, setHistory] = useState(null)

  const [startLoading, setStartLoading] = useState(false)
  const [showHistoryDetails, setShowHistoryDetails] = useState(false)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)

  const weekdays = t('dashboard.weekdays', { returnObjects: true }) || []

  useEffect(() => {
    let isMounted = true
      ; (async () => {
        setLoading(true)
        setError('')
        try {
          const [dashRes, histRes] = await Promise.all([getDashboard(), getCheckinHistory()])
          if (!isMounted) return
          setDashboard(dashRes.data || null)
          setHistory(histRes.data || null)
        } catch {
          if (!isMounted) return
          setError(t('dashboard.error'))
        } finally {
          if (isMounted) setLoading(false)
        }
      })()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const userName = storedUserName
  const streakDays = dashboard?.streakDaysConsecutive ?? 0

  const weeklyCompleted = useMemo(() => {
    const fromHistory = history?.weeklyCompleted
    if (Array.isArray(fromHistory) && fromHistory.length === 7) return fromHistory
    return dashboard?.weeklyCompleted || []
  }, [dashboard, history])

  const nextProposal = dashboard?.proposal || ''

  const streakMilestones = [3, 7, 30, 100]
  const nextMilestone = streakMilestones.find(m => m > streakDays) || 100
  const progressPercent = Math.min(100, Math.round((streakDays / nextMilestone) * 100))

  const totalCheckins = dashboard?.totalCheckins ?? history?.items?.length ?? Math.max(streakDays, 1)

  const achievementsList = [
    { id: 'primer', icon: '🌱', req: { type: 'checkins', val: 1 } },
    { id: 'racha3', icon: '🔥', req: { type: 'streak', val: 3 } },
    { id: 'semana', icon: '⭐', req: { type: 'streak', val: 7 } },
    { id: 'constancia', icon: '🌙', req: { type: 'streak', val: 14 } },
    { id: 'mes', icon: '🏆', req: { type: 'streak', val: 30 } },
    { id: 'conv10', icon: '💬', req: { type: 'checkins', val: 10 } },
    { id: 'conv50', icon: '🎯', req: { type: 'checkins', val: 50 } },
  ]

  const dailyProposals = t('dashboard.dailyProposals', { returnObjects: true })
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  const todaysProposal = Array.isArray(dailyProposals) ? dailyProposals[dayOfYear % dailyProposals.length] : ''

  const handleStart = () => {
    setStartLoading(true)
    navigate('/chat', { state: { mode: dashboard?.mode || 'listening' } })
  }

  const getMoodDot = (level) => {
    switch(level) {
      case 'red': return 'bg-red-500'
      case 'orange': return 'bg-orange-500'
      case 'yellow': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const completedLabel = t('dashboard.status.completed')
  const pendingLabel = t('dashboard.status.pending')

  const activeLang = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-textdark/70">{t('dashboard.guide')}</p>

      {loading ? (
        <section className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">{t('dashboard.loading')}</section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</section>
      ) : null}

      {dashboard ? (
        <>
          <section className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">
            <div className="text-sm font-semibold text-textdark/70">
              {userName ? t('dashboard.greeting', { name: userName }) : t('dashboard.greetingNoName')}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-softgray bg-whiteish p-4">
                <div className="text-sm font-semibold text-textdark/70">{t('dashboard.streakTitle')}</div>
                <div className="mt-1 flex items-baseline gap-2 text-textdark">
                  <span className="text-3xl font-bold">{streakDays}</span>
                  <span className="font-semibold">{streakDays >= 3 ? '🔥 ' : ''}{t('dashboard.streakSubtitle')}</span>
                </div>
                <div className="mt-4 w-full bg-softgray/40 rounded-full h-2 overflow-hidden">
                  <div className="bg-sage h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 text-xs font-semibold text-textdark/50 text-right">
                  {t('dashboard.nextMilestone', { days: nextMilestone })}
                </div>
              </div>

              <div className="rounded-xl border border-softgray bg-whiteish p-4 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold text-textdark/70">{t('dashboard.pointsTitle')}</div>
                  <div className="mt-1 flex items-baseline gap-2 text-textdark">
                    <span className="text-3xl font-bold">{totalCheckins * 10}</span>
                    <span className="font-semibold">{t('dashboard.pointsSubtitle')}</span>
                  </div>
                </div>
                <div className="mt-3 text-xs font-semibold text-sage bg-sage/10 rounded-lg px-3 py-2 inline-block self-start">
                  {t('dashboard.pointsNote')}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-textdark/70 mb-3">{t('dashboard.achievementsTitle')}</div>
              <div className="grid grid-cols-2 gap-3">
                {achievementsList.map((ach) => {
                  const unlocked = ach.req.type === 'streak' ? streakDays >= ach.req.val : totalCheckins >= ach.req.val
                  const achName = t(`dashboard.achievements.${ach.id}.name`)
                  const achDesc = t(`dashboard.achievements.${ach.id}.desc`)
                  return (
                    <div
                      key={ach.id}
                      onClick={() => {
                        if (unlocked) alert(t('dashboard.achievementUnlocked', { name: achName, date: new Date().toLocaleDateString() }))
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-[16px] border text-center ${unlocked ? 'bg-sage border-sage/20 text-white shadow-soft cursor-pointer hover:opacity-90 transition' : 'bg-softgray/20 border-softgray opacity-40'}`}
                    >
                      <span className="text-3xl mb-2">{ach.icon}</span>
                      <span className="text-sm font-bold leading-snug mb-1">{unlocked ? achName : '???'}</span>
                      {unlocked && <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">{achDesc}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-textdark/70">{t('dashboard.weeklyTitle')}</div>
              <div className="mt-3">
                <CheckInHistory weeklyCompleted={weeklyCompleted} />
              </div>

              {showHistoryDetails ? (
                <div className="mt-4 rounded-xl border border-softgray bg-softgray/40 p-4 space-y-3">
                  <div className="text-sm font-semibold text-textdark/80">{t('dashboard.fullHistoryTitle')}</div>
                  <div className="space-y-2">
                    {history?.items?.length ? (
                      history.items.map((item, i) => (
                        <div 
                          key={i} 
                          onClick={() => setSelectedHistoryItem(item)}
                          className="flex items-center gap-3 bg-white dark:bg-dm-surface p-3 rounded-xl border border-softgray dark:border-dm-border cursor-pointer hover:bg-softgray/50 transition shadow-sm"
                        >
                          <span className="text-xl">📅</span>
                          <span className={`h-3 w-3 rounded-full flex-shrink-0 shadow-sm ${getMoodDot(item.alert_level)}`} />
                          <div className="flex-1 truncate">
                            <p className="text-xs font-bold text-textdark dark:text-dm-text">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-textdark/80 dark:text-dm-muted truncate">
                              {(item.breso_message || item.summary || 'Check-in completado').substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-textdark/50 italic">{t('dashboard.noHistoryYet')}</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[16px] bg-[#EAF0E9] p-5 shadow-sm border border-[#C5D9C2]">
            <div className="text-sm font-semibold text-sage/80 mb-2 uppercase tracking-wide">{t('dashboard.todaysProposalTitle')}</div>
            <div className="text-lg font-bold text-textdark/90 leading-tight">{todaysProposal}</div>
          </section>

          <button
            type="button"
            onClick={() => setShowHistoryDetails((v) => !v)}
            className="w-full rounded-full border border-softgray bg-whiteish px-6 py-3 text-left shadow-soft transition hover:bg-softgray disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="text-sm font-semibold text-textdark">{t('dashboard.viewFullHistory')}</div>
            <div className="mt-0.5 text-xs font-semibold text-textdark/70">{t('dashboard.viewFullHistoryHelp')}</div>
          </button>
        </>
      ) : null}

      {selectedHistoryItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-[20px] bg-white dark:bg-dm-elevated shadow-xl overflow-hidden">
            <div className="p-4 border-b border-softgray dark:border-dm-border flex justify-between items-center bg-sage/5">
              <div>
                <h3 className="font-bold text-textdark dark:text-dm-text">Check-in</h3>
                <p className="text-xs text-textdark/60 dark:text-dm-muted">
                  {new Date(selectedHistoryItem.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-softgray dark:hover:bg-dm-border transition text-textdark dark:text-dm-text"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto w-full">
              <p className="text-sm leading-relaxed text-textdark dark:text-dm-text whitespace-pre-wrap">
                {selectedHistoryItem.breso_message || selectedHistoryItem.summary || 'Sin datos detallados.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Powered by Celo */}
      <div className="mt-8 rounded-xl bg-[#F0F7F0] dark:bg-sage/10 border border-sage/20 p-4 text-center">
        <p className="text-xs text-textdark/50 dark:text-dm-muted mb-1">
          {t('dashboard.celoNote')}
        </p>
        <a
          href="https://celo-sepolia.blockscout.com/address/0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-sage hover:underline"
        >
          {t('dashboard.celoContract')}
        </a>
      </div>
    </div>
  )
}
