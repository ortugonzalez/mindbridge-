import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const inviterName = 'Alguien'

  // In a real scenario, you might do a GET /family/invite-info?token=... to fetch inviterName first.
  
  const handleAccept = async () => {
    setStatus('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const authToken = sessionData.session?.access_token || localStorage.getItem('breso_token') || ''
      const base = import.meta.env.VITE_API_BASE_URL
      
      if (base) {
        const response = await fetch(`${base}/auth/accept-invite/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        })
        if (!response.ok) throw new Error('accept invite failed')
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center p-6 text-center animate-fade-in-page max-w-[480px] mx-auto">
      {status === 'idle' && (
        <>
          <div className="h-20 w-20 bg-sage/10 text-sage rounded-full flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">🤝</span>
          </div>
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
            {inviterName} quiere acompañarte
          </h2>
          <p className="text-textdark/70 dark:text-dm-muted mb-8 leading-relaxed">
            Al aceptar esta invitación, esta persona podrá ver un resumen de tu bienestar emocional y apoyarte cuando lo necesites. Tus conversaciones con Soledad siempre seguirán siendo 100% privadas.
          </p>
          <div className="w-full space-y-3">
            <button
              onClick={handleAccept}
              className="w-full bg-[#7C9A7E] text-white font-bold py-4 rounded-xl shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              Aceptar invitación
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-transparent text-[#7C9A7E] font-bold py-4 rounded-xl transition-colors hover:bg-sage/5"
            >
              Rechazar
            </button>
          </div>
        </>
      )}

      {status === 'loading' && (
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-sage border-t-transparent flex-shrink-0 animate-spin rounded-full mb-4"></div>
          <p className="text-textdark/60 font-medium">Procesando invitación...</p>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="h-24 w-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-sm animate-bounce-short">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
            ¡Invitación aceptada!
          </h2>
          <p className="text-textdark/70 dark:text-dm-muted mb-8">
            Tu red de apoyo ahora es más grande.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="w-full bg-[#7C9A7E] text-white font-bold py-4 rounded-xl shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            Ir a conversar
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
            Ocurrió un error
          </h2>
          <p className="text-textdark/70 dark:text-dm-muted mb-8">
            No pudimos procesar la invitación. Es posible que el enlace haya expirado.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="w-full border-2 border-[#7C9A7E] text-[#7C9A7E] font-bold py-4 rounded-xl transition-colors hover:bg-sage/5"
          >
            Volver a intentar
          </button>
        </>
      )}
    </div>
  )
}
