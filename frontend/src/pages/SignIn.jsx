import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getUserProfile } from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

const USER_NAME_KEY = 'breso_user_name'
const RESEND_COOLDOWN = 60 // seconds

export default function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userTypeParam = searchParams.get('type') || 'patient'
  const { theme } = useTheme()

  const [tab, setTab] = useState('magic') // 'magic' | 'password' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  // Resend countdown
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN)
  const countdownRef = useRef(null)

  const startCountdown = () => {
    setResendCountdown(RESEND_COOLDOWN)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setResendCountdown((n) => {
        if (n <= 1) {
          clearInterval(countdownRef.current)
          return 0
        }
        return n - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

  // FIX 9: fetch user_type from backend and route accordingly
  const afterLogin = async (user) => {
    const name = user?.user_metadata?.display_name || user?.user_metadata?.name || ''
    if (name) { try { localStorage.setItem(USER_NAME_KEY, name) } catch {} }
    
    try { localStorage.setItem('breso_user_type', userTypeParam) } catch {}

    try {
      const res = await getUserProfile()
      const userType = res.data?.user_type || res.data?.userType
      if (userType) { try { localStorage.setItem('breso_user_type', userType) } catch {} }
    } catch {}
    
    const finalUserType = (() => { try { return localStorage.getItem('breso_user_type') || 'patient' } catch { return 'patient' } })()
    const hasName = (() => { try { return !!localStorage.getItem(USER_NAME_KEY) } catch { return false } })()
    
    if (!hasName) {
      if (finalUserType === 'family') navigate('/family-onboarding', { replace: true })
      else navigate('/onboarding', { replace: true })
    }
    else if (finalUserType === 'family') navigate('/family-dashboard', { replace: true })
    else if (finalUserType === 'professional') navigate('/professional-dashboard', { replace: true })
    else navigate('/chat', { replace: true })
  }

  const translateError = (err) => {
    const msg = err?.message?.toLowerCase() || ''
    if (msg.includes('invalid login credentials')) return 'Contraseña incorrecta o cuenta no encontrada'
    if (msg.includes('password')) return 'Contraseña incorrecta'
    if (msg.includes('email')) return 'Revisá el email ingresado'
    if (msg.includes('not found')) return 'No encontramos esa cuenta'
    return 'Ocurrió un error. Intentalo de nuevo.'
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (err) throw err
      const token = data.session?.access_token
      if (token) { try { localStorage.setItem('breso_token', token) } catch {} }
      afterLogin(data.user)
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (err) throw err
      if (data.session) {
        const token = data.session.access_token
        if (token) { try { localStorage.setItem('breso_token', token) } catch {} }
        
        try { localStorage.setItem('breso_user_type', userTypeParam) } catch {}
        if (userTypeParam === 'family') navigate('/family-onboarding', { replace: true })
        else navigate('/onboarding', { replace: true })
      } else {
        setMagicSent(true)
        startCountdown()
      }
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e?.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (err) throw err
      setMagicSent(true)
      startCountdown()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      })
      if (err) throw err
      startCountdown()
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const resetToEmail = () => {
    setMagicSent(false)
    setError('')
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const inputCls = 'w-full rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text px-4 py-3 text-base outline-none focus:border-sage transition'
  const btnCls = 'w-full rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-40'

  return (
    <div className="flex flex-col items-center space-y-6 animate-fade-up pt-4">
      {/* Logo */}
      <div className="text-center space-y-1 mb-4 flex flex-col items-center w-full">
        <img 
          src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'} 
          alt="BRESO" 
          style={{ width: 120, height: 'auto', margin: '0 auto', display: 'block' }}
        />
        <p className="text-xs text-textdark/50 dark:text-dm-muted tracking-widest uppercase pt-2">por Soledad</p>
      </div>

      <div className="text-center space-y-1 mb-2 px-4 max-w-sm">
        <h2 className="text-lg font-bold text-textdark dark:text-dm-text leading-snug">
          Ingresá tu email para continuar
        </h2>
      </div>

      <div className="w-full rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-6 shadow-soft space-y-5">
        
        {/* ── Tabs ── */}
        {!magicSent && (
          <div className="flex w-full mb-2 border-b border-softgray dark:border-dm-border">
            <button
              onClick={() => { setTab('magic'); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === 'magic' ? 'text-sage border-b-2 border-sage' : 'text-textdark/50 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'}`}
            >
              Enlace mágico
            </button>
            <button
              onClick={() => { setTab('password'); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === 'password' ? 'text-sage border-b-2 border-sage' : 'text-textdark/50 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'}`}
            >
              Contraseña
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${tab === 'register' ? 'text-sage border-b-2 border-sage' : 'text-textdark/50 dark:text-dm-muted hover:text-textdark dark:hover:text-dm-text'}`}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {/* ── Magic link form ── */}
        {tab === 'magic' && !magicSent && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={inputCls}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <button type="submit" disabled={loading || !email.trim()} className={btnCls}>
              {loading ? t('common.loading') : 'Enviar enlace'}
            </button>
          </form>
        )}

        {/* ── Password / sign-in form ── */}
        {tab === 'password' && !magicSent && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={inputCls}
              autoComplete="email"
              disabled={loading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className={inputCls}
              autoComplete="current-password"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading || !email.trim() || !password.trim()} className={btnCls}>
              {loading ? t('common.loading') : 'Iniciar sesión'}
            </button>
          </form>
        )}

        {/* ── Register form ── */}
        {tab === 'register' && !magicSent && (
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={inputCls}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className={inputCls}
              autoComplete="new-password"
              disabled={loading}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className={inputCls}
              autoComplete="new-password"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading || !email.trim() || !password.trim() || !confirmPassword.trim()} className={btnCls}>
              {loading ? t('common.loading') : 'Crear cuenta'}
            </button>
          </form>
        )}



        {/* ── Magic link / confirmation sent ── */}
        {magicSent && (
          <div className="space-y-5">
            <div className="text-center space-y-2 py-2">
              <p className="text-base font-semibold text-textdark dark:text-dm-text">
                Te enviamos un enlace a <span className="text-sage">{email}</span> ✉️
              </p>
              <p className="text-sm text-textdark/55 dark:text-dm-muted leading-relaxed mt-1">
                Revisá tu bandeja (y el spam)
              </p>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0 || loading}
              className={[
                'w-full rounded-full border px-6 py-3 text-sm font-semibold transition',
                resendCountdown > 0 || loading
                  ? 'border-softgray dark:border-dm-border text-textdark/35 dark:text-dm-muted cursor-not-allowed'
                  : 'border-sage text-sage hover:bg-sage hover:text-white',
              ].join(' ')}
            >
              {resendCountdown > 0
                ? `Reenviar en ${resendCountdown}s`
                : 'Reenviar'}
            </button>

            {/* Change email link */}
            <button
              type="button"
              onClick={resetToEmail}
              className="w-full text-sm text-textdark/50 dark:text-dm-muted hover:text-sage transition py-1"
            >
              Cambiar email
            </button>

            <p className="text-center text-xs text-textdark/35 dark:text-dm-muted">
              El enlace expira en 24 horas.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
