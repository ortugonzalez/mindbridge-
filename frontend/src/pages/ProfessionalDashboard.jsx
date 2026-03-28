import { useEffect, useState } from 'react'
import { getMyPatients } from '../services/api'

function formatSince(value) {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function ProfessionalDashboard() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadPatients = async () => {
      setLoading(true)
      const result = await getMyPatients()
      if (!active) return
      setPatients(Array.isArray(result.data) ? result.data : [])
      setLoading(false)
    }

    loadPatients()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="animate-fade-in-page space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
          Mis pacientes
        </h1>
        <div className="px-5 py-2.5 bg-sage/10 text-sage rounded-xl text-sm font-semibold">
          {patients.length} vinculados
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-dm-surface rounded-2xl border border-dashed border-[#E5E7EB] dark:border-dm-border">
            <div className="w-8 h-8 border-4 border-sage border-t-transparent animate-spin rounded-full mb-4" />
            <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg">
              Cargando pacientes...
            </p>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-dm-surface rounded-2xl border border-dashed border-[#E5E7EB] dark:border-dm-border">
            <svg className="w-20 h-20 mb-5 text-[#8BA989] opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-textdark/70 dark:text-dm-text/80 font-medium text-lg mb-2">
              No tenés pacientes vinculados aún
            </p>
            <p className="text-textdark/50 dark:text-dm-muted text-sm mb-6 max-w-xs">
              Cuando un paciente te vincule, lo vas a ver reflejado acá.
            </p>
          </div>
        ) : (
          patients.map((patient, index) => (
            <div key={patient.relationship_id || patient.patient_id || index} className="bg-white dark:bg-dm-surface p-6 rounded-2xl shadow-sm border border-[#E5E7EB] dark:border-dm-border space-y-4 transition-transform hover:-translate-y-1">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#FAF8F5] dark:bg-[#3D4F3D] flex items-center justify-center text-[#4A5E4A] dark:text-[#E8EDE8] text-xl font-bold shadow-soft">
                    {(patient.patient_name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-textdark dark:text-dm-text">{patient.patient_name || 'Paciente'}</h3>
                    <p className="text-sm text-textdark/60 dark:text-dm-muted mt-0.5">
                      Vinculado desde <span className="font-medium text-textdark/80 dark:text-dm-text/80">{formatSince(patient.since)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#EFF6EF] dark:bg-sage/10 text-[#4A7A4C] dark:text-sage px-3 py-1.5 rounded-full text-sm font-semibold border border-sage/20 shadow-sm">
                  {patient.relationship_type === 'professional' ? 'Profesional' : 'Apoyo'}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] dark:border-dm-border">
                <p className="text-xs font-bold uppercase tracking-wider text-[#4A5E4A] dark:text-[#9CAF9C] mb-2">
                  Estado de vínculo
                </p>
                <p className="text-sm text-textdark/80 dark:text-dm-text/80 leading-relaxed bg-[#FAF8F5] dark:bg-dm-bg p-3 rounded-xl border border-softgray/50 dark:border-dm-border/50">
                  Paciente conectado a tu panel profesional. El backend todavía no expone historial clínico detallado para este rol, así que acá mostramos solo metadatos seguros del vínculo.
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
