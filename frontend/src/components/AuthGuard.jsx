import { Navigate } from 'react-router-dom'

/**
 * AuthGuard — protects private routes.
 * Mock mode (no VITE_API_BASE_URL): logged in if breso_user_name OR breso_token present.
 * Real mode: requires breso_token.
 * Public routes (/signin, /) do not use AuthGuard.
 */
export default function AuthGuard({ children }) {
  const hasMockUser = (() => { try { return !!localStorage.getItem('breso_user_name') } catch { return false } })()
  const hasToken = (() => { try { return !!localStorage.getItem('breso_token') } catch { return false } })()
  const isMockMode = !import.meta.env.VITE_API_BASE_URL

  const isLoggedIn = isMockMode ? (hasMockUser || hasToken) : hasToken

  if (!isLoggedIn) return <Navigate to="/signin" replace />
  return children
}
