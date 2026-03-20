import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { bresAPI } from '../services/api'
import i18n from '../i18n/index'

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Caracas', label: 'Caracas (UTC-4)' },
  { value: 'America/Havana', label: 'La Habana (UTC-5/-4)' },
]

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [language, setLanguage] = useState(i18n.language.startsWith('es') ? 'es' : 'en')
  const [timezone, setTimezone] = useState('America/Mexico_City')
  const [checkinTime, setCheckinTime] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await bresAPI.updateMe({
        language,
        timezone,
        checkin_time_preference: checkinTime,
      })
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition bg-white'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">💙</div>
        <h1 className="text-2xl font-bold text-blue-700">BRESO</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-gray-800 mb-1">{t('onboarding.title')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('onboarding.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              {t('onboarding.language')}
            </label>
            <div className="flex gap-3">
              {[
                { value: 'es', label: 'Español' },
                { value: 'en', label: 'English' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                    language === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              {t('onboarding.timezone')}
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className={inputClass}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Check-in time */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              {t('onboarding.checkin_time')}
            </label>
            <input
              type="time"
              value={checkinTime}
              onChange={e => setCheckinTime(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm mt-2"
          >
            {loading ? t('onboarding.saving') : t('onboarding.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
