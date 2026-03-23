import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const USER_NAME_KEY = 'breso_user_name'

function getStoredName() {
  try { return localStorage.getItem(USER_NAME_KEY) || '' } catch { return '' }
}

const PROTECTED_PATHS = [
  '/chat', '/dashboard', '/checkin', '/profile', '/notifications',
  '/contacts', '/settings', '/help', '/payment',
  '/family-dashboard', '/professional-dashboard', '/welcome', '/onboarding',
]

/** FIX 9: determine correct destination after sign-in */
function resolveRedirect() {
  const userType = (() => { try { return localStorage.getItem('breso_user_type') || 'patient' } catch { return 'patient' } })()
  const hasName = !!getStoredName()
  if (!hasName) {
    if (userType === 'family') return '/family-onboarding'
    return '/onboarding'
  }
  if (userType === 'family') return '/family-dashboard'
  if (userType === 'professional') return '/professional-dashboard'
  return '/chat'
}

/**
 * Listens to Supabase auth state changes and handles redirects.
 * Returns { session, loading }.
 */
export function useSession() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined) // undefined = loading
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle magic link hash fragment (#access_token=...) on page load
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) {
          window.history.replaceState(null, '', window.location.pathname)
          navigate(resolveRedirect(), { replace: true })
        }
      })
    }

    // FIX 1: On mount, if already logged in and on auth page → redirect
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
      if (s) {
        const path = window.location.pathname
        if (path === '/' || path === '/signin' || path === '/splash') {
          navigate(resolveRedirect(), { replace: true })
        }
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoading(false)

      if (event === 'SIGNED_IN') {
        // Persist token for API calls
        const token = s?.access_token
        if (token) { try { localStorage.setItem('breso_token', token) } catch {} }
        // Persist name from metadata if present
        const name = s?.user?.user_metadata?.display_name || s?.user?.user_metadata?.name || ''
        if (name) { try { localStorage.setItem(USER_NAME_KEY, name) } catch {} }
        // FIX 4 + 9: only redirect when on auth/public pages (prevents tab-switch redirects)
        const currentPath = window.location.pathname
        if (currentPath === '/' || currentPath === '/signin' || currentPath === '/splash') {
          navigate(resolveRedirect(), { replace: true })
        }
      }

      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('breso_token') } catch {}
        // FIX 4: only redirect if user was on a protected route
        const currentPath = window.location.pathname
        if (PROTECTED_PATHS.some(p => currentPath.startsWith(p))) {
          navigate('/', { replace: true })
        }
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { session, loading }
}
