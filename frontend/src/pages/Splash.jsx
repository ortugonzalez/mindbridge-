import { useEffect, useState } from 'react'

export default function Splash({ onComplete }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setFading(true), 1500)
    const timer2 = setTimeout(() => { if (onComplete) onComplete() }, 2300)
    return () => { clearTimeout(timer1); clearTimeout(timer2) }
  }, [onComplete])

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #7C9A7E 0%, #5A7A5C 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.8s ease',
    }}>
      <img
        src="/logo.svg"
        alt="BRENSO"
        style={{
          width: 'min(200px, 50vw)',
          height: 'auto',
          filter: 'brightness(0) invert(1)',
        }}
      />
    </div>
  )
}
