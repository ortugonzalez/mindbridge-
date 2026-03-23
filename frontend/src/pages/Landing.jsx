import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'

export default function Landing() {
  const [selected, setSelected] = useState(null)
  const [showCards, setShowCards] = useState(false)
  const [showInviteStep, setShowInviteStep] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useTranslation()

  useEffect(() => {
    // Slide up cards after a tiny delay for smooth entry
    const timer = setTimeout(() => setShowCards(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleContinue = () => {
    if (selected === 'patient') {
      try { localStorage.setItem('breso_user_type', 'patient') } catch {}
      navigate('/signin?type=patient')
    } else if (selected === 'family') {
      if (!showInviteStep) {
        setShowInviteStep(true)
        return
      }
      try { localStorage.setItem('breso_user_type', 'family') } catch {}
      if (inviteToken.trim()) {
        try { localStorage.setItem('breso_invite_token', inviteToken.trim()) } catch {}
        navigate(`/signin?type=family&invite=${inviteToken.trim()}`)
      } else {
        navigate('/signin?type=family')
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F5] dark:bg-dm-bg transition-colors duration-300">
      {/* Top 60% Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#FAF8F5] to-[#F0F5F0] dark:from-[#2D3B2D] dark:to-[#1F2E1F]">
        <img
          src={theme === 'dark' ? '/logo-dark.svg' : '/logo.svg'}
          alt="BRESO"
          style={{ width: 160, height: 'auto', margin: '0 auto 24px', display: 'block' }}
        />

        <h1 className="text-[24px] font-[400] text-[#2D2D2D] dark:text-dm-text mb-6">
          {t('landing.tagline')}
        </h1>

        <p className="text-[16px] italic text-[#6B7280] dark:text-[#9CAF9C] max-w-[320px] mx-auto mb-8 font-serif leading-relaxed">
          "{t('landing.origin_quote')}"
        </p>

        <p className="text-[15px] text-[#4B5563] dark:text-[#E8EDE8]/80 max-w-sm mx-auto leading-[1.7] px-4 font-medium">
          {t('landing.description')}
        </p>
      </div>

      {/* Bottom 40% Type Selection */}
      <div
        className={`bg-white dark:bg-[#3D4F3D] rounded-t-[2.5rem] p-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col items-center transition-transform duration-700 ease-out transform ${
          showCards ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="w-12 h-1.5 bg-[#E5E7EB] dark:bg-[#4A5E4A] rounded-full mb-6"></div>
        {!showInviteStep ? (
          <>
            <h2 className="text-[18px] font-[500] text-[#2D2D2D] dark:text-dm-text mb-6 text-center">
              {t('landing.forWho')}
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
                <h3 className="text-[16px] font-bold text-[#2D2D2D] dark:text-dm-text mb-1">{t('landing.card_patient_title')}</h3>
                <p className="text-[13px] text-[#6B7280] dark:text-dm-muted leading-tight">{t('landing.card_patient_subtitle')}</p>
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
                <h3 className="text-[16px] font-bold text-[#2D2D2D] dark:text-dm-text mb-1">{t('landing.card_family_title')}</h3>
                <p className="text-[13px] text-[#6B7280] dark:text-dm-muted leading-tight">{t('landing.card_family_subtitle')}</p>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[18px] font-[500] text-[#2D2D2D] dark:text-dm-text mb-4 text-center">
              {t('landing.inviteTitle')}
            </h2>
            <div className="flex flex-col w-full max-w-md gap-3 mb-6 animate-fade-up">
              <div className="flex flex-col gap-2 p-4 rounded-xl border-2 border-sage/30 bg-sage/5 dark:bg-sage/10">
                <span className="font-semibold text-sm text-textdark dark:text-dm-text">{t('landing.hasInvite')}</span>
                <input
                  type="text"
                  placeholder={t('landing.invitePlaceholder')}
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  className="w-full rounded-lg border border-softgray px-3 py-2 text-sm outline-none focus:border-sage bg-white dark:bg-dm-surface dark:text-dm-text dark:border-dm-border"
                />
              </div>
              <button
                onClick={() => {
                  setInviteToken('')
                  try { localStorage.setItem('breso_user_type', 'family') } catch {}
                  navigate('/signin?type=family')
                }}
                className="text-left p-4 rounded-xl border-2 border-softgray dark:border-dm-border hover:border-sage/50 transition-colors"
              >
                <span className="font-semibold text-sm text-textdark dark:text-dm-text">{t('landing.skipInvite')}</span>
              </button>
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="w-full max-w-md transition-all duration-500 ease-in-out">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`w-full bg-[#7C9A7E] text-white font-bold text-[16px] py-4 rounded-full shadow-soft transition-all duration-300 ${
              !selected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6b866c] hover:scale-[1.02] active:scale-95'
            }`}
          >
            {t('landing.continue')}
          </button>
          <p className="text-center text-xs text-textdark/50 dark:text-dm-muted mt-4">
            {t('landing.have_account')}{' '}
            <button
              type="button"
              onClick={() => navigate('/signin')}
              className="text-sage font-semibold hover:underline"
            >
              {t('landing.signin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
