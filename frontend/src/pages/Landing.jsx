import { useState } from 'react'
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

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const freeFeatures = t('landing.free.features', { returnObjects: true }) || []
  const essentialFeatures = t('landing.essential.features', { returnObjects: true }) || []
  const premiumFeatures = t('landing.premium.features', { returnObjects: true }) || []

  const handleFree = () => {
    try {
      localStorage.setItem('breso_selected_plan', 'free')
      localStorage.setItem('breso_trial_start', new Date().toISOString())
    } catch {}
    navigate('/welcome')
  }

  const handleEssential = () => {
    try { localStorage.setItem('breso_selected_plan', 'essential') } catch {}
    navigate('/welcome')
  }

  const handlePremium = () => setShowPremiumModal(true)

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
            <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-white shadow-sm">
              {t('landing.free.badge')}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-textdark dark:text-dm-text">{t('landing.free.title')}</span>
            <span className="text-sm font-semibold text-sage">{t('landing.free.price')}</span>
          </div>
          <PlanFeatures features={freeFeatures} accentClass="text-sage" />
          <p className="mt-3 text-xs text-textdark/45 dark:text-dm-muted">{t('landing.free.note')}</p>
          <button
            type="button"
            onClick={handleFree}
            className="mt-4 w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            {t('landing.free.cta')}
          </button>
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

      {/* Premium modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-dm-surface p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-textdark dark:text-dm-text">{t('landing.premiumModal.title')}</h2>
            <p className="text-sm leading-relaxed text-textdark/70 dark:text-dm-text">{t('landing.premiumModal.message')}</p>
            <button
              type="button"
              onClick={() => setShowPremiumModal(false)}
              className="w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t('landing.premiumModal.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
