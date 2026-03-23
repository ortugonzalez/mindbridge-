import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

const PLAN_INFO = {
  essential: {
    name: 'Esencial',
    price: '$5 USDT / mes',
    amountUSD: 5,
    color: '#7C9A7E',
    features: ['Check-ins ilimitados', 'Historial completo', '1 contacto de confianza', 'Propuestas personalizadas'],
  },
  premium: {
    name: 'Premium',
    price: '$12 USDT / mes',
    amountUSD: 12,
    color: '#C4962A',
    features: ['Todo lo esencial', '2 contactos de confianza', 'Coordinación profesional', 'Reporte mensual'],
  },
}

function truncateAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function Payment() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') || 'essential'
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.essential

  const [walletAddress, setWalletAddress] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [renewalDate, setRenewalDate] = useState('')
  const [error, setError] = useState('')
  const [hasMetaMask, setHasMetaMask] = useState(false)

  const predictedRenewalDate = new Date()
  predictedRenewalDate.setMonth(predictedRenewalDate.getMonth() + 1)
  const predictedRenewalString = predictedRenewalDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

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

  const connectAndPay = async () => {
    setError('')
    if (!window.ethereum) {
      setError('Necesitás MetaMask para pagar. Instalalo en metamask.io')
      return
    }
    setLoading(true)
    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const userAddress = accounts[0]
      setWalletAddress(userAddress)

      // Switch to Celo Sepolia (chainId 0xaef3 = 44787)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaef3' }],
      }).catch(async () => {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaef3',
            chainName: 'Celo Alfajores Testnet',
            rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
            nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
            blockExplorerUrls: ['https://celo-alfajores.blockscout.com'],
          }],
        })
      })

      // Call backend
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || localStorage.getItem('breso_token') || ''

      const res = await fetch(`${BASE_URL}/payments/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, wallet_address: userAddress }),
      })
      const data = await res.json()

      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      setRenewalDate(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }))

      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
      } else {
        // Demo / mock mode — simulate success
        try { localStorage.setItem('breso_selected_plan', plan) } catch {}
        setPaymentSuccess(true)
      }
    } catch (err) {
      setError('Error al conectar: ' + (err.message || 'inténtalo de nuevo'))
    } finally {
      setLoading(false)
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
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text">Plan {planInfo.name} activado</h2>
          <p className="text-sm font-medium text-sage">Cashback DeFi activado — recibirás ~${planInfo.amountUSD === 5 ? '0.02' : '0.05'} el próximo mes</p>
        </div>
        <div className="w-full bg-white dark:bg-dm-surface p-5 rounded-2xl border border-softgray dark:border-dm-border shadow-sm text-center">
          <p className="text-sm font-medium text-textdark dark:text-dm-text">Próxima renovación</p>
          <p className="text-lg font-bold text-textdark dark:text-dm-text mt-1">{renewalDate}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/home', { replace: true })}
          className="w-full rounded-xl bg-sage px-6 py-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
        >
          Ir a mi cuenta
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
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10" style={{ backgroundColor: planInfo.color }} />
          <div className="relative z-10 flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-textdark/50 dark:text-dm-muted mb-1">Plan Seleccionado</p>
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
          {walletAddress ? (
            /* Connected state */
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                {truncateAddress(walletAddress)}
              </span>
              <span className="ml-auto text-xs text-green-600/70 dark:text-green-500/70">Celo Sepolia</span>
            </div>
          ) : (
            /* Not connected — MetaMask button */
            <button
              type="button"
              onClick={connectAndPay}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-sage text-sage font-bold py-3.5 hover:bg-sage/5 active:scale-[0.98] transition disabled:opacity-50"
            >
              <span className="text-xl">🦊</span>
              {loading ? 'Conectando...' : 'Conectar MetaMask'}
            </button>
          )}

          {walletAddress && (
            <button
              type="button"
              onClick={connectAndPay}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-sage text-white font-bold py-3.5 shadow-md hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition disabled:opacity-50"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sage">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
              </div>
              {loading ? 'Procesando...' : `Pagar ${planInfo.amountUSD} USDT en Celo`}
            </button>
          )}

          {/* DeFi cashback benefit card (BELOW PAYMENT) */}
          <div className="bg-[#F0F7F0] dark:bg-sage/10 rounded-2xl p-5 border border-sage/20 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌱</span>
              <h3 className="font-bold text-[#4A7A4C] dark:text-sage">Beneficio DeFi incluido</h3>
            </div>
            <p className="text-sm text-[#4A7A4C]/80 dark:text-sage/80 leading-relaxed mb-3">
              Tu suscripción genera rendimientos automáticos.<br/>
              Recibís ~${planInfo.amountUSD === 5 ? '0.02' : '0.05'} de cashback cada mes.
            </p>
            <p className="text-xs font-medium text-[#4A7A4C]/60 dark:text-sage/50 font-mono">Powered by Celo blockchain</p>
          </div>

          {!walletAddress && !hasMetaMask && (
            <p className="text-center text-xs text-textdark/50 dark:text-dm-muted mt-4">
              Necesitás MetaMask para pagar en Celo.{' '}
              <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-sage underline font-medium">
                Instalar MetaMask →
              </a>
            </p>
          )}

          {walletAddress && (
            <div className="flex flex-col items-center space-y-2 mt-4">
              <p className="text-sm font-medium text-textdark/70 dark:text-dm-muted">
                Próxima renovación: {predictedRenewalString}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-textdark/50 dark:text-dm-muted pt-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>🔒 Pago procesado en Celo blockchain</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
