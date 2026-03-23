import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import CheckInHistory from '../components/CheckInHistory'
import { addContact, getCheckinHistory, getDashboard } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'
const CONTACT_NAME_KEY = 'breso_trust_contact_name'
const CONTACT_REL_KEY = 'breso_trust_contact_relation'

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
  const storedContactName = safeGetLocalStorage(CONTACT_NAME_KEY)
  const storedContactRelation = safeGetLocalStorage(CONTACT_REL_KEY)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [dashboard, setDashboard] = useState(null)
  const [history, setHistory] = useState(null)

  const [startLoading, setStartLoading] = useState(false)
  const [showHistoryDetails, setShowHistoryDetails] = useState(false)

  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactSaving, setContactSaving] = useState(false)
  const [contactFormName, setContactFormName] = useState('')
  const [contactFormEmail, setContactFormEmail] = useState('')
  const [contactFormRelation, setContactFormRelation] = useState('')
  const [contactError, setContactError] = useState('')

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
  const contactName = dashboard?.contact?.nombre || storedContactName
  const contactRelation = dashboard?.contact?.relacion || storedContactRelation

  const streakMilestones = [3, 7, 30, 100]
  const nextMilestone = streakMilestones.find(m => m > streakDays) || 100
  const progressPercent = Math.min(100, Math.round((streakDays / nextMilestone) * 100))

  const totalCheckins = dashboard?.totalCheckins ?? history?.items?.length ?? Math.max(streakDays, 1)

  const achievementsList = [
    { id: 'primer', name: 'Primer paso', desc: 'primer check-in', icon: '🌱', req: { type: 'checkins', val: 1 } },
    { id: 'racha3', name: '3 días seguidos', desc: 'racha de 3', icon: '🔥', req: { type: 'streak', val: 3 } },
    { id: 'semana', name: 'Una semana entera', desc: 'racha de 7', icon: '⭐', req: { type: 'streak', val: 7 } },
    { id: 'constancia', name: 'Constancia', desc: 'racha de 14', icon: '🌙', req: { type: 'streak', val: 14 } },
    { id: 'mes', name: 'Un mes con Soledad', desc: 'racha de 30', icon: '🏆', req: { type: 'streak', val: 30 } },
    { id: 'conv10', name: '10 conversaciones', desc: '10 check-ins totales', icon: '💬', req: { type: 'checkins', val: 10 } },
    { id: 'conv50', name: '50 conversaciones', desc: '50 check-ins totales', icon: '🎯', req: { type: 'checkins', val: 50 } },
  ]

  const dailyProposals = [
    "Salí a caminar 15 minutos sin el teléfono 🌿",
    "Escribí una cosa que salió bien hoy, aunque sea pequeña",
    "Llamá a alguien que no hablaste hace tiempo",
    "Tomá agua y respirá profundo 3 veces antes de seguir"
  ]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  const todaysProposal = dailyProposals[dayOfYear % dailyProposals.length]

  const handleStart = () => {
    setStartLoading(true)
    navigate('/chat', { state: { mode: dashboard?.mode || 'listening' } })
  }

  const openContactModal = () => {
    setContactError('')
    setContactSaving(false)
    setContactFormName(contactName || '')
    setContactFormRelation(contactRelation || '')
    setContactFormEmail('')
    setContactModalOpen(true)
  }

  const handleSaveContact = async () => {
    setContactError('')
    const n = contactFormName.trim()
    const e = contactFormEmail.trim()
    const r = contactFormRelation.trim()
    if (!n || !e || !r) {
      setContactError(t('common.required'))
      return
    }

    setContactSaving(true)
    try {
      safeSetLocalStorage(CONTACT_NAME_KEY, n)
      safeSetLocalStorage(CONTACT_REL_KEY, r)
      await addContact({ name: n, email: e, relation: r })
      const dashRes = await getDashboard()
      setDashboard(dashRes.data || null)
      setContactModalOpen(false)
    } catch {
      setContactError(t('common.error'))
    } finally {
      setContactSaving(false)
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
                <div className="text-sm font-semibold text-textdark/70">Racha actual</div>
                <div className="mt-1 flex items-baseline gap-2 text-textdark">
                  <span className="text-3xl font-bold">{streakDays}</span>
                  <span className="font-semibold">{streakDays >= 3 ? '🔥 ' : ''}días seguidos con Soledad</span>
                </div>
                <div className="mt-4 w-full bg-softgray/40 rounded-full h-2 overflow-hidden">
                  <div className="bg-sage h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 text-xs font-semibold text-textdark/50 text-right">
                  Siguiente hito: {nextMilestone} días
                </div>
              </div>

              <div className="rounded-xl border border-softgray bg-whiteish p-4 flex flex-col justify-between">
                <div>
                  <div className="text-sm font-semibold text-textdark/70">Puntos generados</div>
                  <div className="mt-1 flex items-baseline gap-2 text-textdark">
                    <span className="text-3xl font-bold">{totalCheckins * 10}</span>
                    <span className="font-semibold">puntos acumulados</span>
                  </div>
                </div>
                <div className="mt-3 text-xs font-semibold text-sage bg-sage/10 rounded-lg px-3 py-2 inline-block self-start">
                  Ganás 10 puntos por cada check-in
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-textdark/70 mb-3">Tus logros</div>
              <div className="grid grid-cols-2 gap-3">
                {achievementsList.map((ach) => {
                  const unlocked = ach.req.type === 'streak' ? streakDays >= ach.req.val : totalCheckins >= ach.req.val
                  return (
                    <div
                      key={ach.id}
                      onClick={() => {
                        if (unlocked) alert(`Logro "${ach.name}" desbloqueado el ${new Date().toLocaleDateString()}`)
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-[16px] border text-center ${unlocked ? 'bg-sage border-sage/20 text-white shadow-soft cursor-pointer hover:opacity-90 transition' : 'bg-softgray/20 border-softgray opacity-40'}`}
                    >
                      <span className="text-3xl mb-2">{ach.icon}</span>
                      <span className="text-sm font-bold leading-snug mb-1">{unlocked ? ach.name : '???'}</span>
                      {unlocked && <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">{ach.desc}</span>}
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
                <div className="mt-4 rounded-xl border border-softgray bg-softgray/40 p-4">
                  <div className="text-sm font-semibold text-textdark/80">{t('dashboard.historyDetailsTitle')}</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const completed = Boolean(weeklyCompleted[i])
                      const label = weekdays[i] || `D${i + 1}`
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs font-semibold text-textdark/70">
                          <span className={`h-2.5 w-2.5 rounded-full ${completed ? 'bg-sage' : 'bg-softgray'}`} />
                          <span>{label}</span>
                          <span className="text-textdark/60">{completed ? completedLabel : pendingLabel}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[16px] bg-[#EAF0E9] p-5 shadow-sm border border-[#C5D9C2]">
            <div className="text-sm font-semibold text-sage/80 mb-2 uppercase tracking-wide">Propuesta de Soledad para hoy</div>
            <div className="text-lg font-bold text-textdark/90 leading-tight">{todaysProposal}</div>
          </section>

          <section className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">
            <div className="text-sm font-semibold text-textdark/70">{t('dashboard.trustContactTitle')}</div>
            <div className="mt-2 text-lg font-semibold text-textdark">
              {contactName
                ? `${contactName}${contactRelation ? ` · ${contactRelation}` : ''}`
                : contactRelation || '—'}
            </div>
          </section>

          <button
            type="button"
            onClick={handleStart}
            disabled={startLoading}
            className="w-full rounded-full bg-sage px-6 py-3 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {startLoading ? t('dashboard.startLoading') : t('dashboard.startToday')}
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryDetails((v) => !v)}
            className="w-full rounded-full border border-softgray bg-whiteish px-6 py-3 text-left shadow-soft transition hover:bg-softgray disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="text-sm font-semibold text-textdark">{t('dashboard.viewHistory')}</div>
            <div className="mt-0.5 text-xs font-semibold text-textdark/70">{t('dashboard.viewHistoryHelp')}</div>
          </button>

          <button
            type="button"
            onClick={openContactModal}
            className="w-full rounded-full border border-softgray bg-whiteish px-6 py-3 text-left shadow-soft transition hover:bg-softgray disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="text-sm font-semibold text-textdark">{t('dashboard.configureContact')}</div>
            <div className="mt-0.5 text-xs font-semibold text-textdark/70">{t('dashboard.configureContactHelp')}</div>
          </button>
        </>
      ) : null}

      {contactModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-textdark">{t('dashboard.contactModalTitle')}</div>
                <div className="mt-1 text-sm font-semibold text-textdark/70">{t('dashboard.configureContactHelp')}</div>
              </div>
              <button
                type="button"
                className="rounded-full border border-softgray bg-whiteish px-3 py-1 text-xs font-semibold text-textdark hover:bg-softgray"
                onClick={() => setContactModalOpen(false)}
                disabled={contactSaving}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <div className="text-sm font-semibold text-textdark/90">{t('dashboard.contactFormName')}</div>
                <input
                  value={contactFormName}
                  onChange={(e) => setContactFormName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                  type="text"
                  disabled={contactSaving}
                  placeholder={t('dashboard.contactFormName')}
                />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-textdark/90">{t('dashboard.contactFormEmail')}</div>
                <input
                  value={contactFormEmail}
                  onChange={(e) => setContactFormEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                  type="email"
                  disabled={contactSaving}
                  placeholder={t('dashboard.contactFormEmail')}
                />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-textdark/90">{t('dashboard.contactFormRelation')}</div>
                <input
                  value={contactFormRelation}
                  onChange={(e) => setContactFormRelation(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                  type="text"
                  disabled={contactSaving}
                  placeholder={activeLang === 'es' ? 'Ej: hermana, amigo...' : 'e.g., sister, friend...'}
                />
              </label>
            </div>

            {contactError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{contactError}</div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                disabled={contactSaving}
                className="flex-1 rounded-full border border-softgray bg-whiteish px-4 py-2 text-sm font-semibold text-textdark shadow-soft transition hover:bg-softgray disabled:opacity-70"
              >
                {t('dashboard.contactCancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                disabled={contactSaving}
                className="flex-1 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {contactSaving ? t('dashboard.contactSaving') : t('dashboard.contactSave')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
