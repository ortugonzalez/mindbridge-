import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

async function fetchCashback(token) {
  try {
    const res = await fetch(`${BASE_URL}/payments/my-cashback`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Return first pending cashback if exists
    const items = Array.isArray(data) ? data : (data.cashbacks || data.items || [])
    return items.length > 0 ? items[0] : null
  } catch { return null }
}

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
  const [cashback, setCashback] = useState(null)
  const [showSavedName, setShowSavedName] = useState(false)
  const [showSavedPhone, setShowSavedPhone] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const localName = safeGet('breso_user_name')
      const localPhone = safeGet('breso_phone')

      if (mounted) {
          setProfile({
            name: localName,
            email: '',
            phone: localPhone,
            type: safeGet('breso_user_type') || 'patient',
            plan: safeGet('breso_selected_plan') || 'free',
            trialDaysRemaining: 15,
            isVerified: false,
          })
        setNameVal(localName)
        setPhoneVal(localPhone)
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session?.user?.email) {
          setProfile(prev => prev ? { ...prev, email: session.user.email } : prev)
        }

        const token = session?.access_token || safeGet('breso_token')
        if (token) {
          const res = await fetch(`${BASE_URL}/users/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          })
          if (res.ok && mounted) {
            const data = await res.json()
            setProfile(prev => {
              const newP = {
                ...prev,
                name: data.name || data.display_name || prev.name,
                phone: data.phone || data.phone_number || prev.phone,
                type: data.user_type || prev.type,
                plan: data.plan || prev.plan,
                trialDaysRemaining: data.trial_days_left ?? prev.trialDaysRemaining,
                isVerified: Boolean(data.identity_verified ?? prev.isVerified),
              }
              setNameVal(newP.name)
              setPhoneVal(newP.phone)
              return newP
            })
            fetchCashback(token).then(cb => { if (mounted) setCashback(cb) })
          }
        }
      } catch (e) {
        console.error('Profile load error:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const saveName = async () => {
    setSaving(true)
    try { localStorage.setItem('breso_user_name', nameVal.trim()) } catch (storageError) { console.warn('[Profile] name cache failed', storageError?.message || storageError) }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || safeGet('breso_token')
      await fetch(`${BASE_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ display_name: nameVal.trim() }),
        signal: AbortSignal.timeout(5000),
      })
    } catch (err) { console.warn('[Profile] saveName sync failed', err?.message || err) }
    setProfile(p => ({ ...p, name: nameVal.trim() }))
    setSaving(false)
    setEditingName(false)
    setShowSavedName(true)
    setTimeout(() => setShowSavedName(false), 2000)
  }

  const savePhone = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || safeGet('breso_token')
      await fetch(`${BASE_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone_number: phoneVal.trim() }),
        signal: AbortSignal.timeout(5000),
      })
    } catch (err) { console.warn('[Profile] savePhone sync failed', err?.message || err) }
    setProfile(p => ({ ...p, phone: phoneVal.trim() }))
    setSaving(false)
    setEditingPhone(false)
    setShowSavedPhone(true)
    setTimeout(() => setShowSavedPhone(false), 2000)
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
                <div className="flex items-center gap-2">
                  <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.name || '—'}</span>
                  {showSavedName && <span className="text-xs font-bold text-sage animate-fade-in">{t('profile.saved')}</span>}
                </div>
                <button type="button" onClick={() => setEditingName(true)} className="p-1.5 rounded-lg text-textdark/50 hover:text-sage hover:bg-sage/10 transition-colors">
                  ✏️
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
                <div className="flex items-center gap-2">
                  <span className="text-base text-textdark dark:text-dm-text font-medium">{profile.phone || '—'}</span>
                  {showSavedPhone && <span className="text-xs font-bold text-sage animate-fade-in">{t('profile.saved')}</span>}
                </div>
                <button type="button" onClick={() => setEditingPhone(true)} className="p-1.5 rounded-lg text-textdark/50 hover:text-sage hover:bg-sage/10 transition-colors">
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-sage overflow-hidden shadow-soft">
        <div className="bg-sage px-5 py-4">
          <h3 className="text-lg font-bold text-white mb-1">{t('profile.subscription')}</h3>
          <p className="text-white/90 text-sm capitalize">{profile.plan === 'free_trial' || profile.plan === 'free' ? 'Prueba gratuita' : profile.plan}</p>
        </div>
        <div className="bg-white dark:bg-dm-surface p-5 space-y-4">
          {profile.plan === 'free_trial' || profile.plan === 'free' ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10 text-sage text-xl">⏳</span>
                <p className="text-sm font-medium text-textdark dark:text-dm-text">
                  Te quedan {profile.trialDaysRemaining} días de prueba
                </p>
              </div>
              <div className="w-full h-2 bg-softgray dark:bg-dm-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sage transition-all duration-700" 
                  style={{ width: `${Math.min(100, (profile.trialDaysRemaining / 15) * 100)}%` }} 
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage/10 text-sage text-xl">📅</span>
              <p className="text-sm font-medium text-textdark dark:text-dm-text">
                Próxima renovación: 14 de Mayo, 2026
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="w-full py-2.5 rounded-xl border-2 border-sage text-sage font-medium hover:bg-sage hover:text-white transition-colors mt-2"
          >
            Cambiar plan
          </button>
        </div>
      </div>

      {/* Verification Block */}
      <div className="rounded-2xl bg-white dark:bg-dm-surface p-6 shadow-soft border border-softgray dark:border-dm-border">
        {profile.isVerified ? (
          <div className="flex items-center gap-4">
            <span className="text-3xl">✅</span>
            <div>
              <p className="text-base font-bold text-textdark dark:text-dm-text">{t('profile.verification_done')}</p>
              <p className="text-sm text-textdark/70 dark:text-dm-muted">Verificado con Self Protocol</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔐</span>
              <p className="text-base font-bold text-textdark dark:text-dm-text">{t('profile.verify_identity')}</p>
            </div>
            <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed mb-4">
              Usamos Self Protocol para verificar que sos una persona real, sin exponer tus datos.
            </p>
            <button
              onClick={() => navigate('/verify-identity')}
              className="w-full py-2.5 rounded-xl bg-sage text-white font-bold hover:bg-sage/90 transition-colors shadow-sm"
            >
              {t('profile.verification_pending')}
            </button>
          </div>
        )}
      </div>

      {/* DeFi Cashback Card */}
      {cashback && (
        <div className="rounded-2xl bg-[#F0F7F0] dark:bg-sage/10 border border-sage/30 p-5 space-y-3 shadow-sm">
          <p className="text-sm font-bold text-[#4A7A4C] dark:text-sage">{t('profile.cashbackTitle')}</p>
          <div className="space-y-1.5 text-sm text-[#4A7A4C]/90 dark:text-sage/80">
            <div className="flex justify-between">
              <span>{t('profile.cashbackYield')}</span>
              <span className="font-semibold">${(cashback.yield_generated_monthly ?? cashback.yield_generated ?? 0).toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('profile.cashbackAvailable')}</span>
              <span className="font-semibold">${(cashback.cashback_amount ?? cashback.cashback_usd ?? 0).toFixed(3)}</span>
            </div>
            {cashback.expires_at && (
              <div className="flex justify-between">
                <span>{t('profile.cashbackValidUntil')}</span>
                <span className="font-semibold">
                  {new Date(cashback.expires_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-[#4A7A4C]/65 dark:text-sage/50 leading-relaxed">
            {t('profile.cashbackNote')}
          </p>
        </div>
      )}
    </div>
  )
}
