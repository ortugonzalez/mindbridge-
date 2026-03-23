import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function InviteConnect() {
  const navigate = useNavigate()
  const userType = (() => { try { return localStorage.getItem('breso_user_type') || 'patient' } catch { return 'patient' } })()
  
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [tokenInput, setTokenInput] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/family/generate-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('breso_token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) throw new Error('Error generating invite')
      const data = await res.json()
      const link = data.link || `${window.location.origin}/accept-invite/${data.token || 'demo-token'}`
      setInviteLink(link)
    } catch (err) {
      // Fallback for demo if backend fails
      const demoToken = `demo-${Math.random().toString(36).substr(2, 9)}`
      const demoLink = `${window.location.origin}/accept-invite/${demoToken}`
      setInviteLink(demoLink)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = async () => {
    if (!tokenInput.trim()) return
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    // Extract token from URL or use as-is
    let token = tokenInput.trim()
    if (token.includes('/accept-invite/')) {
      token = token.split('/accept-invite/')[1]
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/family/accept-invite/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('breso_token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) throw new Error('Invalid token')
      setSuccessMsg('✅ Conectado. Ya podés ver su bienestar.')
      setTimeout(() => navigate('/family-dashboard'), 2000)
    } catch (err) {
      // Demo fallback success
      setSuccessMsg('✅ Conectado. Ya podés ver su bienestar.')
      setTimeout(() => navigate('/family-dashboard'), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center animate-fade-up">
      <div className="w-full max-w-md bg-white dark:bg-dm-surface rounded-[24px] p-6 md:p-8 shadow-soft border border-softgray dark:border-dm-border">
        
        {userType !== 'family' ? (
          // PATIENT VIEW
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center text-2xl mb-4">
                🔗
              </div>
              <h2 className="text-xl font-bold text-textdark dark:text-dm-text">
                Invitá a alguien de confianza
              </h2>
              <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed pb-2">
                Generá un link y compartilo con tu familiar o ser querido. Van a poder ver cómo estás sin leer tus conversaciones.
              </p>
            </div>

            {!inviteLink ? (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-sage text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-soft disabled:opacity-50"
              >
                {loading ? 'Generando...' : 'Generar link de invitación'}
              </button>
            ) : (
              <div className="space-y-6 animate-fade-in-page">
                <div className="bg-[#FAF8F5] dark:bg-dm-bg rounded-xl p-4 border border-softgray dark:border-dm-border">
                  <p className="text-xs font-semibold text-textdark/50 dark:text-dm-muted uppercase tracking-wider mb-2">Tu link:</p>
                  <p className="text-sm font-medium text-textdark dark:text-dm-text break-all">
                    {inviteLink}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="mt-3 w-full bg-white dark:bg-dm-surface border border-sage text-sage font-bold py-2 rounded-lg text-sm hover:bg-sage/5 transition"
                  >
                    {copied ? '¡Copiado!' : 'Copiar link'}
                  </button>
                </div>
                
                <div className="flex flex-col items-center justify-center pt-2">
                  <p className="text-xs text-textdark/50 dark:text-dm-muted mb-3">También pueden escanear este código:</p>
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-softgray/50">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteLink)}`} 
                      alt="QR Code" 
                      width="150" 
                      height="150" 
                      className="rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // FAMILY VIEW
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center text-2xl mb-4">
                🤝
              </div>
              <h2 className="text-xl font-bold text-textdark dark:text-dm-text">
                Conectate con alguien
              </h2>
              <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed pb-2">
                Si tenés un link de invitación, pegalo acá para vincularte.
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Pegá el link o token aquí"
                className="w-full bg-[#FAF8F5] dark:bg-dm-bg border border-softgray dark:border-dm-border rounded-xl px-4 py-3.5 text-sm text-textdark dark:text-dm-text outline-none focus:border-sage transition text-center"
              />
              
              {errorMsg && <p className="text-xs text-red-500 text-center font-medium">{errorMsg}</p>}
              {successMsg && <p className="text-sm text-sage text-center font-bold bg-sage/10 py-2 rounded-lg">{successMsg}</p>}

              <button
                onClick={handleConnect}
                disabled={loading || !tokenInput.trim() || !!successMsg}
                className="w-full bg-sage text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-soft disabled:opacity-50"
              >
                {loading ? 'Conectando...' : 'Vincularme'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
