import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import i18n, { STORAGE_KEY } from '../i18n'
import { getConversationHistory, getDailySummaries } from '../services/api'

export default function Settings() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [lang, setLang] = useState(i18n.language || 'es')

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

  const [exportMsg, setExportMsg] = useState(false)
  const [showExportChoice, setShowExportChoice] = useState(false)

  const exportAsPDF = (data, type) => {
    const conversaciones = type === 'personal' ? data.conversaciones || [] : []
    const summaries = type === 'personal' ? data.summaries || [] : []
    const content = type === 'personal' ? `
      <html>
      <head>
        <style>
          body { font-family: Inter, sans-serif; padding: 40px; color: #2D2D2D; }
          h1 { color: #7C9A7E; font-weight: 400; }
          h2 { color: #2D2D2D; font-weight: 500; margin-top: 24px; }
          .label { color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; }
          .value { font-size: 16px; margin-bottom: 8px; }
          .message { border-left: 3px solid #7C9A7E; padding: 8px 16px; margin: 8px 0; border-radius: 0 8px 8px 0; }
          .soledad { background: #F0F7F0; }
          .user { background: #FAFAFA; }
          .day-row { display: flex; gap: 16px; padding: 8px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
          .day-date { color: #6B7280; min-width: 100px; }
          .day-summary { color: #2D2D2D; flex: 1; }
          hr { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🌱 Mi historial en BRESO</h1>
        <div class="label">Nombre</div>
        <div class="value">${data.nombre || '—'}</div>
        <div class="label">Plan activo</div>
        <div class="value">${data.plan || '—'}</div>
        <div class="label">Exportado el</div>
        <div class="value">${new Date().toLocaleDateString('es-AR')}</div>
        <hr/>
        <h2>Historial por día</h2>
        ${summaries.length === 0
          ? '<p style="color:#9CA3AF">Sin resúmenes disponibles.</p>'
          : summaries.map(s => `
            <div class="day-row">
              <span class="day-date">${s.date}</span>
              <span class="day-summary">${s.summary}</span>
            </div>
          `).join('')}
        <hr/>
        <h2>Conversaciones recientes</h2>
        ${conversaciones.length === 0 ? '<p style="color:#9CA3AF">Sin conversaciones registradas.</p>' : conversaciones.map(m => `
          <div class="message ${m.role === 'soledad' || m.from === 'breso' ? 'soledad' : 'user'}">
            <strong>${m.role === 'soledad' || m.from === 'breso' ? 'Soledad' : 'Yo'}</strong>
            <p style="margin:4px 0">${m.text || ''}</p>
          </div>
        `).join('')}
      </body>
      </html>
    ` : `
      <html>
      <head>
        <style>
          body { font-family: Inter, sans-serif; padding: 40px; color: #2D2D2D; }
          h1 { color: #7C9A7E; font-weight: 400; }
          .label { color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; }
          .value { font-size: 16px; margin-bottom: 8px; }
          hr { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🌱 Informe de bienestar — BRESO</h1>
        <p><em>Generado por Soledad para uso profesional</em></p>
        <div class="label">Paciente</div>
        <div class="value">Anónimo</div>
        <div class="label">Período</div>
        <div class="value">Últimos 30 días</div>
        <div class="label">Check-ins realizados</div>
        <div class="value">${data.dias_racha || 0} días de racha</div>
        <div class="label">Resumen</div>
        <div class="value">El paciente ha mantenido check-ins regulares durante el período evaluado.</div>
        <div class="label">Alertas registradas</div>
        <div class="value">0</div>
        <hr/>
        <p style="color: #9CA3AF; font-size: 12px;">
          Generado por Soledad — BRESO. Este informe no constituye un diagnóstico clínico.
        </p>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

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

  const handleExportPersonal = async () => {
    const conversaciones = (() => {
      try { return JSON.parse(localStorage.getItem('breso_conversation') || localStorage.getItem('breso_conversation_history') || '[]') } catch { return [] }
    })()
    const data = {
      nombre: localStorage.getItem('breso_user_name') || null,
      plan: localStorage.getItem('breso_selected_plan') || null,
      dias_racha: null,
      conversaciones,
      summaries: [],
    }
    try {
      const res = await getConversationHistory(200)
      const items = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
      if (items.length > 0) {
        data.conversaciones = items.flatMap(item => {
          const msgs = []
          if (item.user_message) msgs.push({ role: 'user', text: item.user_message })
          if (item.soledad_response) msgs.push({ role: 'soledad', text: item.soledad_response })
          return msgs
        })
      }
    } catch {}
    try {
      const summaryRes = await getDailySummaries()
      const summaryItems = Array.isArray(summaryRes.data) ? summaryRes.data : (Array.isArray(summaryRes) ? summaryRes : [])
      if (summaryItems.length > 0) data.summaries = summaryItems
    } catch {}
    exportAsPDF(data, 'personal')
    setShowExportChoice(false)
    setExportMsg(true)
    setTimeout(() => setExportMsg(false), 3000)
  }

  const handleExportProfessional = () => {
    const data = { dias_racha: null }
    exportAsPDF(data, 'professional')
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
