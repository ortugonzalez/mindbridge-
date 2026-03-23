import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function VerifyIdentity() {
  const navigate = useNavigate()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-300 p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text hover:bg-softgray/50 transition shadow-sm"
        >
          ←
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#3D4F3D] rounded-3xl p-8 shadow-sm border border-softgray/50 dark:border-dm-border text-center">
        <img
          src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
          alt="BRENSO"
          className="h-8 mx-auto mb-6"
        />

        <h1 className="text-2xl font-bold text-textdark dark:text-dm-text mb-4">
          Verificá tu identidad
        </h1>
        <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed mb-8 px-2">
          Self Protocol verifica que sos una persona real sin exponer tus datos personales. 
          Usamos zero-knowledge proofs para proteger tu privacidad.
        </p>

        {/* QR Placeholder */}
        <div className="w-48 h-48 mx-auto bg-sage/10 border-2 border-sage border-dashed rounded-2xl flex items-center justify-center mb-6 relative">
          <div className="text-sage text-center">
            <span className="text-4xl block mb-2">QR</span>
            <span className="text-xs font-semibold opacity-70">Self Protocol</span>
          </div>
        </div>

        <a 
          href="https://app.ai.self.xyz" 
          target="_blank" 
          rel="noreferrer"
          className="inline-block text-sage font-bold text-sm hover:underline mb-8"
        >
          Descargar Self Protocol →
        </a>

        {/* Steps */}
        <div className="text-left space-y-4">
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Descargá la app Self Protocol</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Escaneá el código QR</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Seguí las instrucciones en la app</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-sage/20 text-sage flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
            <p className="text-sm text-textdark dark:text-dm-text font-medium">Tu identidad queda verificada en BRENSO</p>
          </div>
        </div>
      </div>
    </div>
  )
}
