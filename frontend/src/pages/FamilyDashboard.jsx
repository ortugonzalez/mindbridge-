import { useState, useEffect } from 'react'
import { getFamilyPatientStatus, getFamilyWeeklyReport, notifyPatient } from '../services/api'

const TIPS = {
  green: [
    'Seguí estando presente sin presionar',
    "Un mensaje simple como 'Pensé en vos hoy' ayuda",
    'Celebrá con ella los días que hace check-in',
  ],
  yellow: [
    'Escribile sin esperar respuesta inmediata',
    'Preguntá cómo estuvo el día, sin presionar',
    'Proponé hacer algo juntos, algo simple',
  ],
  orange: [
    'Escribile sin esperar respuesta inmediata',
    'Preguntá cómo estuvo el día, sin presionar',
    'Proponé hacer algo juntos, algo simple',
  ],
  red: [
    'Comunicate con ella hoy si podés',
    'Escuchá sin juzgar ni dar consejos',
    'Si ves riesgo real, llamá al 135 con ella',
  ],
}

const ALERT_UI = {
  green: {
    bg: 'bg-[#F0FDF4]', text: 'text-[#166534]',
    icon: '🌱', title: 'Todo tranquilo',
  },
  yellow: {
    bg: 'bg-[#FEFCE8]', text: 'text-[#854D0E]',
    icon: '🌼', title: 'Puede necesitar atención',
  },
  orange: {
    bg: 'bg-[#FFF7ED]', text: 'text-[#9A3412]',
    icon: '🍂', title: 'Te recomendamos estar cerca',
  },
  red: {
    bg: 'bg-[#FEF2F2]', text: 'text-[#991B1B]',
    icon: '❤️', title: 'Necesita apoyo hoy',
  },
}

