import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { signIn, registerUser, sendMagicLink, getUserProfile } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'
const RESEND_COOLDOWN = 60 // seconds

export default function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [tab, setTab] = useState('signin') // 'signin' | 'register' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  // FIX 3 — redirect based on onboarding status
  const afterLogin = async () => {
    try {
      const res = await getUserProfile()
      const profile = res.data || res || {}
      const userType = profile.user_type || 'patient'
      const name = profile.name || ''
      if (name) { try { localStorage.setItem(USER_NAME_KEY, name) } catch {} }

      if (userType === 'family') return navigate('/family-dashboard', { replace: true })
      if (userType === 'professional') return navigate('/professional-dashboard', { replace: true })
    } catch {}

    // Check onboarding: name in localStorage = returning user → chat
    const hasName = (() => { try { return !!localStorage.getItem(USER_NAME_KEY) } catch { return false } })()
    navigate(hasName ? '/chat' : '/landing', { replace: true })
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      await signIn({ email: email.trim(), password })
      await afterLogin()
    } catch {
      setError(t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      await registerUser({ name: '', email: email.trim(), password, language: 'es', timezone: 'America/Buenos_Aires' })
      navigate('/landing', { replace: true })
    } catch {
      setError(t('errors.auth'))
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
      await sendMagicLink({ email: email.trim() })
      setMagicSent(true)
      startCountdown()
    } catch {
      setError(t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      await sendMagicLink({ email: email.trim() })
      startCountdown()
    } catch {
      setError(t('errors.auth'))
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
      <div className="text-center space-y-1">
        <div className="mx-auto h-14 w-14 rounded-full bg-sage flex items-center justify-center text-white text-2xl font-bold shadow-soft">
          S
        </div>
        <p className="text-xs text-textdark/50 dark:text-dm-muted tracking-widest uppercase">por BRESO</p>
      </div>

      <div className="w-full rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-6 shadow-soft space-y-5">

        {/* Tabs — hidden when magic link sent */}
        {!magicSent && (
          <div className="flex rounded-xl bg-softgray dark:bg-dm-bg p-1 gap-1">
            {['signin', 'register'].map((t_) => (
              <button
                key={t_}
                type="button"
                onClick={() => { setTab(t_); setError('') }}
                className={[
                  'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                  tab === t_
                    ? 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text shadow-sm'
                    : 'text-textdark/50 dark:text-dm-muted',
                ].join(' ')}
              >
                {t_ === 'signin' ? t('auth.signin') : t('auth.register')}
              </button>
            ))}
          </div>
        )}

        {/* ── Sign in form ── */}
        {tab === 'signin' && !magicSent && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className={inputCls}
              autoComplete="email"
              disabled={loading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              className={inputCls}
              autoComplete="current-password"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email.trim() || !password.trim()} className={btnCls}>
              {loading ? t('auth.signing_in') : t('auth.signin')}
            </button>
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-softgray dark:bg-dm-border" />
              <span className="text-xs text-textdark/40 dark:text-dm-muted">{t('auth.or')}</span>
              <div className="flex-1 h-px bg-softgray dark:bg-dm-border" />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setTab('magic'); setError('') }}
              className="w-full rounded-full border border-softgray dark:border-dm-border px-6 py-3 text-sm font-semibold text-textdark dark:text-dm-text transition hover:border-sage hover:text-sage"
            >
              {t('auth.magic_link')}
            </button>
          </form>
        )}

        {/* ── Register form ── */}
        {tab === 'register' && !magicSent && (
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className={inputCls}
              autoComplete="email"
              disabled={loading}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              className={inputCls}
              autoComplete="new-password"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email.trim() || !password.trim()} className={btnCls}>
              {loading ? t('common.loading') : t('auth.register')}
            </button>
          </form>
        )}

        {/* ── Magic link form ── */}
        {tab === 'magic' && !magicSent && (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <p className="text-sm text-textdark/60 dark:text-dm-muted leading-relaxed">
              Ingresá tu email y te enviamos un enlace para entrar sin contraseña.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className={inputCls}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email.trim()} className={btnCls}>
              {loading ? t('common.loading') : t('auth.send_magic_link')}
            </button>
            <button
              type="button"
              onClick={() => { setTab('signin'); setError('') }}
              className="w-full text-sm text-textdark/50 dark:text-dm-muted hover:text-sage transition py-1"
            >
              ← {t('nav.back')}
            </button>
          </form>
        )}

        {/* ── Magic link sent confirmation ── */}
        {magicSent && (
          <div className="space-y-5">
            <div className="text-center space-y-2 py-2">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-base font-semibold text-textdark dark:text-dm-text">
                Te enviamos un enlace a
              </p>
              <p className="text-sm font-medium text-sage break-all">{email}</p>
              <p className="text-sm text-textdark/55 dark:text-dm-muted leading-relaxed mt-1">
                Revisá tu bandeja de entrada y también la carpeta de spam.
              </p>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            {/* Resend button */}
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
                ? `Reenviar en ${resendCountdown}s...`
                : 'Volver a enviar'}
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
