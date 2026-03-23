import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useSession } from './hooks/useSession'
import AuthGuard from './components/AuthGuard'
import LanguageToggle from './components/LanguageToggle'
import Navigation from './components/Navigation'
import Splash from './pages/Splash'
import Landing from './pages/Landing'
import Welcome from './pages/Welcome'
import Onboarding from './pages/Onboarding'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'
import CheckIn from './pages/CheckIn'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Contacts from './pages/Contacts'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Payment from './pages/Payment'
import FamilyDashboard from './pages/FamilyDashboard'
import ProfessionalDashboard from './pages/ProfessionalDashboard'
import Home from './pages/Home'
import FamilyOnboarding from './pages/FamilyOnboarding'
import AcceptInvite from './pages/AcceptInvite'
import VerifyIdentity from './pages/VerifyIdentity'
import InstallPWA from './components/InstallPWA'

function App() {
  const [splashDone, setSplashDone] = useState(false)

  if (!splashDone) {
    return (
      <ThemeProvider>
        <Splash onComplete={() => setSplashDone(true)} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}

import { useEffect } from 'react'

// Inner component so useSession can use useNavigate (requires Router context)
function AppRoutes() {
  const { theme } = useTheme()
  useSession() // sets up global auth state listener + redirects

  useEffect(() => {
    document.getElementById('root')?.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-dvh bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-200">
      <Navigation />
      <LanguageToggle />
      <main className="mx-auto w-full max-w-xl px-4 pt-16 pb-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/welcome" element={<AuthGuard><Welcome /></AuthGuard>} />
          <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />
          <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/checkin" element={<AuthGuard><CheckIn /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
          <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
          <Route path="/contacts" element={<AuthGuard><Contacts /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
          <Route path="/help" element={<AuthGuard><Help /></AuthGuard>} />
          <Route path="/payment" element={<AuthGuard><Payment /></AuthGuard>} />
          <Route path="/family-dashboard" element={<AuthGuard><FamilyDashboard /></AuthGuard>} />
          <Route path="/professional-dashboard" element={<AuthGuard><ProfessionalDashboard /></AuthGuard>} />
          <Route path="/home" element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/family-onboarding" element={<AuthGuard><FamilyOnboarding /></AuthGuard>} />
          <Route path="/accept-invite/:token" element={<AuthGuard><AcceptInvite /></AuthGuard>} />
          <Route path="/verify-identity" element={<AuthGuard><VerifyIdentity /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <InstallPWA />
    </div>
  )
}

export default App
