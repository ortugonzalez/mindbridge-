import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-softgray bg-whiteish p-6 shadow-soft text-center">
        <div className="text-4xl mb-3">🌱</div>
        <h1 className="text-2xl font-bold text-textdark">{t('landing.hero')}</h1>
        <p className="mt-2 text-sm text-textdark/70">{t('landing.guide')}</p>
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="mt-5 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90"
        >
          {t('landing.cta')}
        </button>
      </section>
    </div>
  )
}
