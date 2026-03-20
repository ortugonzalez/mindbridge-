import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  // Mock data fetching from GET /users/me/profile
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    // Simulate network delay
    const timer = setTimeout(() => {
      setProfile({
        name: 'Maria Garcia',
        email: 'maria@example.com',
        phone: '+54 11 1234 5678',
        type: 'patient', // 'patient' | 'family' | 'professional'
        plan: 'free',
        trialDaysRemaining: 12
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage border-r-transparent"></div>
          <p className="text-sm text-textdark/60 dark:text-dm-muted">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  const getTypeBadge = (type) => {
    switch(type) {
      case 'patient': return t('profile.type_patient')
      case 'family': return t('profile.type_family')
      case 'professional': return t('profile.type_professional')
      default: return type
    }
  }

  return (
    <div className="animate-fade-in-page space-y-6">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">
        {t('profile.title')}
      </h1>

      {/* Profile Info Card */}
      <div className="rounded-2xl bg-white dark:bg-dm-surface p-6 shadow-soft space-y-5">
        
        {/* Type Badge */}
        <div className="inline-flex items-center rounded-full bg-sage/10 dark:bg-sage/20 px-3 py-1 text-xs font-semibold text-sage">
          {getTypeBadge(profile.type)}
        </div>

        <div className="space-y-4 pt-2">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.name')}
            </label>
            <div className="flex items-center justify-between">
              <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.name}</span>
              <button type="button" className="text-sm font-medium text-sage hover:underline">
                {t('profile.edit')}
              </button>
            </div>
          </div>
          
          <hr className="border-softgray dark:border-dm-border" />

          {/* Email Field */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.email')}
            </label>
            <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.email}</span>
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.phone')}
            </label>
            <div className="flex items-center justify-between">
              <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.phone}</span>
              <button type="button" className="text-sm font-medium text-sage hover:underline">
                {t('profile.edit')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Card */}
      <div className="rounded-2xl border-2 border-sage overflow-hidden shadow-soft">
        <div className="bg-sage px-5 py-4">
          <h3 className="text-lg font-bold text-white mb-1">{t('profile.current_plan')}</h3>
          <p className="text-white/90 text-sm">{t(`landing.${profile.plan}.title`, 'Gratuito')}</p>
        </div>
        <div className="bg-white dark:bg-dm-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10 text-sage">⏳</span>
            <div>
              <p className="text-sm font-medium text-textdark dark:text-dm-text">
                {t('profile.days_left', { days: profile.trialDaysRemaining })}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl border-2 border-sage text-sage font-medium hover:bg-sage hover:text-white dark:hover:bg-sage dark:hover:text-white transition-colors"
          >
            {t('profile.change_plan')}
          </button>
        </div>
      </div>

    </div>
  )
}
