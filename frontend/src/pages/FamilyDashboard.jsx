import { useState, useEffect } from 'react'
import { getFamilyPatientStatus, getFamilyWeeklyReport, notifyPatient } from '../services/api'

export default function FamilyDashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const [customMsg, setCustomMsg] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgSent, setMsgSent] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    getFamilyPatientStatus()
      .then(res => {
        const d = res.data || res
        setStatus(d)
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  const linkedPatient = {
    statusLevel: status?.alert_level || 'green',
    weeklySummary: status?.weekly_summary || 'Sin datos esta semana.',
    checkinsCompleted: status?.checkins_this_week ?? '—',
    streak: status?.streak ?? '—',
    lastCheckin: status?.last_checkin || 'Sin datos',
  }

  const getAlertUI = (level) => {
    switch (level) {
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40',
          border: 'border-red-500',
          titleColor: 'text-red-800 dark:text-red-300',
          descColor: 'text-red-700/80 dark:text-red-400/80',
          icon: '❤️',
          title: 'Necesita apoyo hoy',
          desc: `Por favor comunicate con ${linkedPatient.name}`
        }
      case 'orange':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/40',
          border: 'border-orange-500',
          titleColor: 'text-orange-800 dark:text-orange-300',
          descColor: 'text-orange-700/80 dark:text-orange-400/80',
          icon: '🍂',
          title: 'Te recomendamos estar cerca',
          desc: 'Hubo varios días complicados'
        }
      case 'yellow':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-400',
          titleColor: 'text-amber-800 dark:text-amber-300',
          descColor: 'text-amber-700/80 dark:text-amber-400/80',
          icon: '🌼',
          title: 'Puede necesitar atención',
          desc: 'Notamos algunos momentos difíciles'
        }
      case 'green':
      default:
        return {
          bg: 'bg-[#E8F3E8] dark:bg-[#2D3B2D]/60',
          border: 'border-[#7C9A7E]',
          titleColor: 'text-[#3D4F3D] dark:text-[#E8EDE8]',
          descColor: 'text-[#4A5E4A]/80 dark:text-[#9CAF9C]/80',
          icon: '🌱',
          title: 'Todo tranquilo',
          desc: 'No hay señales de alerta esta semana'
        }
    }
  }

  const alertUI = getAlertUI(linkedPatient.statusLevel)

  const presetMessages = [
    "Estoy acá si necesitás",
    "Pensé en vos hoy",
    "¿Querés hablar?"
  ]

  const handleSendMessage = async () => {
    if (!customMsg.trim()) return
    setSendingMsg(true)
    try {
      await notifyPatient({ message: customMsg.trim() })
      setMsgSent(true)
      setTimeout(() => setMsgSent(false), 3000)
    } catch {
      // silent — backend unavailable
    }
    setModalOpen(false)
    setCustomMsg('')
    setSendingMsg(false)
  }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await getFamilyWeeklyReport()
      const report = res.data || res
      const content = `
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
          <p><em>Generado por Soledad para acompañamiento familiar</em></p>
          <div class="label">Semana</div>
          <div class="value">${report.week || '—'}</div>
          <div class="label">Nivel de alerta</div>
          <div class="value">${report.alert_level || 'verde'}</div>
          <div class="label">Resumen</div>
          <div class="value">${report.summary || 'Sin datos disponibles.'}</div>
          <div class="label">Recomendación</div>
          <div class="value">${report.recommendation || '—'}</div>
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
    } catch {
      window.print()
    }
    setExportLoading(false)
  }

  if (loading) {
    return (
      <div className="animate-fade-in-page flex items-center justify-center min-h-[40vh]">
        <p className="text-textdark/50 dark:text-dm-muted text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-page space-y-6 pb-28 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
          Panel de seguimiento
        </h1>
        <p className="text-textdark/70 dark:text-dm-muted text-sm font-medium mt-1">
          Seguimiento de bienestar de tu ser querido
        </p>
        <div className="mt-3 flex items-start gap-2 bg-black/5 dark:bg-black/20 p-3 rounded-lg border border-black/5 dark:border-white/5">
          <span className="text-lg leading-none mt-0.5 opacity-70">ℹ️</span>
          <p className="text-xs font-medium text-textdark/70 dark:text-dm-muted leading-tight">
            Solo ves información general, nunca el contenido de las conversaciones
          </p>
        </div>
      </div>

      {/* Alert Status Card */}
      <div className={`rounded-[16px] p-6 shadow-sm border-l-4 transition-colors ${alertUI.bg} ${alertUI.border}`}>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="text-4xl mb-1">{alertUI.icon}</div>
          <h2 className={`text-xl font-bold tracking-tight ${alertUI.titleColor}`}>
            {alertUI.title}
          </h2>
          <p className={`text-sm font-medium ${alertUI.descColor}`}>
            {alertUI.desc}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-dm-surface border border-softgray dark:border-dm-border p-3 rounded-xl flex flex-col items-center text-center justify-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-textdark/50 dark:text-dm-muted mb-1">Check-ins</p>
          <p className="text-base font-bold text-textdark dark:text-dm-text">{linkedPatient.checkinsCompleted}/7</p>
        </div>
        <div className="bg-white dark:bg-dm-surface border border-softgray dark:border-dm-border p-3 rounded-xl flex flex-col items-center text-center justify-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-textdark/50 dark:text-dm-muted mb-1">Racha</p>
          <p className="text-base font-bold text-textdark dark:text-dm-text">{linkedPatient.streak} días</p>
        </div>
        <div className="bg-white dark:bg-dm-surface border border-softgray dark:border-dm-border p-3 rounded-xl flex flex-col items-center text-center justify-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-textdark/50 dark:text-dm-muted mb-1">Último</p>
          <p className="text-sm font-bold text-textdark dark:text-dm-text">{linkedPatient.lastCheckin}</p>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-white dark:bg-dm-surface rounded-[16px] p-5 shadow-sm border border-softgray dark:border-dm-border border-l-4 border-l-sage">
        <h3 className="text-sm font-bold text-textdark/90 dark:text-dm-text mb-2 tracking-wide">
          Resumen de la semana
        </h3>
        <p className="text-sm text-textdark/80 dark:text-dm-muted leading-relaxed">
          {linkedPatient.weeklySummary}
        </p>
      </div>

      {/* Tips Section */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-lg text-textdark dark:text-dm-text px-1">
          Cómo puedo acompañar
        </h3>
        <div className="flex flex-col gap-2">
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#EAF0E9] dark:border-[#3D4F3D] flex items-center gap-3">
            <span className="text-xl">💌</span>
            <p className="font-medium text-sm text-textdark dark:text-dm-text">Escribile sin esperar respuesta inmediata</p>
          </div>
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#EAF0E9] dark:border-[#3D4F3D] flex items-center gap-3">
            <span className="text-xl">🗣️</span>
            <p className="font-medium text-sm text-textdark dark:text-dm-text">Preguntá cómo estuvo el día, sin presionar</p>
          </div>
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#EAF0E9] dark:border-[#3D4F3D] flex items-center gap-3">
            <span className="text-xl">🫂</span>
            <p className="font-medium text-sm text-textdark dark:text-dm-text">A veces solo estar presente ya ayuda</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full bg-sage text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-sage/90 active:scale-[0.98] transition flex justify-center items-center gap-2"
        >
          <span>💬</span> Enviar mensaje de apoyo
        </button>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full bg-white dark:bg-dm-surface border-2 border-sage text-sage dark:text-sage font-bold py-3.5 rounded-xl hover:bg-sage/5 dark:hover:bg-sage/10 transition active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <span>📄</span> {exportLoading ? 'Generando...' : 'Exportar informe semanal'}
        </button>
      </div>

      {/* Message Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dm-elevated w-full max-w-sm rounded-[20px] p-6 shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-textdark dark:text-dm-text">Enviar apoyo</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-textdark/50 dark:text-dm-muted hover:text-textdark transition"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-medium text-textdark/70 dark:text-dm-muted mb-3">Opciones rápidas:</p>
            <div className="flex flex-col gap-2 mb-4">
              {presetMessages.map((msg, i) => (
                <button
                  key={i}
                  className="bg-softgray/30 dark:bg-dm-surface text-textdark dark:text-dm-text p-3 rounded-lg text-sm text-left hover:bg-sage hover:text-white transition font-medium"
                  onClick={() => setCustomMsg(msg)}
                >
                  "{msg}"
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-textdark/70 dark:text-dm-muted mb-2">Mensaje personalizado:</p>
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Escribe algo lindo..."
              className="w-full bg-softgray/10 dark:bg-dm-surface border border-softgray dark:border-dm-border rounded-xl p-3 text-sm text-textdark dark:text-dm-text focus:outline-none focus:border-sage dark:focus:border-sage resize-none"
              rows={3}
            />

            {msgSent && (
              <p className="mt-3 text-xs text-sage font-medium text-center">Mensaje enviado</p>
            )}
            <button
              onClick={handleSendMessage}
              disabled={!customMsg.trim() || sendingMsg}
              className="mt-5 w-full bg-sage text-white font-bold py-3 rounded-xl hover:bg-sage/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {sendingMsg ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* Compact Crisis Footer */}
      <div className="fixed bottom-16 sm:bottom-0 sm:pb-4 p-3 left-0 right-0 max-w-md mx-auto z-30 pointer-events-none">
        <div className="bg-white/90 dark:bg-dm-elevated/90 backdrop-blur-md rounded-full shadow-lg border border-red-200 dark:border-red-900/50 p-2.5 px-4 pointer-events-auto flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-bold text-red-600 dark:text-red-400">
            <span className="text-[10px] uppercase opacity-60">Líneas de crisis:</span>
            <span>🇦🇷 135</span>
            <span className="opacity-40">•</span>
            <span>🇲🇽 800-290</span>
            <span className="opacity-40">•</span>
            <span>🇨🇴 106</span>
            <span className="opacity-40">•</span>
            <span>🇪🇸 024</span>
          </div>
        </div>
      </div>
    </div>
  )
}
