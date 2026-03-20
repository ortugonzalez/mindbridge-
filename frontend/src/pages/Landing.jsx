import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

function PlanFeatures({ features = [], accentClass = 'text-sage' }) {
  return (
    <ul className="space-y-2 mt-3">
      {features.map((f, i) => {
        const isNo = f.startsWith('✗')
        return (
          <li
            key={i}
            className={['flex items-start gap-2 text-sm', isNo ? 'text-textdark/35 dark:text-dm-muted/40' : 'text-textdark/80 dark:text-dm-text'].join(' ')}
          >
            <span className={`mt-0.5 shrink-0 text-xs ${isNo ? '' : accentClass}`}>{isNo ? '✗' : '✓'}</span>
            <span>{f.replace(/^[✓✗]\s/, '')}</span>
          </li>
        )
      })}
    </ul>
  )
}

function getTrialDaysLeft() {
  try {
    const start = localStorage.getItem('breso_trial_start')
    if (!start) return null
    const elapsed = Math.floor((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, 15 - elapsed)
  } catch { return null }
}

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)
  const [trialActive, setTrialActive] = useState(false)

  useEffect(() => {
    const days = getTrialDaysLeft()
    if (days !== null) {
      setTrialActive(true)
      setTrialDaysLeft(days)
    }
  }, [])

  const freeFeatures = t('landing.free.features', { returnObjects: true }) || []
  const essentialFeatures = t('landing.essential.features', { returnObjects: true }) || []
  const premiumFeatures = t('landing.premium.features', { returnObjects: true }) || []

  const handleFree = () => {
    if (trialActive) return
    try {
      localStorage.setItem('breso_selected_plan', 'free')
      localStorage.setItem('breso_trial_start', new Date().toISOString())
    } catch { }
    navigate('/welcome')
  }

  const handleEssential = () => {
    try { localStorage.setItem('breso_selected_plan', 'essential') } catch { }
    navigate('/payment?plan=essential')
  }

  const handlePremium = () => navigate('/payment?plan=premium')

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero */}
      <div className="space-y-2 pt-1">
        <h1 className="text-3xl font-bold leading-tight text-textdark dark:text-dm-text">
          {t('landing.hero')}
        </h1>
        <p className="text-base leading-relaxed text-textdark/60 dark:text-dm-muted">
          {t('landing.heroSub')}
        </p>
      </div>

      <div className="flex flex-col gap-4">

        {/* ── FREE TRIAL ── */}
        <div className="relative rounded-2xl border border-sage/60 dark:border-sage/40 bg-white dark:bg-dm-surface p-6 shadow-sm overflow-hidden">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-xl font-bold text-textdark dark:text-dm-text">Versión de prueba</span>
            <span className="text-sm font-semibold text-sage">15 días</span>
          </div>
          <PlanFeatures features={freeFeatures} accentClass="text-sage" />

          {trialActive ? (
            <div className="mt-6 pt-5 border-t border-softgray dark:border-dm-border">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-green-600 dark:text-green-500">{trialDaysLeft > 0 ? `${trialDaysLeft} días restantes` : 'Finalizada'}</span>
                <span className="text-xs font-medium text-textdark/50 dark:text-dm-muted">{15 - trialDaysLeft}/15 usados</span>
              </div>
              <div className="w-full h-2 bg-softgray dark:bg-dm-border rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${((15 - trialDaysLeft) / 15) * 100}%` }}
                ></div>
              </div>
              <button
                type="button"
                disabled
                className="w-full rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 px-5 py-3 text-sm font-semibold text-green-700 dark:text-green-400 opacity-90 cursor-default"
              >
                Prueba en curso ✓
              </button>
            </div>
          ) : (
            <div className="mt-6 pt-5 border-t border-softgray dark:border-dm-border">
              <button
                type="button"
                onClick={handleFree}
                className="w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              >
                {t('landing.free.cta')}
              </button>
            </div>
          )}
        </div>

        {/* ── ESSENTIAL ── */}
        <div className="relative rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-6 shadow-sm transition hover:border-sage/40 hover:shadow-md">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xl font-bold text-textdark dark:text-dm-text">Esencial</span>
          </div>
          <div className="mb-4">
            <span className="text-2xl font-black text-textdark dark:text-dm-text">5 USDT</span>
            <span className="text-sm font-semibold text-textdark/50 dark:text-dm-muted">/mes</span>
          </div>
          <PlanFeatures features={essentialFeatures} accentClass="text-sage" />
          <div className="mt-6 pt-5 border-t border-softgray dark:border-dm-border">
            <button
              type="button"
              onClick={handleEssential}
              className="w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              Seleccionar
            </button>
          </div>
        </div>

        {/* ── PREMIUM ── */}
        <div className="relative rounded-2xl border-2 border-[#B8860B]/70 bg-gradient-to-b from-white to-[#B8860B]/5 dark:from-dm-surface dark:to-[#B8860B]/10 p-6 shadow-md transition hover:shadow-lg">
          <div className="absolute top-4 right-4">
            <span className="rounded-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">Premium</span>
          </div>
          <div className="flex items-baseline justify-between mb-2 pr-20">
            <span className="text-xl font-bold text-textdark dark:text-dm-text">Premium</span>
          </div>
          <div className="mb-4">
            <span className="text-2xl font-black text-[#B8860B] dark:text-[#E8CD81]">12 USDT</span>
            <span className="text-sm font-semibold text-textdark/50 dark:text-dm-muted">/mes</span>
          </div>
          <PlanFeatures features={premiumFeatures} accentClass="text-[#B8860B]" />
          <div className="mt-6 pt-5 border-t border-softgray dark:border-dm-border">
            <button
              type="button"
              onClick={handlePremium}
              className="w-full rounded-full border border-[#B8860B] bg-white dark:bg-dm-surface px-5 py-3 text-sm font-semibold text-[#B8860B] transition-all hover:bg-[#B8860B] hover:text-white hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              Seleccionar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
