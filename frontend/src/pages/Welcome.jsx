import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

function getGreetingKey() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'welcome.greetingMorning'
  if (h >= 12 && h < 20) return 'welcome.greetingAfternoon'
  return 'welcome.greetingNight'
}

export default function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showQuestion, setShowQuestion] = useState(false)
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setShowQuestion(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleContinue = () => {
    try { localStorage.setItem('breso_arrival_reason', answer.trim()) } catch {}
    navigate('/onboarding')
  }

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-[#FAF8F5] dark:bg-dm-bg">
      <div className="flex min-h-full items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg space-y-10 animate-fade-up">

          {/* Time greeting */}
          <h1 className="text-4xl font-light tracking-wide text-textdark dark:text-dm-text">
            {t(getGreetingKey())}
          </h1>

          {/* Intro paragraphs */}
          <div className="space-y-5 text-lg leading-relaxed text-textdark/75 dark:text-dm-text/75">
            <p>{t('welcome.intro1')}</p>
            <p>{t('welcome.intro2')}</p>
            <p>{t('welcome.intro3')}</p>
          </div>

          {/* Question — appears after 2s */}
          {showQuestion && (
            <div className="space-y-5 animate-fade-up">
              <p className="text-xl font-medium text-textdark dark:text-dm-text">
                {t('welcome.question')}
              </p>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                autoFocus
                placeholder={t('welcome.questionPlaceholder')}
                className="w-full resize-none rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface px-5 py-4 text-base text-textdark dark:text-dm-text placeholder-textdark/30 dark:placeholder-dm-muted/50 outline-none focus:border-sage transition"
              />

              <button
                type="button"
                onClick={handleContinue}
                className="w-full rounded-full bg-sage px-6 py-4 text-base font-semibold text-white shadow-soft transition hover:opacity-90"
              >
                {t('welcome.continue')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
