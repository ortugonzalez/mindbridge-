import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

function safeGet(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [phoneVal, setPhoneVal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || safeGet('breso_token')
        const res = await fetch(`${BASE_URL}/users/me/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok && mounted) {
          const data = await res.json()
          const p = {
            name: data.name || data.display_name || safeGet('breso_user_name') || '',
            email: data.email || session?.user?.email || '',
            phone: data.phone || data.phone_number || '',
            type: data.user_type || safeGet('breso_user_type') || 'patient',
            plan: data.plan || safeGet('breso_selected_plan') || 'free',
            trialDaysRemaining: data.trial_days_left ?? 15,
          }
          setProfile(p)
          setNameVal(p.name)
          setPhoneVal(p.phone)
          return
        }
      } catch {}
      // Fallback to localStorage
      if (mounted) {
        const p = {
          name: safeGet('breso_user_name'),
          email: '',
          phone: '',
          type: safeGet('breso_user_type') || 'patient',
          plan: safeGet('breso_selected_plan') || 'free',
          trialDaysRemaining: 15,
        }
        setProfile(p)
        setNameVal(p.name)
        setPhoneVal(p.phone)
      }
    })()
    return () => { mounted = false }
  }, [])

  const saveName = async () => {
    setSaving(true)
    try { localStorage.setItem('breso_user_name', nameVal.trim()) } catch {}
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || safeGet('breso_token')
      await fetch(`${BASE_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: nameVal.trim() }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {}
    setProfile(p => ({ ...p, name: nameVal.trim() }))
    setSaving(false)
    setEditingName(false)
  }

  const savePhone = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || safeGet('breso_token')
      await fetch(`${BASE_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone: phoneVal.trim() }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {}
    setProfile(p => ({ ...p, phone: phoneVal.trim() }))
    setSaving(false)
    setEditingPhone(false)
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'patient': return t('profile.type_patient')
      case 'family': return t('profile.type_family')
      case 'professional': return t('profile.type_professional')
      default: return type
    }
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage border-r-transparent" />
          <p className="text-sm text-textdark/60 dark:text-dm-muted">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full rounded-xl border border-sage/50 bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text px-3 py-2 text-base outline-none focus:border-sage transition'

  return (
    <div className="animate-fade-in-page space-y-6">
      <h1 className="text-2xl font-bold text-textdark dark:text-dm-text">{t('profile.title')}</h1>

      {/* Profile Info */}
      <div className="rounded-2xl bg-white dark:bg-dm-surface p-6 shadow-soft space-y-5">
        <div className="inline-flex items-center rounded-full bg-sage/10 dark:bg-sage/20 px-3 py-1 text-xs font-semibold text-sage">
          {getTypeBadge(profile.type)}
        </div>

        <div className="space-y-4 pt-2">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.name')}
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  className={inputCls}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                />
                <button
                  type="button"
                  onClick={saveName}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl bg-sage text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? '...' : t('profile.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setNameVal(profile.name) }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-textdark/50 dark:text-dm-muted hover:bg-softgray dark:hover:bg-dm-border"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.name || '—'}</span>
                <button type="button" onClick={() => setEditingName(true)} className="text-sm font-medium text-sage hover:underline">
                  {t('profile.edit')}
                </button>
              </div>
            )}
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.email')}
            </label>
            <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.email || '—'}</span>
          </div>

          <hr className="border-softgray dark:border-dm-border" />

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-textdark/60 dark:text-dm-muted uppercase tracking-wider mb-1">
              {t('profile.phone')}
            </label>
            {editingPhone ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="tel"
                  value={phoneVal}
                  onChange={e => setPhoneVal(e.target.value)}
                  className={inputCls}
                  onKeyDown={e => e.key === 'Enter' && savePhone()}
                />
                <button
                  type="button"
                  onClick={savePhone}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl bg-sage text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? '...' : t('profile.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingPhone(false); setPhoneVal(profile.phone) }}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-textdark/50 dark:text-dm-muted hover:bg-softgray dark:hover:bg-dm-border"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.phone || '—'}</span>
                <button type="button" onClick={() => setEditingPhone(true)} className="text-sm font-medium text-sage hover:underline">
                  {t('profile.edit')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Card */}
      <div className="rounded-2xl border-2 border-sage overflow-hidden shadow-soft">
        <div className="bg-sage px-5 py-4">
          <h3 className="text-lg font-bold text-white mb-1">{t('profile.current_plan')}</h3>
          <p className="text-white/90 text-sm capitalize">{profile.plan}</p>
        </div>
        <div className="bg-white dark:bg-dm-surface p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10 text-sage">⏳</span>
            <p className="text-sm font-medium text-textdark dark:text-dm-text">
              {t('profile.days_left', { days: profile.trialDaysRemaining })}
            </p>
          </div>
          {/* FIX 3: navigate to /landing, not / */}
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="w-full py-2.5 rounded-xl border-2 border-sage text-sage font-medium hover:bg-sage hover:text-white transition-colors"
          >
            {t('profile.change_plan')}
          </button>
        </div>
      </div>
    </div>
  )
}
