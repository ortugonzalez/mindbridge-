import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ProfessionalDashboard() {
  const { t } = useTranslation()

  // Mock patient list
  const [patients] = useState([
    {
      id: 1,
      name: 'María García',
      lastActivity: 'Hoy, 10:30',
      alertLevel: 'high', // 'low' | 'medium' | 'high'
      summary: 'Patrones de sueño irregular e indicadores de ansiedad elevados en la última semana.'
    },
    {
      id: 2,
      name: 'Juan Pérez',
      lastActivity: 'Ayer, 18:00',
      alertLevel: 'low',
      summary: 'Reportes consistentes y estables. Check-in diario completado.'
    }
  ])

  const getAlertColor = (level) => {
    switch(level) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
      case 'low': return 'bg-sage/20 text-sage'
      default: return 'bg-softgray text-textdark'
    }
  }

  return (
    <div className="animate-fade-in-page space-y-6">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        {t('professional_dashboard.title')}
      </h1>

      <div className="space-y-4">
        <h2 className="text-sm font-bold tracking-wider text-textdark/60 dark:text-dm-muted uppercase px-1">
          {t('professional_dashboard.patients_list')}
        </h2>

        {patients.map(patient => (
          <div key={patient.id} className="bg-white dark:bg-dm-surface p-5 rounded-2xl shadow-soft space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-textdark dark:text-dm-text">{patient.name}</h3>
                <p className="text-xs text-textdark/60 dark:text-dm-muted mt-0.5">
                  {t('professional_dashboard.last_activity')}: {patient.lastActivity}
                </p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getAlertColor(patient.alertLevel)}`}>
                {t(`professional_dashboard.${patient.alertLevel}`)}
              </div>
            </div>

            <div className="pt-3 border-t border-softgray dark:border-dm-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-textdark/60 dark:text-dm-muted mb-1.5">
                {t('professional_dashboard.wellness_summary')}
              </p>
              <p className="text-sm text-textdark/80 dark:text-dm-text/80 leading-relaxed">
                {patient.summary}
              </p>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button className="text-sm font-medium text-sage hover:underline">
                Ver historial completo →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
