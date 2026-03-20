import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import i18n, { STORAGE_KEY } from '../i18n'

export default function Settings() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [lang, setLang] = useState(i18n.language || 'es')
  
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [alertFreq, setAlertFreq] = useState('immediate') // 'immediate' | 'daily'
  const [reminderTime, setReminderTime] = useState('19:00')

  const handleLangChange = (e) => {
    const l = e.target.value
    setLang(l)
    try { localStorage.setItem(STORAGE_KEY, l) } catch {}
    i18n.changeLanguage(l)
  }

  const handleDelete = () => {
    if (window.confirm(t('settings.confirm_delete'))) {
      // Stub delete logic
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

          {/* Reminders */}
          <div className="flex items-center justify-between">
            <p className="font-medium text-textdark dark:text-dm-text">{t('settings.reminders')}</p>
            <input 
              type="time" 
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="bg-softgray/50 dark:bg-dm-bg rounded-lg px-2 py-1 text-sm text-textdark dark:text-dm-text border border-softgray dark:border-dm-border outline-none" 
            />
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
          <button type="button" className="w-full flex justify-between items-center py-2 text-textdark dark:text-dm-text hover:text-sage dark:hover:text-sage transition-colors font-medium">
            {t('settings.export_data')}
            <span>⬇️</span>
          </button>
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
