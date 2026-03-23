import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { addContact, registerUser, saveProfile } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'
const USER_PHONE_KEY = 'breso_user_phone'
const CONTACT_NAME_KEY = 'breso_trust_contact_name'
const CONTACT_REL_KEY = 'breso_trust_contact_relation'
const CONTACT_PHONE_KEY = 'breso_trust_contact_phone'

function safeSet(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

function slugifyName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function Bubble({ from, text }) {
  const fromSoledad = from === 'breso'
  return (
    <div className={fromSoledad ? 'flex items-end gap-2' : 'flex justify-end'}>
      {fromSoledad && (
        <div className="h-7 w-7 flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold">
          S
        </div>
      )}
      <div
        className={[
          'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          fromSoledad
            ? 'bg-sage text-white rounded-bl-sm'
            : 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text border border-softgray dark:border-dm-border rounded-br-sm',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [phoneCountry, setPhoneCountry] = useState('+54')
  const [userPhone, setUserPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRelation, setContactRelation] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState('')

  const relationOptions = t('onboarding.relationOptions', { returnObjects: true }) || []

  const finalize = async ({ skipContact }) => {
    setFinalizing(true)
    setError('')
    try {
      safeSet(USER_NAME_KEY, userName.trim())
      if (userPhone.trim()) safeSet(USER_PHONE_KEY, phoneCountry + userPhone.trim())
      if (!skipContact && contactName.trim()) {
        safeSet(CONTACT_NAME_KEY, contactName.trim())
        safeSet(CONTACT_REL_KEY, contactRelation)
        if (contactPhone.trim()) safeSet(CONTACT_PHONE_KEY, contactPhone.trim())
      }
      const demoEmail = `${slugifyName(userName)}@breso.dev`
      await registerUser({ name: userName.trim(), email: demoEmail, password: 'breso-demo' })
      await saveProfile({
        display_name: userName.trim(),
        phone_number: userPhone.trim() ? phoneCountry + userPhone.trim() : undefined,
        plan: 'free_trial',
        user_type: 'patient',
      }).catch(() => {})
      if (!skipContact && contactName.trim()) {
        await addContact({ name: contactName.trim(), email: contactEmail.trim(), relation: contactRelation })
      }
    } catch {
      setError(t('common.error'))
    } finally {
      setStep(4)
      setFinalizing(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text px-4 py-3 text-base outline-none focus:border-sage transition placeholder-textdark/30 dark:placeholder-dm-muted/50'
  const inputSmCls = 'w-full rounded-xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text px-4 py-2.5 text-sm outline-none focus:border-sage transition placeholder-textdark/30 dark:placeholder-dm-muted/50'
  const btnPrimary = 'flex-1 rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-40'
  const btnSecondary = 'flex-1 rounded-full border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface px-5 py-3 text-sm font-semibold text-textdark dark:text-dm-text transition hover:bg-softgray dark:hover:bg-dm-border'

  const totalSteps = 4
  const progressPct = Math.min(100, ((step - 1) / (totalSteps - 1)) * 100)

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Progress bar */}
      <div className="px-1 pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-textdark/50 dark:text-dm-muted">
            Paso {Math.min(step, totalSteps)} de {totalSteps}
          </span>
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="text-xs font-medium text-textdark/40 dark:text-dm-muted hover:text-sage transition"
            >
              ← Volver
            </button>
          )}
        </div>
        <div className="h-1.5 w-full bg-softgray dark:bg-dm-border rounded-full overflow-hidden">
          <div
            className="h-full bg-sage rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-5 shadow-soft">
        {/* Soledad avatar row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <span className="text-xs font-semibold text-textdark/60 dark:text-dm-muted">Soledad</span>
        </div>
        <div className="space-y-5">

          {/* STEP 1 — Name */}
          {step >= 1 && (
            <>
              <Bubble from="breso" text={t('onboarding.step1Prompt')} />
              {step === 1 ? (
                <div className="space-y-3">
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className={inputCls}
                    type="text"
                    placeholder={t('onboarding.namePlaceholder')}
                    autoComplete="given-name"
                    autoFocus
                    disabled={finalizing}
                    onKeyDown={(e) => { if (e.key === 'Enter' && userName.trim()) setStep(2) }}
                  />
                  <button
                    type="button"
                    disabled={!userName.trim()}
                    onClick={() => setStep(2)}
                    className="w-full rounded-full bg-sage px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-40"
                  >
                    {t('onboarding.continue')}
                  </button>
                </div>
              ) : (
                <Bubble from="user" text={userName} />
              )}
            </>
          )}

          {/* STEP 2 — User's own phone number */}
          {step >= 2 && (
            <>
              <Bubble from="breso" text={t('onboarding.step2Prompt')} />
              {step === 2 ? (
                <div className="space-y-3">
                  {/* Title */}
                  <div className="rounded-xl bg-softgray/60 dark:bg-dm-bg px-4 py-3">
                    <p className="text-sm font-semibold text-textdark dark:text-dm-text">{t('onboarding.step2Title')}</p>
                    <p className="mt-1 text-xs text-textdark/55 dark:text-dm-muted leading-relaxed">{t('onboarding.step2Subtitle')}</p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text px-3 py-3 text-sm outline-none focus:border-sage transition flex-shrink-0"
                    >
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+598">🇺🇾 +598</option>
                      <option value="+595">🇵🇾 +595</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+34">🇪🇸 +34</option>
                    </select>
                    <input
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      className="flex-1 rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text px-4 py-3 text-base outline-none focus:border-sage transition placeholder-textdark/30 dark:placeholder-dm-muted/50"
                      type="tel"
                      placeholder={t('onboarding.phonePlaceholder')}
                      disabled={finalizing}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={!userPhone.trim()} onClick={() => setStep(3)} className={btnPrimary}>
                      {t('onboarding.continue')}
                    </button>
                    <button type="button" onClick={() => setStep(3)} className={btnSecondary}>
                      {t('onboarding.skip')}
                    </button>
                  </div>
                </div>
              ) : (
                step > 2 && userPhone.trim() && <Bubble from="user" text={`${phoneCountry} ${userPhone}`} />
              )}
            </>
          )}

          {/* STEP 3 — Trusted contact */}
          {step >= 3 && (
            <>
              <Bubble from="breso" text={t('onboarding.step3Prompt')} />
              {step === 3 ? (
                <div className="space-y-3 rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg p-4">
                  {/* Contact note */}
                  <p className="text-xs text-textdark/55 dark:text-dm-muted leading-relaxed">{t('onboarding.step3ContactNote')}</p>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className={inputSmCls}
                    type="text"
                    placeholder={t('onboarding.contactName')}
                    disabled={finalizing}
                  />
                  <select
                    value={contactRelation}
                    onChange={(e) => setContactRelation(e.target.value)}
                    className={inputSmCls}
                    disabled={finalizing}
                  >
                    <option value="">{t('onboarding.contactRelationPlaceholder')}</option>
                    {Array.isArray(relationOptions) && relationOptions.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className={inputSmCls}
                    type="tel"
                    placeholder={t('onboarding.contactPhone')}
                    disabled={finalizing}
                  />
                  <input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={inputSmCls}
                    type="email"
                    placeholder={t('onboarding.contactEmail')}
                    disabled={finalizing}
                  />
                  <div className="flex gap-2 pt-1">
                    <button type="button" disabled={finalizing || !contactName.trim()} onClick={() => finalize({ skipContact: false })} className={btnPrimary}>
                      {t('onboarding.addContact')}
                    </button>
                    <button type="button" disabled={finalizing} onClick={() => finalize({ skipContact: true })} className={btnSecondary}>
                      {t('onboarding.skip')}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* STEP 4 — Done */}
          {step === 4 && (
            <>
              <Bubble from="breso" text={t('onboarding.step4Done', { name: userName.trim() })} />
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <button
                type="button"
                disabled={finalizing}
                onClick={() => navigate('/chat')}
                className="w-full rounded-full bg-sage px-6 py-4 text-base font-semibold text-white shadow-soft transition hover:opacity-90 disabled:opacity-40"
              >
                {t('onboarding.start')}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
