import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { signIn, registerUser, sendMagicLink, getUserProfile } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'

export default function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [tab, setTab] = useState('signin') // 'signin' | 'register' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const afterLogin = async () => {
    try {
      const res = await getUserProfile()
      const userType = res.data?.user_type || res?.user_type || 'patient'
      try { localStorage.setItem(USER_NAME_KEY, res.data?.name || res?.name || '') } catch {}
      if (userType === 'family') return navigate('/family-dashboard', { replace: true })
      if (userType === 'professional') return navigate('/professional-dashboard', { replace: true })
    } catch {}
    navigate('/chat', { replace: true })
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
      navigate('/onboarding', { replace: true })
    } catch {
      setError(t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await sendMagicLink({ email: email.trim() })
      setMagicSent(true)
    } catch {
      setError(t('errors.auth'))
    } finally {
      setLoading(false)
    }
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

        {/* Tabs */}
        <div className="flex rounded-xl bg-softgray dark:bg-dm-bg p-1 gap-1">
          {['signin', 'register'].map((t_) => (
            <button
              key={t_}
              type="button"
              onClick={() => { setTab(t_); setError(''); setMagicSent(false) }}
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

        {/* Sign in form */}
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
              onClick={() => setTab('magic')}
              className="w-full rounded-full border border-softgray dark:border-dm-border px-6 py-3 text-sm font-semibold text-textdark dark:text-dm-text transition hover:border-sage hover:text-sage"
            >
              {t('auth.magic_link')}
            </button>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
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

        {/* Magic link form */}
        {tab === 'magic' && !magicSent && (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <p className="text-sm text-textdark/60 dark:text-dm-muted leading-relaxed">
              {t('auth.magic_link')} — ingresá tu email y te enviamos un link para entrar sin contraseña.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className={inputCls}
              autoComplete="email"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !email.trim()} className={btnCls}>
              {loading ? t('common.loading') : t('auth.send_magic_link')}
            </button>
            <button type="button" onClick={() => setTab('signin')} className="w-full text-sm text-textdark/50 dark:text-dm-muted hover:text-sage transition py-1">
              ← {t('nav.back')}
            </button>
          </form>
        )}

        {/* Magic link sent */}
        {magicSent && (
          <div className="text-center space-y-3 py-2">
            <div className="text-3xl">📬</div>
            <p className="text-sm text-textdark/70 dark:text-dm-text leading-relaxed">{t('auth.magic_link_sent')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
