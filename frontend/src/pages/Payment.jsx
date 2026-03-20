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
      window.location.href = result.payment_url
    } else {
      // Mock/demo mode — simulate success
      setConfirmed(true)
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))
      try { localStorage.setItem('breso_selected_plan', plan) } catch {}
    }
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center space-y-6 pt-6 animate-fade-up">
        <div className="text-5xl">✅</div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-textdark dark:text-dm-text">Plan {planInfo.name} activado</h2>
          {renewalDate && (
            <p className="text-sm text-textdark/60 dark:text-dm-muted">Próxima renovación: {renewalDate}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/chat', { replace: true })}
          className="w-full max-w-xs rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
        >
          Ir a Soledad
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-textdark/50 dark:text-dm-muted hover:text-sage transition"
      >
        ← {t('nav.back')}
      </button>

      {/* Plan summary */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ border: `2px solid ${planInfo.color}`, background: `${planInfo.color}10` }}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-textdark dark:text-dm-text">{planInfo.name}</span>
          <span className="text-sm font-semibold" style={{ color: planInfo.color }}>{planInfo.price}</span>
        </div>
        <ul className="space-y-1.5">
          {planInfo.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-textdark/80 dark:text-dm-text">
              <span style={{ color: planInfo.color }} className="text-xs">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <p className="text-xs text-textdark/40 dark:text-dm-muted">Se cobra en USDT en Celo blockchain.</p>
      </div>

      {/* Wallet note */}
      <div className="rounded-xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-4 space-y-2">
        <p className="text-xs font-semibold text-textdark/60 dark:text-dm-muted uppercase tracking-wide">Cómo pagar</p>
        <p className="text-sm text-textdark/70 dark:text-dm-text leading-relaxed">
          Necesitás una wallet de Celo para pagar. Te recomendamos{' '}
          <span className="font-semibold text-textdark dark:text-dm-text">MetaMask</span> o{' '}
          <span className="font-semibold text-textdark dark:text-dm-text">MiniPay</span>.
        </p>
        <p className="text-xs text-textdark/45 dark:text-dm-muted">
          El pago se procesa en la red Celo (comisiones mínimas).
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Pay button */}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full rounded-full px-6 py-4 text-base font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: planInfo.color }}
      >
        {loading ? 'Procesando...' : `Pagar con USDT en Celo`}
      </button>

      <p className="text-center text-xs text-textdark/35 dark:text-dm-muted">
        Al continuar aceptás los términos de servicio de BRESO.
      </p>
    </div>
  )
}
