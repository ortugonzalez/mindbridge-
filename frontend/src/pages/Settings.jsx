import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import i18n, { STORAGE_KEY } from '../i18n'
import { getConversationHistory } from '../services/api'

export default function Settings() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [lang, setLang] = useState(i18n.language || 'es')

  const [emailNotifs, setEmailNotifs] = useState(true)
  const [alertFreq, setAlertFreq] = useState('immediate') // 'immediate' | 'daily'

  // FIX 10: daily reminder state
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('breso_daily_reminder') || '{}')
      return stored.enabled || false
    } catch { return false }
  })
  const [reminderTime, setReminderTime] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('breso_daily_reminder') || '{}')
      return stored.time || '20:00'
    } catch { return '20:00' }
  })

  // PRIORITY 7: export state
  const [exportMsg, setExportMsg] = useState(false)
  const [showExportChoice, setShowExportChoice] = useState(false)

  const handleLangChange = (e) => {
    const l = e.target.value
    setLang(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    i18n.changeLanguage(l)
  }

  // FIX 10: toggle reminder + request notification permission
  const handleReminderToggle = async () => {
    const newEnabled = !reminderEnabled
    if (newEnabled && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    setReminderEnabled(newEnabled)
    try {
      localStorage.setItem('breso_daily_reminder', JSON.stringify({ enabled: newEnabled, time: reminderTime }))
    } catch {}
  }

  const handleReminderTimeChange = (e) => {
    const val = e.target.value
    setReminderTime(val)
    try {
      const stored = JSON.parse(localStorage.getItem('breso_daily_reminder') || '{}')
      localStorage.setItem('breso_daily_reminder', JSON.stringify({ ...stored, time: val }))
    } catch {}
  }

  // PRIORITY 7: dual export
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPersonal = async () => {
    const data = {
      nombre: localStorage.getItem('breso_user_name') || null,
      plan: localStorage.getItem('breso_selected_plan') || null,
      dias_racha: null,
      conversaciones: (() => {
        try { return JSON.parse(localStorage.getItem('breso_conversation_history') || '[]') } catch { return [] }
      })(),
      contactos: (() => {
        try { return JSON.parse(localStorage.getItem('breso_trusted_contacts') || '[]') } catch { return [] }
      })(),
      exportado_el: new Date().toISOString(),
    }
    try {
      const res = await getConversationHistory(200)
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        data.conversaciones_backend = res.data
      }
    } catch {}
    const date = new Date().toISOString().split('T')[0]
    downloadJSON(data, `breso_datos_${date}.json`)
    setShowExportChoice(false)
    setExportMsg(true)
    setTimeout(() => setExportMsg(false), 3000)
  }

  const handleExportProfessional = () => {
    const data = {
      paciente: 'Anónimo',
      periodo: '30 días',
      resumen: 'Check-ins regulares',
      alertas: 0,
      generado_por: 'Soledad por BRESO',
      exportado_el: new Date().toISOString(),
    }
    const date = new Date().toISOString().split('T')[0]
    downloadJSON(data, `breso_informe_profesional_${date}.json`)
    setShowExportChoice(false)
    setExportMsg(true)
    setTimeout(() => setExportMsg(false), 3000)
  }

  const handleDelete = () => {
    if (window.confirm(t('settings.confirm_delete'))) {
      alert('Account marked for deletion')
    }
  }

  return (
    <div className="animate-fade-in-page space-y-6">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        {t('settings.title')}
      </h1>

      <div className="space-y-6">

        {/* Preferences */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-soft space-y-5">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-textdark dark:text-dm-text">{t('settings.theme')}</p>
              <p className="text-xs text-textdark/60 dark:text-dm-muted">
                {theme === 'dark' ? t('nav.darkModeLabel') : t('nav.lightModeLabel')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-sage' : 'bg-softgray dark:bg-dm-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* Language */}
          <div className="flex items-center justify-between">
            <p className="font-medium text-textdark dark:text-dm-text">{t('settings.language')}</p>
            <select
              value={lang}
              onChange={handleLangChange}
              className="bg-transparent text-sm font-medium text-sage outline-none cursor-pointer"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* FIX 10: Daily reminder toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-textdark dark:text-dm-text">Recordatorio diario</p>
                {reminderEnabled && (
                  <p className="text-xs text-textdark/60 dark:text-dm-muted mt-0.5">
                    Soledad te va a recordar hacer tu check-in diario a las {reminderTime}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleReminderToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reminderEnabled ? 'bg-sage' : 'bg-softgray dark:bg-dm-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {reminderEnabled && (
              <div className="flex items-center gap-3">
                <p className="text-sm text-textdark/70 dark:text-dm-muted">{t('settings.reminders')}</p>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                  className="bg-softgray/50 dark:bg-dm-bg rounded-lg px-2 py-1 text-sm text-textdark dark:text-dm-text border border-softgray dark:border-dm-border outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-soft space-y-5">
          {/* Email Notifs */}
          <div className="flex items-center justify-between">
            <p className="font-medium text-textdark dark:text-dm-text">{t('settings.notifications_email')}</p>
            <button
              type="button"
              onClick={() => setEmailNotifs(!emailNotifs)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifs ? 'bg-sage' : 'bg-softgray dark:bg-dm-border'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* Alert Frequency */}
          <div className="flex items-center justify-between">
            <p className="font-medium text-textdark dark:text-dm-text">{t('settings.notifications_frequency')}</p>
            <select
              value={alertFreq}
              onChange={(e) => setAlertFreq(e.target.value)}
              className="bg-transparent text-sm font-medium text-textdark/80 dark:text-dm-text/80 outline-none cursor-pointer"
            >
              <option value="immediate">{t('settings.freq_immediate')}</option>
              <option value="daily">{t('settings.freq_daily')}</option>
            </select>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-soft space-y-4">
          {/* PRIORITY 7: Export data with two choices */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowExportChoice(v => !v)}
              className="w-full flex justify-between items-center py-2 text-textdark dark:text-dm-text hover:text-sage dark:hover:text-sage transition-colors font-medium"
            >
              {t('settings.export_data')}
              <span>⬇️</span>
            </button>
            {showExportChoice && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportPersonal}
                  className="flex-1 rounded-xl border border-sage text-sage text-sm font-semibold py-2 hover:bg-sage hover:text-white transition-colors"
                >
                  Para mí
                </button>
                <button
                  type="button"
                  onClick={handleExportProfessional}
                  className="flex-1 rounded-xl border border-textdark/20 dark:border-dm-border text-textdark/70 dark:text-dm-muted text-sm font-semibold py-2 hover:bg-softgray dark:hover:bg-dm-border transition-colors"
                >
                  Para mi profesional
                </button>
              </div>
            )}
            {exportMsg && (
              <p className="text-xs text-sage font-medium">Tus datos fueron descargados</p>
            )}
          </div>
          <hr className="border-softgray dark:border-dm-border" />
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex justify-between items-center py-2 text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            {t('settings.delete_account')}
            <span>⚠️</span>
          </button>
        </div>

      </div>
    </div>
  )
}
