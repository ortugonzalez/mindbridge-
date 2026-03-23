import { useState, useEffect } from 'react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16,
      background: '#7C9A7E', color: 'white',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
    }}>
      <div>
        <div style={{ fontWeight: 500 }}>Instalá Soledad en tu celular</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>Acceso rápido desde tu pantalla de inicio</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShow(false)}
          style={{ background: 'transparent', color: 'white', border: 'none', padding: '6px 12px', cursor: 'pointer' }}
        >
          Ahora no
        </button>
        <button
          onClick={() => { prompt.prompt(); setShow(false) }}
          style={{ background: 'white', color: '#7C9A7E', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 500 }}
        >
          Instalar
        </button>
      </div>
    </div>
  )
}
