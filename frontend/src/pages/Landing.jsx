import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function Landing() {
  const [selected, setSelected] = useState(null)
  const [showCards, setShowCards] = useState(false)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    // Slide up cards after a tiny delay for smooth entry
    const t = setTimeout(() => setShowCards(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleContinue = () => {
    if (selected === 'patient') navigate('/signin?type=patient')
    else if (selected === 'family') navigate('/signin?type=family')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-300">
      {/* Top 60% Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FAF8F5] to-[#F0F5F0] dark:from-[#2D3B2D] dark:to-[#1F2E1F]">
        <img 
          src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'} 
          alt="BRESO Logo" 
          className="w-48 mb-8"
          onError={(e) => {
            // Fallback if logo-dark missing
            if(theme === 'dark') e.target.src = '/logo.svg'
          }}
        />

        <h1 className="text-[24px] font-[400] text-[#2D2D2D] dark:text-dm-text mb-6">
          Tu acompañante de bienestar emocional
        </h1>

        <p className="text-[16px] italic text-[#6B7280] dark:text-[#9CAF9C] max-w-[320px] mx-auto mb-8 font-serif leading-relaxed">
          "A todos nos hubiese gustado que nos ayudaran a entender lo que pasaba a nuestro alrededor."
        </p>

        <p className="text-[15px] text-[#4B5563] dark:text-[#E8EDE8]/80 max-w-sm mx-auto leading-[1.7] px-4 font-medium">
          BRESO es un espacio seguro donde Soledad, tu acompañante de IA, te escucha todos los días, detecta cómo estás y coordina apoyo cuando lo necesitás.
        </p>
      </div>

      {/* Bottom 40% Type Selection */}
      <div 
        className={`bg-white dark:bg-[#3D4F3D] rounded-t-[2.5rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col items-center transition-transform duration-700 ease-out transform ${
          showCards ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="w-12 h-1.5 bg-[#E5E7EB] dark:bg-[#4A5E4A] rounded-full mb-6"></div>
        <h2 className="text-[18px] font-[500] text-[#2D2D2D] dark:text-dm-text mb-6 text-center">
          ¿Para quién es BRESO?
        </h2>

        <div className="flex flex-col sm:flex-row w-full max-w-md gap-4 mb-6">
          {/* Card Left: Para mí */}
          <button
            onClick={() => setSelected('patient')}
            className={`flex-1 text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
              selected === 'patient' 
                ? 'border-[#7C9A7E] bg-[#F0F7F0] dark:bg-[#7C9A7E]/20 shadow-md scale-[1.02]' 
                : 'border-[#E5E7EB] dark:border-[#4A5E4A] hover:border-[#7C9A7E]/50'
            }`}
          >
            <div className="text-[40px] mb-3 leading-none drop-shadow-sm">🌱</div>
            <h3 className="text-[16px] font-bold text-[#2D2D2D] dark:text-dm-text mb-1">Quiero cuidarme</h3>
            <p className="text-[13px] text-[#6B7280] dark:text-dm-muted leading-tight">Hablá con Soledad cada día</p>
          </button>

          {/* Card Right: Para alguien que quiero */}
          <button
            onClick={() => setSelected('family')}
            className={`flex-1 text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
              selected === 'family' 
                ? 'border-[#7C9A7E] bg-[#F0F7F0] dark:bg-[#7C9A7E]/20 shadow-md scale-[1.02]' 
                : 'border-[#E5E7EB] dark:border-[#4A5E4A] hover:border-[#7C9A7E]/50'
            }`}
          >
            <div className="text-[40px] mb-3 leading-none drop-shadow-sm">🤝</div>
            <h3 className="text-[16px] font-bold text-[#2D2D2D] dark:text-dm-text mb-1">Quiero acompañar</h3>
            <p className="text-[13px] text-[#6B7280] dark:text-dm-muted leading-tight">Seguí el bienestar de alguien cercano</p>
          </button>
        </div>

        {/* Action Button */}
        <div className={`w-full max-w-md transition-all duration-500 ease-in-out overflow-hidden ${
          selected ? 'opacity-100 max-h-20 translate-y-0' : 'opacity-0 max-h-0 translate-y-4'
        }`}>
          <button
            onClick={handleContinue}
            className="w-full bg-[#7C9A7E] hover:bg-[#6b866c] text-white font-bold text-[16px] py-4 rounded-full shadow-soft transition-transform hover:scale-[1.02] active:scale-95"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
