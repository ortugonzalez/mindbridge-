import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PlanCard from '../components/PlanCard'

export default function Landing() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSelectPlan = (planKey) => {
    try {
      localStorage.setItem('breso_plan_preference', planKey)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-textdark/70">{t('landing.guide')}</p>

      <section className="rounded-2xl border border-softgray bg-whiteish p-6 shadow-soft">
        <h1 className="text-3xl font-bold leading-tight text-textdark sm:text-4xl">
          {t('landing.hero')}
        </h1>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlanCard planKey="essential" onSelect={handleSelectPlan} />
        <PlanCard planKey="premium" onSelect={handleSelectPlan} />
      </section>

      <div className="flex justify-center sm:justify-start">
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="rounded-full bg-sage px-6 py-3 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90"
        >
          {t('landing.cta')}
        </button>
      </div>
    </div>
  )
}
