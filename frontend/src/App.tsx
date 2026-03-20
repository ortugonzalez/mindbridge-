import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AuthGuard from './components/AuthGuard'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CheckIn from './pages/CheckIn'

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/checkin" element={<CheckIn />} />
        </Route>
      </Route>
    </Routes>
  )
}
