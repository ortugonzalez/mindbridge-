import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

export default function Payment() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') || 'essential'

  const PLAN_INFO = {
    essential: {
      name: t('payment.plans.essential.name'),
      price: t('payment.plans.essential.price'),
      amountUSD: 5,
      color: '#7C9A7E',
      features: t('payment.plans.essential.features', { returnObjects: true }),
    },
    premium: {
      name: t('payment.plans.premium.name'),
      price: t('payment.plans.premium.price'),
      amountUSD: 12,
      color: '#C4962A',
      features: t('payment.plans.premium.features', { returnObjects: true }),
    },
  }
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.essential

  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [renewalDate, setRenewalDate] = useState('')
  const [error, setError] = useState('')
  const [hasMetaMask, setHasMetaMask] = useState(false)
  const [paymentCurrency, setPaymentCurrency] = useState('USDT')

  useEffect(() => {
    setHasMetaMask(typeof window !== 'undefined' && Boolean(window.ethereum))
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true)
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))
    }
  }, [])

  const handlePayment = async () => {
    setError('')
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || localStorage.getItem('breso_token') || ''

      const res = await fetch(`${BASE_URL}/payments/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, currency: paymentCurrency }),
      })
      const data = await res.json()

      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))

      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
        // Poll for payment completion every 3s
        const pollInterval = setInterval(async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession()
            const tok = sessionData.session?.access_token || localStorage.getItem('breso_token') || ''
            const statusRes = await fetch(`${BASE_URL}/payments/status`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            const statusData = await statusRes.json()
            if (statusData.plan === 'essential' || statusData.plan === 'premium') {
              clearInterval(pollInterval)
              try { localStorage.setItem('breso_selected_plan', statusData.plan) } catch {}
              setPaymentSuccess(true)
            }
          } catch {}
        }, 3000)
        setLoading(false)
        return
      } else {
        try { localStorage.setItem('breso_selected_plan', plan) } catch {}
        setPaymentSuccess(true)
      }
    } catch {
      setError('El pago por Celo Blockchain requiere tener instalada la wallet de MetaMask u Opera Crypto Browser en tu dispositivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm("¿Seguro que querés cancelar tu plan? Podrás usarlo hasta que termine el período actual.")) return
    
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || localStorage.getItem('breso_token') || ''
      await fetch(`${BASE_URL}/payments/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      alert("Tu suscripción fue cancelada correctamente.")
      try { localStorage.removeItem('breso_selected_plan') } catch {}
      setPaymentSuccess(false)
    } catch {
      alert("Error al cancelar. Intentá más tarde.")
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (paymentSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-up max-w-[480px] mx-auto w-full px-4">
        <div className="h-24 w-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2 shadow-sm animate-bounce">
          <span className="text-5xl">✅</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text">{t('payment.successTitle', { plan: planInfo.name })}</h2>
          <p className="text-sm font-medium text-sage">{t('payment.successCashback')}</p>
        </div>
        <div className="w-full bg-white dark:bg-dm-surface p-5 rounded-2xl border border-softgray dark:border-dm-border shadow-sm text-center">
          <p className="text-sm font-medium text-textdark dark:text-dm-text">{t('payment.nextRenewal')}</p>
          <p className="text-lg font-bold text-textdark dark:text-dm-text mt-1">{renewalDate}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="w-full rounded-xl bg-sage px-6 py-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        >
          {t('payment.goToAccount')}
        </button>
      </div>
    )
  }

  // ── Main payment page ─────────────────────────────────────────
  return (
    <div className="flex flex-col animate-fade-up max-w-[480px] mx-auto w-full px-2 pb-12">
      {/* Back */}
      <div className="mb-6 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-textdark/50 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text transition-colors"
        >
          <span>←</span> {t('payment.back')}
        </button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">{t('payment.title')}</h1>
          <p className="text-textdark/60 dark:text-dm-muted text-sm border-b border-softgray dark:border-dm-border pb-4">
            {t('payment.subtitle')}
          </p>
        </div>

        {/* Plan summary */}
        <div className="bg-white dark:bg-dm-surface rounded-2xl p-6 shadow-sm border border-softgray dark:border-dm-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10" style={{ backgroundColor: planInfo.color }} />
          <div className="relative z-10 flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-textdark/50 dark:text-dm-muted mb-1">{t('payment.planSelected')}</p>
              <h2 className="text-2xl font-bold text-textdark dark:text-dm-text">{planInfo.name}</h2>
            </div>
            <span className="text-xl font-black" style={{ color: planInfo.color }}>{planInfo.price.split(' ')[0]}</span>
          </div>
          <ul className="space-y-2 mb-2">
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
            <span>⚠️</span>
            <div>
              {error}
              {!hasMetaMask && (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-1 font-semibold underline"
                >
                  Instalar MetaMask →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Wallet / action area */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-textdark/60 dark:text-dm-muted text-center pt-2">
            {t('payment.billingNote')}
          </p>

          <div className="flex justify-center border border-softgray dark:border-dm-border rounded-xl p-1 bg-[#FAF8F5] dark:bg-dm-bg">
            <button
              onClick={() => setPaymentCurrency('USDT')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${paymentCurrency === 'USDT' ? 'bg-sage text-white shadow-sm' : 'text-textdark/60 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'}`}
            >
              USDT (Celo)
            </button>
            <button
              onClick={() => setPaymentCurrency('cUSD')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${paymentCurrency === 'cUSD' ? 'bg-sage text-white shadow-sm' : 'text-textdark/60 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'}`}
            >
              cUSD (Celo)
            </button>
          </div>
          {paymentCurrency === 'cUSD' && (
            <p className="text-[10px] text-center text-textdark/50 dark:text-dm-muted -mt-1 font-medium">
              cUSD es la moneda estable nativa de Celo
            </p>
          )}

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-sage text-white font-bold py-3.5 shadow-md hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition disabled:opacity-50"
          >
            {loading ? t('payment.processing') : t('payment.activate', { amount: planInfo.amountUSD })}
          </button>

          {/* DeFi cashback benefit card (BELOW PAYMENT) */}
          <div className="bg-[#F0F7F0] dark:bg-sage/10 rounded-2xl p-5 border border-sage/20 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌱</span>
              <h3 className="font-bold text-[#4A7A4C] dark:text-sage">{t('payment.defiTitle')}</h3>
            </div>
            <p className="text-sm text-[#4A7A4C]/80 dark:text-sage/80 leading-relaxed mb-3">
              {t('payment.defiDesc')}
            </p>
            <p className="text-xs font-medium text-[#4A7A4C]/60 dark:text-sage/50 font-mono">{t('payment.defiPowered')}</p>
          </div>

          {localStorage.getItem('breso_selected_plan') === plan && (
            <div className="mt-8 pt-4 border-t border-softgray dark:border-dm-border flex flex-col items-center">
              <p className="text-xs text-textdark/50 text-center mb-2">
                {t('payment.cancelNote')}
              </p>
              <button
                onClick={handleCancel}
                className="text-xs text-textdark/40 hover:text-red-500 transition px-3 py-1 font-semibold"
              >
                {t('payment.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
