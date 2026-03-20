import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export default function AuthGuard() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/signin" replace />
  }

  return <Outlet />
}
