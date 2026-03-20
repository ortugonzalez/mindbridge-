import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { STORAGE_KEY } from '../i18n'

export default function LanguageToggle() {
  const { t } = useTranslation()
  const [lang, setLang] = useState(i18n.language || 'en')

  useEffect(() => {
    const handler = () => setLang(i18n.language || 'en')
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  const setLanguage = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
    i18n.changeLanguage(next)
  }

  return (
    <div className="fixed right-3 top-3 z-50">
      <div className="flex items-center gap-2 rounded-full border border-softgray bg-whiteish px-3 py-2 shadow-soft">
        <button
          type="button"
          onClick={() => setLanguage('es')}
          className={[
            'rounded-full px-2.5 py-1 text-sm font-semibold transition',
            lang === 'es' ? 'bg-sage text-whiteish' : 'bg-whiteish text-textdark hover:bg-softgray',
          ].join(' ')}
          aria-label={t('language.label') + ': ' + t('language.es')}
        >
          🇦🇷 {t('language.es')}
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={[
            'rounded-full px-2.5 py-1 text-sm font-semibold transition',
            lang === 'en' ? 'bg-sage text-whiteish' : 'bg-whiteish text-textdark hover:bg-softgray',
          ].join(' ')}
          aria-label={t('language.label') + ': ' + t('language.en')}
        >
          🇺🇸 {t('language.en')}
        </button>
      </div>
    </div>
  )
}

