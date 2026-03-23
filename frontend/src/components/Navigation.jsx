import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import i18n, { STORAGE_KEY } from '../i18n'
import { supabase } from '../lib/supabase'

const THEME_KEY = 'breso_theme'
const NO_BACK_ROUTES = new Set(['/', '/chat', '/welcome'])

function getInitialTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light' } catch { return 'light' }
}

export default function Navigation() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [lang, setLang] = useState(i18n.language || 'es')
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const handler = () => setLang(i18n.language || 'es')
    i18n.on('languageChanged', handler)
    return () => i18n.off('languageChanged', handler)
  }, [])

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem(THEME_KEY, theme) } catch { }
  }, [theme])

  // Close when navigating
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  const setLanguage = (next) => {
    try { localStorage.setItem(STORAGE_KEY, next) } catch { }
    i18n.changeLanguage(next)
  }

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const showBack = !NO_BACK_ROUTES.has(location.pathname)

  const userType = (() => { try { return localStorage.getItem('breso_user_type') || 'patient' } catch { return 'patient' } })()

  const allLinks = [
    { path: '/home', icon: '🏠', label: 'Inicio', roles: ['patient', 'family'] },
    { path: '/chat', icon: '💬', label: 'Hablar con Soledad', roles: ['patient'] },
    { path: '/dashboard', icon: '📊', label: 'Mi progreso', roles: ['patient'] },
    { path: '/family-dashboard', icon: '📊', label: 'Panel de seguimiento', roles: ['family'] },
    { path: '/profile', icon: '👤', label: 'Mi perfil', roles: ['patient'] },
    { path: '/notifications', icon: '🔔', label: 'Notificaciones', roles: ['patient'] },
    { path: '/contacts', icon: '🤝', label: 'Contactos de confianza', roles: ['patient'] },
    { path: '/payment', icon: '💳', label: 'Mi suscripción', roles: ['patient'] },
    { path: '/settings', icon: '⚙️', label: 'Configuración', roles: ['patient', 'family'] },
    { path: '/help', icon: '❓', label: 'Ayuda', roles: ['patient', 'family'] }
  ]

  const links = allLinks.filter(l => l.roles.includes(userType))

  const handleSignOut = async () => {
    setIsOpen(false)
    await supabase.auth.signOut()
    navigate('/')
  }

  const btnFixed = 'fixed top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text shadow-soft hover:opacity-80 transition'

  return (
    <>
      {/* Hamburger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${btnFixed} left-3 text-base`}
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Back button */}
      {showBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`${btnFixed} left-14 text-sm font-semibold`}
          aria-label="Back"
        >
          ←
        </button>
      )}

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={[
          'fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-dm-surface shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-softgray dark:border-dm-border flex-shrink-0">
          <div>
            <div className="text-lg font-bold text-textdark dark:text-dm-text">Soledad</div>
            <div className="text-xs tracking-widest text-textdark/40 dark:text-dm-muted uppercase">por BRESO</div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-textdark/40 dark:text-dm-muted hover:bg-softgray dark:hover:bg-dm-border transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {links.map(({ path, icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setIsOpen(false)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                location.pathname === path
                  ? 'bg-sage/12 dark:bg-sage/20 text-sage'
                  : 'text-textdark dark:text-dm-text hover:bg-softgray dark:hover:bg-dm-border',
              ].join(' ')}
            >
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom settings */}
        <div className="p-3 border-t border-softgray dark:border-dm-border space-y-0.5 flex-shrink-0">
          {/* Dark mode */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-textdark dark:text-dm-text hover:bg-softgray dark:hover:bg-dm-border transition"
          >
            <span className="flex items-center gap-3">
              <span className="text-base">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span>{t('nav.darkMode')}</span>
            </span>
            <span className="text-xs text-textdark/40 dark:text-dm-muted">
              {theme === 'dark' ? t('nav.lightModeLabel') : t('nav.darkModeLabel')}
            </span>
          </button>

          {/* Language */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl">
            <span className="text-base">🌍</span>
            <span className="flex-1 text-sm font-medium text-textdark dark:text-dm-text">{t('nav.language')}</span>
            <div className="flex gap-1">
              {['es', 'en'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={[
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition',
                    lang === l ? 'bg-sage text-white' : 'text-textdark/55 dark:text-dm-muted hover:bg-softgray dark:hover:bg-dm-border',
                  ].join(' ')}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <span className="text-base">🚪</span>
            <span>{t('nav.signout')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
