import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

type Tab = 'password' | 'magic'
type Mode = 'signin' | 'register'

export default function SignIn() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('password')
  const [mode, setMode] = useState<Mode>('signin')

  // Shared
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState('es')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  function clearState() {
    setError(null)
    setMagicLinkSent(false)
  }

  // ── Password sign-in ──────────────────────────────────────────────────────
  async function handlePasswordSignIn(e: FormEvent) {
    e.preventDefault()
    clearState()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────
  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    clearState()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { language },
        },
      })
      if (error) throw error
      navigate('/onboarding', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  // ── Magic link ────────────────────────────────────────────────────────────
  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    clearState()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setMagicLinkSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.auth'))
    } finally {
      setLoading(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition'
  const btnPrimary =
    'w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100 px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">💙</div>
        <h1 className="text-3xl font-bold text-blue-700">BRESO</h1>
        <p className="text-gray-500 text-sm mt-1">{t('app.tagline')}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-6">

        {/* ── REGISTER FORM ── */}
        {mode === 'register' ? (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-5">{t('auth.register')}</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('onboarding.language')}</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className={inputClass}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? t('auth.signing_in') : t('auth.register')}
              </button>
            </form>

            <p className="mt-4 text-xs text-center text-gray-500">
              {t('auth.have_account')}{' '}
              <button
                onClick={() => { setMode('signin'); clearState() }}
                className="text-blue-600 hover:underline font-medium"
              >
                {t('auth.signin')}
              </button>
            </p>
          </>
        ) : (
          <>
            {/* ── SIGN IN TABS ── */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-5">
              <button
                onClick={() => { setTab('password'); clearState() }}
                className={`flex-1 py-2 text-xs font-semibold transition ${
                  tab === 'password'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('auth.password')}
              </button>
              <button
                onClick={() => { setTab('magic'); clearState() }}
                className={`flex-1 py-2 text-xs font-semibold transition ${
                  tab === 'magic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('auth.magic_link')}
              </button>
            </div>

            {/* ── PASSWORD TAB ── */}
            {tab === 'password' && (
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.password')}</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading} className={btnPrimary}>
                  {loading ? t('auth.signing_in') : t('auth.signin')}
                </button>
              </form>
            )}

            {/* ── MAGIC LINK TAB ── */}
            {tab === 'magic' && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth.email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                {magicLinkSent && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {t('auth.magic_link_sent')}
                  </p>
                )}

                <button type="submit" disabled={loading || magicLinkSent} className={btnPrimary}>
                  {loading ? t('auth.signing_in') : t('auth.send_magic_link')}
                </button>
              </form>
            )}

            <p className="mt-4 text-xs text-center text-gray-500">
              {t('auth.no_account')}{' '}
              <button
                onClick={() => { setMode('register'); clearState() }}
                className="text-blue-600 hover:underline font-medium"
              >
                {t('auth.register')}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
