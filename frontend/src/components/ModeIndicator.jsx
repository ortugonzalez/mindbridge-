import { useTranslation } from 'react-i18next'

const MODES = [
  { key: 'listening', emoji: '🎧' },
  { key: 'motivation', emoji: '⚡' },
  { key: 'proposal', emoji: '🌱' },
  { key: 'celebration', emoji: '🎉' },
]

export default function ModeIndicator({ mode, onChange }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      {MODES.map((m) => {
        const isActive = m.key === mode
        const label = t(`chat.mode${m.key.charAt(0).toUpperCase() + m.key.slice(1)}`)
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange?.(m.key)}
            className={[
              'flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
              isActive
                ? 'border-sage bg-sage text-whiteish'
                : 'border-softgray bg-whiteish text-textdark hover:bg-softgray',
              onChange ? 'cursor-pointer' : 'cursor-default',
            ].join(' ')}
            aria-pressed={isActive}
          >
            <span className="text-base">{m.emoji}</span>
            <span className="whitespace-nowrap">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
