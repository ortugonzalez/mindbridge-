import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
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
        <div className="min-h-dvh bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-200">
          <Navigation />
          <LanguageToggle />
          <main className="mx-auto w-full max-w-xl px-4 pt-16 pb-8">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
