import { Navigate } from 'react-router-dom'

/**
 * AuthGuard — protects private routes.
 * In mock mode (no VITE_API_BASE_URL), considers a user "logged in" if they
 * have completed onboarding (breso_user_name in localStorage).
 * In real mode, requires breso_token.
 */
export default function AuthGuard({ children }) {
  const hasMockUser = (() => { try { return !!localStorage.getItem('breso_user_name') } catch { return false } })()
  const hasToken = (() => { try { return !!localStorage.getItem('breso_token') } catch { return false } })()
  const isMockMode = !import.meta.env.VITE_API_BASE_URL

  const isLoggedIn = isMockMode ? (hasMockUser || hasToken) : hasToken

  if (!isLoggedIn) return <Navigate to="/signin" replace />
  return children
}
