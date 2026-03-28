import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import {
  getCurrentUserAccount,
  getIdentityVerificationRequest,
  submitIdentityVerification,
} from '../services/api'

export default function VerifyIdentity() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [request, setRequest] = useState(null)
  const [proof, setProof] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    let active = true

    const loadVerification = async () => {
      setLoading(true)
      setError('')

      const account = await getCurrentUserAccount()
      if (!active) return

      if (account.data?.identity_verified) {
        setVerified(true)
        setLoading(false)
        return
      }

      const result = await getIdentityVerificationRequest()
      if (!active) return

      if (!result.data) {
        setError('No pudimos iniciar la verificación en este momento.')
        setLoading(false)
        return
      }

      setRequest(result.data)
      setLoading(false)
    }

    loadVerification()
    return () => {
      active = false
    }
  }, [])

  const qrImageSrc = request?.qr_code
    ? request.qr_code.startsWith('data:image')
      ? request.qr_code
      : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(request.qr_code)}`
    : ''

  const handleProofSubmit = async () => {
    if (!request?.verification_id || !proof.trim()) return

    setSubmitting(true)
    setError('')
    const result = await submitIdentityVerification({
      verification_id: request.verification_id,
      proof: proof.trim(),
    })

    if (result.data?.verified) {
      setVerified(true)
    } else {
      setError('La prueba no pudo validarse todavía.')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-300 p-6 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <button
          type="button"
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

        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
          Verificá tu identidad
        </h1>
        <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed mb-8 px-2">
          Self Protocol asegura que las personas detrás de las cuentas sean reales y únicas. No vendemos ni mostramos tus datos personales a nadie, tu identidad se encripta y se guarda solo en tu dispositivo de forma completamente confidencial.
        </p>

        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-sage border-t-transparent animate-spin rounded-full mb-4" />
            <p className="text-sm text-textdark/70 dark:text-dm-muted">Preparando verificación...</p>
          </div>
        ) : verified ? (
          <div className="py-6">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-sage/15 text-sage flex items-center justify-center text-4xl">
              ✓
            </div>
            <p className="text-base font-semibold text-textdark dark:text-dm-text mb-2">
              Tu identidad ya está verificada
            </p>
            <p className="text-sm text-textdark/70 dark:text-dm-muted">
              Ya podés seguir usando la plataforma con este chequeo completado.
            </p>
          </div>
        ) : (
          <>
            <div className="w-56 h-56 mx-auto bg-sage/10 border-2 border-sage border-dashed rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
              {qrImageSrc ? (
                <img
                  src={qrImageSrc}
                  alt="Código QR de verificación"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-sage text-center">
                  <span className="text-4xl block mb-2">QR</span>
                  <span className="text-xs font-semibold opacity-70">Self Protocol</span>
                </div>
              )}
            </div>

            <a
              href={request?.verification_url || 'https://app.ai.self.xyz'}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sage font-bold text-sm hover:underline mb-4"
            >
              Abrir Self Protocol →
            </a>

            {request?.instructions && (
              <p className="text-xs text-textdark/60 dark:text-dm-muted mb-6">
                {request.instructions}
              </p>
            )}

            <div className="text-left space-y-3 mb-8">
              <label className="block text-sm font-semibold text-textdark dark:text-dm-text">
                Proof manual
              </label>
              <textarea
                value={proof}
                onChange={(event) => setProof(event.target.value)}
                rows={4}
                placeholder="Si Self Protocol te entrega un proof, pegalo acá para validarlo."
                className="w-full rounded-2xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg px-4 py-3 text-sm text-textdark dark:text-dm-text outline-none focus:border-sage transition"
              />
              <button
                type="button"
                onClick={handleProofSubmit}
                disabled={submitting || !proof.trim()}
                className="w-full bg-sage text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? 'Validando...' : 'Enviar proof'}
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 font-medium mb-6">
            {error}
          </p>
        )}

        <div className="text-left space-y-4">
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Descargá la app Self Protocol</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Escaneá el código QR</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Seguí las instrucciones en la app</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Tu identidad queda verificada en BRENSO</p>
          </div>
        </div>
      </div>
    </div>
  )
}
