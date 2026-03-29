import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getMyPatients } from '../services/api'

function formatSince(value, language = 'es-AR') {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function ProfessionalDashboard() {
  const { t, i18n } = useTranslation()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await getMyPatients()
        if (!mounted) return
        const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])
        setPatients(items)
      } catch (err) {
        if (mounted) setError(err?.message || 'No pudimos cargar tus pacientes')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="animate-fade-in-page space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
            Mis pacientes
          </h1>
          <p className="mt-1 text-sm text-textdark/60 dark:text-dm-muted">
            Vista segura y resumida. No se expone historial clínico detallado todavía.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage border-r-transparent" />
          <p className="mt-4 text-sm text-textdark/60 dark:text-dm-muted">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-dm-surface rounded-2xl border border-dashed border-[#E5E7EB] dark:border-dm-border">
              <svg className="w-20 h-20 mb-5 text-[#8BA989] opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg mb-2">
                No tenés pacientes vinculados aún
              </p>
              <p className="text-textdark/50 dark:text-dm-muted text-sm mb-6 max-w-xs">
                Cuando se active una relación profesional, aparecerá acá con datos resumidos y privacidad cuidada.
              </p>
            </div>
          ) : (
            patients.map((patient, index) => (
              <div key={patient.relationship_id || patient.patient_id || index} className="bg-white dark:bg-dm-surface p-6 rounded-2xl shadow-sm border border-[#E5E7EB] dark:border-dm-border space-y-4 transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#FAF8F5] dark:bg-[#3D4F3D] flex items-center justify-center text-[#4A5E4A] dark:text-[#E8EDE8] text-xl font-bold shadow-soft">
                      {String(patient.patient_name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-textdark dark:text-dm-text">
                        {patient.patient_name || 'Paciente vinculado'}
                      </h3>
                      <p className="text-sm text-textdark/60 dark:text-dm-muted mt-0.5">
                        Relación: <span className="font-medium text-textdark/80 dark:text-dm-text/80">{patient.relationship_type || 'professional'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-[#FFF8E7] dark:bg-amber-900/30 text-[#92400E] dark:text-[#FDE68A] px-3 py-1.5 rounded-full text-sm font-semibold border border-[#FBBF24]/30 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-[#FBBF24] animate-pulse"></div>
                    Seguimiento seguro
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB] dark:border-dm-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4A5E4A] dark:text-[#9CAF9C] mb-2">
                    Acceso permitido
                  </p>
                  <p className="text-sm text-textdark/80 dark:text-dm-text/80 leading-relaxed bg-[#FAF8F5] dark:bg-dm-bg p-3 rounded-xl border border-softgray/50 dark:border-dm-border/50">
                    Vista limitada a metadatos. Vinculado desde {formatSince(patient.since, i18n.language || 'es-AR') || 'fecha desconocida'}.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button className="text-sm font-semibold text-[#7C9A7E] hover:text-[#4A5E4A] dark:hover:text-[#E8EDE8] transition-colors flex items-center gap-1">
                    Ver coordinación <span>→</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
