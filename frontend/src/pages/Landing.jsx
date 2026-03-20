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
    } catch {}
    navigate('/welcome')
  }

  const handleEssential = () => {
    try { localStorage.setItem('breso_selected_plan', 'essential') } catch {}
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
        <div className="relative rounded-2xl border-2 border-sage bg-sage/5 dark:bg-sage/10 p-5">
          <div className="absolute -top-3 right-4">
            {trialActive ? (
              <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                {trialDaysLeft > 0 ? `${trialDaysLeft} días restantes` : 'Prueba finalizada'}
              </span>
            ) : (
              <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-white shadow-sm">
                {t('landing.free.badge')}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-textdark dark:text-dm-text">{t('landing.free.title')}</span>
            <span className="text-sm font-semibold text-sage">{t('landing.free.price')}</span>
          </div>
          <PlanFeatures features={freeFeatures} accentClass="text-sage" />
          <p className="mt-3 text-xs text-textdark/45 dark:text-dm-muted">{t('landing.free.note')}</p>
          {trialActive ? (
            <div className="mt-4 w-full rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-3 text-sm font-semibold text-green-700 dark:text-green-400 text-center">
              Ya reclamado ✓ — Período de prueba activo
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFree}
              className="mt-4 w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
            >
              {t('landing.free.cta')}
            </button>
          )}
        </div>

        {/* ── ESSENTIAL ── */}
        <div className="rounded-2xl border-2 border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-5 transition hover:border-sage/40">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-textdark dark:text-dm-text">{t('landing.essential.title')}</span>
            <span className="text-sm font-semibold text-textdark/60 dark:text-dm-muted">{t('landing.essential.price')}</span>
          </div>
          <PlanFeatures features={essentialFeatures} accentClass="text-sage" />
          <p className="mt-3 text-xs text-textdark/40 dark:text-dm-muted">{t('landing.essential.note')}</p>
          <button
            type="button"
            onClick={handleEssential}
            className="mt-4 w-full rounded-full border-2 border-sage px-5 py-3 text-sm font-semibold text-sage transition hover:bg-sage hover:text-white"
          >
            {t('landing.essential.cta')}
          </button>
        </div>

        {/* ── PREMIUM ── */}
        <div className="relative rounded-2xl border-2 border-[#C4962A] bg-[#C4962A]/5 dark:bg-[#C4962A]/10 p-5">
          <div className="absolute -top-3 right-4">
            <span className="rounded-full bg-[#C4962A] px-3 py-1 text-xs font-bold text-white shadow-sm">Premium</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-textdark dark:text-dm-text">{t('landing.premium.title')}</span>
            <span className="text-sm font-semibold text-[#C4962A]">{t('landing.premium.price')}</span>
          </div>
          <PlanFeatures features={premiumFeatures} accentClass="text-[#C4962A]" />
          <p className="mt-3 text-xs text-textdark/40 dark:text-dm-muted">{t('landing.premium.note')}</p>
          <button
            type="button"
            onClick={handlePremium}
            className="mt-4 w-full rounded-full border-2 border-[#C4962A] px-5 py-3 text-sm font-semibold text-[#C4962A] transition hover:bg-[#C4962A] hover:text-white"
          >
            {t('landing.premium.cta')}
          </button>
        </div>
      </div>
    </div>
  )
}
