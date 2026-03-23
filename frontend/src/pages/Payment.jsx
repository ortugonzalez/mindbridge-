import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

const PLAN_INFO = {
  essential: {
    name: 'Esencial',
    price: '$5 USDT / mes',
    color: '#7C9A7E',
    features: ['Check-ins ilimitados', 'Historial completo', '1 contacto de confianza', 'Propuestas personalizadas'],
  },
  premium: {
    name: 'Premium',
    price: '$12 USDT / mes',
    color: '#C4962A',
    features: ['Todo lo esencial', '2 contactos de confianza', 'Coordinación profesional', 'Reporte mensual'],
  },
}

async function createPaymentLink(plan) {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) return null
  try {
    const token = localStorage.getItem('breso_token') || ''
    const res = await fetch(`${base}/payments/create-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export default function Payment() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') || 'essential'
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.essential

  const [loading, setLoading] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [renewalDate, setRenewalDate] = useState('')
  const [error, setError] = useState('')
  const [emailFallback, setEmailFallback] = useState(false)

  useEffect(() => {
    // Check if returning from successful payment
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setConfirmed(true)
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))
    }
  }, [])

  const handlePay = async () => {
    setLoading(true)
    setError('')
    const result = await createPaymentLink(plan)
    setLoading(false)
    if (result?.payment_url) {
      setPaymentUrl(result.payment_url)
      window.open(result.payment_url, '_blank')
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))
      try { localStorage.setItem('breso_selected_plan', plan) } catch { }
    } else {
      // FIX 8: backend unavailable → show email fallback instead of simulating success
      setEmailFallback(true)
    }
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-up max-w-[480px] mx-auto w-full px-4">
        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2 shadow-sm">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text">Plan {planInfo.name} activado</h2>
          <p className="text-textdark/60 dark:text-dm-muted">Tu red de apoyo ahora es más fuerte.</p>
        </div>
        <div className="w-full bg-white dark:bg-dm-surface p-5 rounded-2xl border border-softgray dark:border-dm-border mb-4 shadow-sm text-center">
          <p className="text-sm font-medium text-textdark dark:text-dm-text">Próxima renovación</p>
          <p className="text-lg font-bold text-textdark dark:text-dm-text mt-1">{renewalDate}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="w-full rounded-xl bg-sage px-6 py-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        >
          Ir al Inicio
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col animate-fade-up max-w-[480px] mx-auto w-full px-2 pb-12">
      {/* Back */}
      <div className="mb-6 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-textdark/50 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text transition-colors"
        >
          <span>←</span> Volver
        </button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">Resumen de pago</h1>
          <p className="text-textdark/60 dark:text-dm-muted text-sm border-b border-softgray dark:border-dm-border pb-4">
            Estás a un paso de activar tus beneficios.
          </p>
        </div>

        {/* Plan summary */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-sm border border-softgray dark:border-dm-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10" style={{ backgroundColor: planInfo.color }}></div>
          <div className="relative z-10 flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-textdark/50 dark:text-dm-muted mb-1">Plan Seleccionado</p>
              <h2 className="text-2xl font-bold text-textdark dark:text-dm-text">{planInfo.name}</h2>
            </div>
            <span className="text-xl font-black" style={{ color: planInfo.color }}>{planInfo.price.split(' ')[0]}</span>
          </div>
          <ul className="space-y-2 mb-4">
            {planInfo.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-textdark/80 dark:text-dm-text/90">
                <span style={{ color: planInfo.color }} className="text-sm mt-0.5 font-bold">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* FIX 8: email fallback when backend unavailable */}
        {emailFallback && (
          <div className="rounded-xl border border-sage/40 bg-sage/5 p-4 text-sm text-textdark/80 dark:text-dm-text leading-relaxed">
            Para activar tu plan, envianos un email a{' '}
            <a href={`mailto:pagos@breso.app?subject=Plan ${planInfo.name}`} className="font-semibold text-sage underline">
              pagos@breso.app
            </a>{' '}
            con el asunto <span className="font-semibold">&#34;Plan {planInfo.name}&#34;</span>.
          </div>
        )}

        {/* Action Area */}
        <div className="pt-4 space-y-4">
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-[#7C9A7E] px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {/* Celo Mini Logo */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#7C9A7E]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-12h4v2h-4v-2zm0 4h4v6h-4v-6z" />
              </svg>
            </div>
            {loading ? 'Procesando pago...' : 'Pagar con USDT en Celo'}
          </button>

          <div className="flex flex-col items-center space-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-textdark/50 dark:text-dm-muted">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Pago procesado de forma segura en Celo blockchain.</span>
            </div>
            <p className="text-[11px] text-textdark/40 dark:text-dm-muted/60 text-center px-4 leading-relaxed">
              Próxima renovación automática: 20 abril 2026. Cancela en cualquier momento. Al continuar aceptás los términos de servicio de BRESO.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
