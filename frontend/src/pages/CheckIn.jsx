import { Navigate } from 'react-router-dom'

// /checkin redirects to /chat — the chat view IS the check-in experience
export default function CheckIn() {
  return <Navigate to="/chat" replace />
}
