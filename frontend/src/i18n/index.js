import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'

const STORAGE_KEY = 'breso_lang'

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'es' || saved === 'en') return saved

  const browser = typeof navigator !== 'undefined' ? navigator.language : ''
  if (browser?.toLowerCase().startsWith('es')) return 'es'
  return 'en'
}

const resources = {
  es: { translation: es },
  en: { translation: en },
}

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  lng: getInitialLanguage(),
  interpolation: {
    escapeValue: false,
  },
})

export { STORAGE_KEY }

export default i18n
