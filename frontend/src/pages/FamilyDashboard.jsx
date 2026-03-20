import { useTranslation } from 'react-i18next'

export default function FamilyDashboard() {
  const { t } = useTranslation()

  // Mock patient linked to this family member
  const linkedPatient = {
    name: 'María García',
    status: 'ok', // 'ok' | 'alert'
    recentAlerts: [
      { id: 1, date: 'Hoy, 10:30', message: 'Señal de ansiedad detectada en el check-in matutino.' }
    ]
  }

  return (
    <div className="animate-fade-in-page space-y-6 pb-32">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        {t('family_dashboard.title')}
      </h1>

      {/* Patient Status Card */}
      <div className={`rounded-2xl p-6 shadow-soft transition-colors ${
        linkedPatient.status === 'ok' 
          ? 'bg-sage/10 dark:bg-sage/20 border-2 border-sage' 
          : 'bg-red-50 dark:bg-red-900/30 border-2 border-red-400'
      }`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-textdark/60 dark:text-dm-muted">
          {t('family_dashboard.linked_status')}
        </h2>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xl font-bold text-textdark dark:text-dm-text">
            {linkedPatient.name}
          </p>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            linkedPatient.status === 'ok'
              ? 'bg-sage text-white'
              : 'bg-red-500 text-white'
          }`}>
            {linkedPatient.status === 'ok' ? t('family_dashboard.status_ok') : t('family_dashboard.status_alert')}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="space-y-3">
        <h3 className="font-bold text-textdark dark:text-dm-text px-1">
          {t('family_dashboard.recent_alerts')}
        </h3>
        {linkedPatient.recentAlerts.length === 0 ? (
          <p className="text-sm text-textdark/60 dark:text-dm-muted bg-white dark:bg-dm-surface p-4 rounded-xl shadow-soft">
            No hay alertas recientes.
          </p>
        ) : (
          <div className="bg-white dark:bg-dm-surface rounded-xl shadow-soft divide-y divide-softgray dark:divide-dm-border">
            {linkedPatient.recentAlerts.map(alert => (
              <div key={alert.id} className="p-4">
                <p className="text-xs font-semibold text-textdark/50 dark:text-dm-muted">{alert.date}</p>
                <p className="text-sm text-textdark dark:text-dm-text mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actionable Tips */}
      <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-soft space-y-4">
        <h3 className="font-bold text-textdark dark:text-dm-text flex items-center gap-2">
          <span>💡</span> {t('family_dashboard.how_to_help')}
        </h3>
        <ul className="space-y-3 text-sm text-textdark/80 dark:text-dm-text/80">
          <li className="flex gap-2">
            <span className="text-sage font-bold">•</span>
            {t('family_dashboard.tip1')}
          </li>
          <li className="flex gap-2">
            <span className="text-sage font-bold">•</span>
            {t('family_dashboard.tip2')}
          </li>
        </ul>
      </div>

      {/* Crisis Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-red-50 dark:bg-[#3b1c1c] border-t-2 border-red-200 dark:border-red-900/50 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
        <div className="max-w-xl mx-auto">
          <h2 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
            <span>🚨</span> {t('help.crisis_title')}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-red-700/80 dark:text-red-300/80">
            <span>{t('help.crisis_ar')}</span>
            <span>{t('help.crisis_mx')}</span>
            <span>{t('help.crisis_es')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
