import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * AuthGuard — protects private routes.
 * Checks Supabase session first; falls back to breso_token / breso_user_name
 * for mock mode (no VITE_SUPABASE_URL or VITE_API_BASE_URL).
 */
export default function AuthGuard({ children }) {
  const [checked, setChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true)
      } else {
        // Fallback: mock mode uses localStorage
        const hasToken = (() => { try { return !!localStorage.getItem('breso_token') } catch { return false } })()
        const hasMockUser = (() => { try { return !!localStorage.getItem('breso_user_name') } catch { return false } })()
        const isMockMode = !import.meta.env.VITE_API_BASE_URL
        setIsLoggedIn(isMockMode ? (hasMockUser || hasToken) : hasToken)
      }
      setChecked(true)
    })
  }, [])

  if (!checked) return null // brief flash prevention
  if (!isLoggedIn) return <Navigate to="/" replace />
  return children
}
