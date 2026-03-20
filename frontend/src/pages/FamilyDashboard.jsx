import { useTranslation } from 'react-i18next'

export default function FamilyDashboard() {
  const { t } = useTranslation()

  // Mock patient linked to this family member
  const linkedPatient = {
    name: 'María García',
    status: 'ok', // 'ok' | 'alert'
    recentAlerts: [
      { id: 1, date: 'Hoy, 10:30', message: 'Señal de ansiedad detectada en el check-in matutino.' },
      { id: 2, date: 'Ayer, 18:15', message: 'Actividad inusual durante la tarde.' },
      { id: 3, date: 'Hace 2 días, 09:00', message: 'No completó el registro de sueño.' }
    ]
  }

  return (
    <div className="animate-fade-in-page space-y-8 pb-32">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        Panel de {linkedPatient.name}
      </h1>

      {/* Patient Status Card */}
      <div className={`rounded-2xl p-6 shadow-sm transition-colors border-l-4 ${linkedPatient.status === 'ok'
          ? 'bg-[#E8F3E8] dark:bg-[#2D3B2D] border-[#7C9A7E]'
          : 'bg-[#FFF8E7] dark:bg-amber-900/30 border-[#FBBF24]'
        }`}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#4A5E4A] dark:text-[#9CAF9C]">
            Estado actual
          </p>
          <div className="flex items-center gap-3">
            {linkedPatient.status === 'ok' ? (
              <div className="h-3 w-3 rounded-full bg-[#7C9A7E] animate-pulse shadow-[0_0_8px_rgba(124,154,126,0.8)]" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-[#FBBF24] animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            )}
            <p className={`text-2xl font-bold tracking-tight ${linkedPatient.status === 'ok' ? 'text-[#3D4F3D] dark:text-[#E8EDE8]' : 'text-[#92400E] dark:text-[#FDE68A]'
              }`}>
              {linkedPatient.status === 'ok' ? 'Sin alertas recientes' : 'Puede necesitar apoyo'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Alerts Timeline */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-textdark dark:text-dm-text px-1">
          Últimas alertas
        </h3>
        {linkedPatient.recentAlerts.length === 0 ? (
          <p className="text-sm text-textdark/60 dark:text-dm-muted bg-white dark:bg-dm-surface p-4 rounded-xl shadow-soft">
            No hay alertas recientes.
          </p>
        ) : (
          <div className="relative border-l-2 border-[#7C9A7E]/30 dark:border-[#7C9A7E]/40 ml-4 space-y-6 pb-2 mt-2">
            {linkedPatient.recentAlerts.map(alert => (
              <div key={alert.id} className="relative pl-6 transition-all hover:translate-x-1">
                <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-white dark:bg-dm-surface border-2 border-[#7C9A7E]"></div>
                <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#E5E7EB] dark:border-dm-border">
                  <p className="text-xs font-semibold text-[#7C9A7E] dark:text-[#9CAF9C] mb-1">{alert.date}</p>
                  <p className="text-sm text-textdark dark:text-dm-text leading-relaxed">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actionable Tips */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-textdark dark:text-dm-text px-1 flex items-center gap-2">
          <span>💡</span> Cómo puedo ayudar
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#E5E7EB] dark:border-dm-border flex flex-col gap-3 transition-transform hover:-translate-y-1">
            <div className="h-10 w-10 rounded-full bg-[#E8F3E8] dark:bg-[#3D4F3D] text-[#4A5E4A] dark:text-[#E8EDE8] flex items-center justify-center text-xl shadow-sm">👂</div>
            <p className="font-semibold text-sm text-textdark dark:text-dm-text">Escuchá sin juzgar</p>
          </div>
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#E5E7EB] dark:border-dm-border flex flex-col gap-3 transition-transform hover:-translate-y-1">
            <div className="h-10 w-10 rounded-full bg-[#E8F3E8] dark:bg-[#3D4F3D] text-[#4A5E4A] dark:text-[#E8EDE8] flex items-center justify-center text-xl shadow-sm">💬</div>
            <p className="font-semibold text-sm text-textdark dark:text-dm-text">Preguntá cómo está</p>
          </div>
          <div className="bg-white dark:bg-dm-surface p-4 rounded-xl shadow-sm border border-[#E5E7EB] dark:border-dm-border flex flex-col gap-3 transition-transform hover:-translate-y-1">
            <div className="h-10 w-10 rounded-full bg-[#E8F3E8] dark:bg-[#3D4F3D] text-[#4A5E4A] dark:text-[#E8EDE8] flex items-center justify-center text-xl shadow-sm">🤝</div>
            <p className="font-semibold text-sm text-textdark dark:text-dm-text">Recordale que no está solo/a</p>
          </div>
        </div>
      </div>

      {/* Crisis Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-red-50 dark:bg-[#3b1c1c] border-t border-red-200 dark:border-red-900/50 p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-red-800 dark:text-red-400 flex items-center gap-1.5 mb-1">
              <span>🚨</span> Líneas de Crisis (24/7)
            </h2>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-red-700/80 dark:text-red-300/80">
              <span>AR: 135</span>
              <span className="opacity-50">•</span>
              <span>MX: 800 911 2000</span>
              <span className="opacity-50">•</span>
              <span>ES: 024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
