import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { getVerificationRequest, submitVerification } from '../services/api'

export default function VerifyIdentity() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [request, setRequest] = useState(null)
  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await getVerificationRequest()
        if (!mounted) return
        const data = res.data || res
        setRequest(data)
      } catch (err) {
        if (mounted) setError(err?.message || 'No pudimos cargar la verificación')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSubmit = async () => {
    if (!proof.trim() || !request?.verification_id) return
    setSubmitting(true)
    setError('')
    try {
      const res = await submitVerification({
        verification_id: request.verification_id,
        proof: proof.trim(),
      })
      const data = res.data || res
      setRequest((current) => ({
        ...(current || {}),
        is_verified: Boolean(data.is_verified ?? data.verified),
      }))
    } catch (err) {
      setError(err?.message || 'No pudimos enviar el proof')
    } finally {
      setSubmitting(false)
    }
  }

  const isVerified = Boolean(request?.is_verified)

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-300 p-6 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text hover:bg-softgray/50 transition shadow-sm"
        >
          ←
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#3D4F3D] rounded-3xl p-8 shadow-sm border border-softgray/50 dark:border-dm-border text-center">
        <img
          src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
          alt="BRENSO"
          className="h-8 mx-auto mb-6"
        />

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sage border-r-transparent" />
            <p className="text-sm text-textdark/70 dark:text-dm-muted">Cargando verificación...</p>
          </div>
        ) : isVerified ? (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-sage/15 text-sage flex items-center justify-center text-4xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
              Verificación completada
            </h1>
            <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed">
              Tu identidad ya está verificada con Self Protocol.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="w-full rounded-xl bg-sage px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5"
            >
              Volver al perfil
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
              Verificá tu identidad
            </h1>
            <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed mb-8 px-2">
              {request?.instructions || 'Escaneá el QR con la app Self Protocol para verificar tu identidad.'}
            </p>

            <div className="w-48 h-48 mx-auto bg-sage/10 border-2 border-sage border-dashed rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden">
              {request?.qr_code && String(request.qr_code).startsWith('http') ? (
                <img
                  src={request.qr_code}
                  alt="Self Protocol QR"
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="text-sage text-center">
                  <span className="text-4xl block mb-2">QR</span>
                  <span className="text-xs font-semibold opacity-70">Self Protocol</span>
                </div>
              )}
            </div>

            {request?.verification_url && (
              <a
                href={request.verification_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sage font-bold text-sm hover:underline mb-8"
              >
                Abrir Self Protocol →
              </a>
            )}

            <div className="text-left space-y-4 mb-8">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-sm text-textdark dark:text-dm-text font-medium">Abrí la app Self Protocol</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-sm text-textdark dark:text-dm-text font-medium">Escaneá el código QR o abrí el link</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-sm text-textdark dark:text-dm-text font-medium">Pegá tu proof manual si la app te lo muestra</p>
              </div>
            </div>

            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Pegá aquí el proof de Self Protocol"
              className="w-full min-h-28 rounded-2xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none focus:border-sage transition mb-4"
            />

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-left">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !proof.trim()}
              className="w-full rounded-xl bg-sage px-6 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar proof'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
