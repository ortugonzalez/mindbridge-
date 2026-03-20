import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LanguageToggle from './components/LanguageToggle'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-whiteish">
        <LanguageToggle />
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
