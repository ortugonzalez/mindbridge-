import { useEffect, useState } from 'react'
import i18n, { STORAGE_KEY } from '../i18n'

export default function LanguageToggle() {
  const [lang, setLang] = useState(i18n.language || 'es')

  useEffect(() => {
    const handler = () => setLang(i18n.language || 'es')
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  const setLanguage = (next) => {
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    i18n.changeLanguage(next)
  }

  return (
    <div className="fixed right-3 top-3 z-40">
      <div className="flex items-center gap-1 rounded-full border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface px-2 py-1.5 shadow-soft">
        {['es', 'en'].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold transition',
              lang === l
                ? 'bg-sage text-white'
                : 'text-textdark dark:text-dm-text hover:bg-softgray dark:hover:bg-dm-border',
            ].join(' ')}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
