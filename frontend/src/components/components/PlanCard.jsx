import { useTranslation } from 'react-i18next'

export default function PlanCard({ planKey, onSelect }) {
  const { t } = useTranslation()

  const title = t(`landing.plans.${planKey}.title`)
  const price = t(`landing.plans.${planKey}.price`)
  const features = t(`landing.plans.${planKey}.features`, { returnObjects: true })

  return (
    <button
      type="button"
      onClick={() => onSelect?.(planKey)}
      className="w-full rounded-xl border border-softgray bg-whiteish p-5 text-left shadow-soft transition hover:shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-lg font-bold text-textdark">{title}</div>
        <div className="text-sm font-semibold text-textdark/80">{price}</div>
      </div>

      <ul className="mt-4 space-y-2">
        {Array.isArray(features) &&
          features.map((f, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-textdark">
              <span className="mt-0.5 h-2 w-2 rounded-full bg-sage" />
              <span>{f}</span>
            </li>
          ))}
      </ul>
    </button>
  )
}