export default function FamilyDashboard() {
  const [helpOpen, setHelpOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    getFamilyPatientStatus()
      .then(res => setStatus(res.data || res))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await getFamilyWeeklyReport()
      const report = res.data || res
      const content = `
        <html><head><style>
          body { font-family: Inter, sans-serif; padding: 40px; color: #2D2D2D; }
          h1 { color: #7C9A7E; font-weight: 400; }
          .label { color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 12px; }
          .value { font-size: 16px; margin-bottom: 8px; }
          hr { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
        </style></head><body>
          <h1>🌱 Informe de bienestar — BRESO</h1>
          <p><em>Generado por Soledad para acompañamiento familiar</em></p>
          <div class="label">Semana</div><div class="value">${report.week || '—'}</div>
          <div class="label">Nivel de alerta</div><div class="value">${report.alert_level || 'verde'}</div>
          <div class="label">Resumen</div><div class="value">${report.summary || 'Sin datos disponibles.'}</div>
          <div class="label">Recomendación</div><div class="value">${report.recommendation || '—'}</div>
          <hr/>
          <p style="color:#9CA3AF;font-size:12px;">Generado por Soledad — BRESO. Este informe no constituye un diagnóstico clínico.</p>
        </body></html>`
      const w = window.open('', '_blank')
      w.document.write(content)
      w.document.close()
      w.print()
    } catch { window.print() }
    setExportLoading(false)
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-in-page flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
          <p className="text-textdark/50 dark:text-dm-muted text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  // ── Not linked ───────────────────────────────────────────
  if (!status || status.linked === false) {
    return (
      <div className="animate-fade-in-page flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
        <span className="text-6xl">🤝</span>
        <h2 className="text-xl font-bold text-textdark dark:text-dm-text">
          Todavía no estás vinculado/a
        </h2>
        <p className="text-sm text-textdark/60 dark:text-dm-muted leading-relaxed max-w-xs">
          Para ver el bienestar de alguien cercano, primero necesitás que te agreguen como contacto de confianza.
        </p>
        <button
          onClick={() => setHelpOpen(true)}
          className="bg-sage text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-sage/90 active:scale-[0.98] transition"
        >
          Cómo funciona
        </button>

        {helpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dm-elevated w-full max-w-sm rounded-[20px] p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-textdark dark:text-dm-text">Cómo vincularse</h3>
                <button onClick={() => setHelpOpen(false)} className="text-textdark/50 dark:text-dm-muted">✕</button>
              </div>
              <ol className="space-y-3 text-sm text-textdark/80 dark:text-dm-muted list-decimal list-inside leading-relaxed">
                <li>La persona que usás BRESO debe ir a <strong>Contactos</strong> en su app.</li>
                <li>Agrega tu email como contacto de confianza.</li>
                <li>Vas a recibir un email de invitación.</li>
                <li>Aceptá la invitación y este panel se activará.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Linked ───────────────────────────────────────────────
  const level = status.alert_level || 'green'
  const alertUI = ALERT_UI[level] || ALERT_UI.green
  const tips = TIPS[level] || TIPS.green
  const patientName = status.patient_name || 'tu ser querido'
  const summary = status.weekly_summary || status.summary || 'Sin datos esta semana.'

  return (
    <div className="animate-fade-in-page space-y-6 pb-28 max-w-lg mx-auto">

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
          Acompañando a {patientName}
        </h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-base leading-none opacity-60">🔒</span>
          <p className="text-xs text-textdark/55 dark:text-dm-muted font-medium">
            Sus conversaciones son privadas
          </p>
        </div>
      </div>

      {/* Alert Status Card */}
      <div className={`rounded-[16px] p-6 shadow-sm ${alertUI.bg}`}>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="text-4xl mb-1">{alertUI.icon}</div>
          <h2 className={`text-xl font-bold tracking-tight ${alertUI.text}`}>
            {alertUI.title}
          </h2>
          <p className={`text-sm font-medium ${alertUI.text} opacity-80`}>
            {summary}
          </p>
          {level === 'red' && (
            <a
              href="tel:135"
              className="mt-3 bg-red-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md hover:bg-red-700 active:scale-[0.98] transition text-sm"
            >
              Llamar al 135
            </a>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-white dark:bg-dm-surface border border-softgray dark:border-dm-border p-4 rounded-xl flex items-center shadow-sm">
          <p className="text-sm font-bold text-textdark dark:text-dm-text leading-tight">{status.checkins_this_week ?? '0'} check-ins esta semana</p>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="space-y-3 pt-1">
        <h3 className="font-bold text-lg text-textdark dark:text-dm-text px-1">
          Acciones recomendadas para acompañar
        </h3>
        <div className="flex flex-col gap-2">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border-l-4 border-[#7C9A7E] flex items-start gap-3"
            >
              <p className="text-sm font-medium text-textdark dark:text-dm-text leading-snug">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="w-full bg-white dark:bg-dm-surface border-2 border-sage text-sage font-bold py-3.5 rounded-xl hover:bg-sage/5 transition active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-60"
        >
          <span>📄</span> {exportLoading ? 'Generando...' : 'Exportar resumen semanal (PDF)'}
        </button>
      </div>

      {/* Crisis Footer */}
      <div className="fixed bottom-16 sm:bottom-0 sm:pb-4 p-3 left-0 right-0 max-w-md mx-auto z-30 pointer-events-none">
        <div className="bg-white/90 dark:bg-dm-elevated/90 backdrop-blur-md rounded-full shadow-lg border border-red-200 dark:border-red-900/50 p-2.5 px-4 pointer-events-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-bold text-red-600 dark:text-red-400">
          <span className="text-[10px] uppercase opacity-60">Líneas de crisis:</span>
          <span>🇦🇷 135</span><span className="opacity-40">•</span>
          <span>🇲🇽 800-290</span><span className="opacity-40">•</span>
          <span>🇨🇴 106</span><span className="opacity-40">•</span>
          <span>🇪🇸 024</span>
        </div>
      </div>
    </div>
  )
}
