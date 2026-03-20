import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import i18n from '../i18n/index'

export default function Layout() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  function toggleLanguage() {
    const next = i18n.language.startsWith('es') ? 'en' : 'es'
    i18n.changeLanguage(next)
  }

  const currentLang = i18n.language.startsWith('es') ? 'ES' : 'EN'
  const nextLang = i18n.language.startsWith('es') ? 'EN' : 'ES'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive
        ? 'text-blue-600 border-b-2 border-blue-600 pb-0.5'
        : 'text-gray-600 hover:text-blue-600'
    }`

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-1.5 font-bold text-lg text-blue-600 select-none">
            <span>💙</span>
            <span>BRESO</span>
          </NavLink>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-6">
            <NavLink to="/dashboard" className={navLinkClass}>
              {t('nav.dashboard')}
            </NavLink>
            <NavLink to="/checkin" className={navLinkClass}>
              {t('nav.checkin')}
            </NavLink>
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold text-gray-500 hover:text-blue-600 border border-gray-300 hover:border-blue-400 rounded px-2 py-1 transition-colors"
              title={`Switch to ${nextLang}`}
            >
              {currentLang}
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              {t('nav.signout')}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-gray-100 px-4 py-2 flex gap-5">
          <NavLink to="/dashboard" className={navLinkClass}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/checkin" className={navLinkClass}>
            {t('nav.checkin')}
          </NavLink>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 select-none">
        BRESO — Con amor desde Latinoamérica 💙 | With love from Latin America 💙
      </footer>
    </div>
  )
}
