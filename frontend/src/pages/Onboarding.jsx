import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import i18n, { STORAGE_KEY } from '../i18n'
import { addContact, registerUser } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'
const CONTACT_NAME_KEY = 'breso_trust_contact_name'
const CONTACT_REL_KEY = 'breso_trust_contact_relation'

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function slugifyName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function LanguageChoice({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('es')}
        className={[
          'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
          value === 'es'
            ? 'border-sage bg-sage text-whiteish'
            : 'border-softgray bg-whiteish text-textdark hover:bg-softgray',
        ].join(' ')}
      >
        🇦🇷 {t('language.es')}
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={[
          'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
          value === 'en'
            ? 'border-sage bg-sage text-whiteish'
            : 'border-softgray bg-whiteish text-textdark hover:bg-softgray',
        ].join(' ')}
      >
        🇺🇸 {t('language.en')}
      </button>
    </div>
  )
}

function Bubble({ from, text }) {
  const isBreso = from === 'breso'
  return (
    <div className={isBreso ? 'flex justify-start' : 'flex justify-end'}>
      <div
        className={[
          'max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow-soft',
          isBreso
            ? 'bg-sage text-whiteish rounded-bl-lg'
            : 'bg-whiteish text-textdark border border-softgray rounded-br-lg',
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

  const initialLang = i18n.language || 'en'

  const [step, setStep] = useState(1) // 1..4
  const [preferredLanguage, setPreferredLanguage] = useState(initialLang)

  const [userName, setUserName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState('')

  const contactCanAdd = useMemo(() => contactName.trim().length > 0 && contactEmail.trim().length > 0, [contactName, contactEmail])

  const setLanguageAndPersist = (lng) => {
    setPreferredLanguage(lng)
    safeSetLocalStorage(STORAGE_KEY, lng)
    i18n.changeLanguage(lng)
  }

  const persistEverything = ({ relation, skipContact }) => {
    safeSetLocalStorage(USER_NAME_KEY, userName.trim())
    if (skipContact) {
      safeSetLocalStorage(CONTACT_NAME_KEY, '')
      safeSetLocalStorage(CONTACT_REL_KEY, '')
      return
    }
    if (contactName.trim()) safeSetLocalStorage(CONTACT_NAME_KEY, contactName.trim())
    safeSetLocalStorage(CONTACT_REL_KEY, relation)
  }

  const finalize = async ({ skipContact }) => {
    setFinalizing(true)
    setError('')
    try {
      const relation = preferredLanguage.startsWith('es') ? 'confianza' : 'friend'

      // 1) Save locally (so UI always has the right name even if backend fails).
      persistEverything({ relation, skipContact })

      // 2) Register user.
      const demoEmail = `${slugifyName(userName)}@breso.dev`
      const demoPassword = 'breso-demo'
      await registerUser({ name: userName.trim(), email: demoEmail, password: demoPassword })

      // 3) Add trusted contact (optional).
      if (!skipContact) {
        await addContact({ name: contactName.trim(), email: contactEmail.trim(), relation })
      }
    } catch {
      // We rely on mock fallback inside api.js; still guard the UI.
      setError(t('common.error'))
    } finally {
      setStep(4)
      setTimeout(() => navigate('/chat'), 500)
      setFinalizing(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-textdark/70">{t('onboarding.guide')}</p>

      <section className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">
        <div className="space-y-4">
          {step >= 1 ? (
            <>
              <Bubble from="breso" text={t('onboarding.step1Prompt')} />
              {step === 1 ? (
                <div>
                  <label className="block text-sm font-semibold text-textdark/90">
                    {t('onboarding.name')}
                  </label>
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                    type="text"
                    placeholder={t('onboarding.name')}
                    autoComplete="name"
                    disabled={finalizing}
                  />
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={finalizing || userName.trim().length === 0}
                      onClick={() => setStep(2)}
                      className="w-full rounded-full bg-sage px-6 py-3 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {t('onboarding.continue')}
                    </button>
                  </div>
                </div>
              ) : (
                <Bubble from="user" text={userName} />
              )}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Bubble from="breso" text={t('onboarding.step2Prompt', { name: userName.trim() })} />
              <LanguageChoice
                value={preferredLanguage}
                onChange={(lng) => {
                  setLanguageAndPersist(lng)
                  setStep(3)
                }}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Bubble from="breso" text={t('onboarding.step3Prompt')} />

              <div className="rounded-xl border border-softgray bg-softgray/40 p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-textdark/90">
                      {t('onboarding.contactName')}
                    </label>
                    <input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                      type="text"
                      placeholder={t('onboarding.contactName')}
                      autoComplete="off"
                      disabled={finalizing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-textdark/90">
                      {t('onboarding.contactEmail')}
                    </label>
                    <input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
                      type="email"
                      placeholder={t('onboarding.contactEmail')}
                      autoComplete="off"
                      disabled={finalizing}
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={finalizing || !contactCanAdd}
                    onClick={() => finalize({ skipContact: false })}
                    className="flex-1 rounded-full bg-sage px-6 py-3 text-sm font-semibold text-whiteish shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('onboarding.addContact')}
                  </button>
                  <button
                    type="button"
                    disabled={finalizing}
                    onClick={() => finalize({ skipContact: true })}
                    className="flex-1 rounded-full border border-softgray bg-whiteish px-6 py-3 text-sm font-semibold text-textdark shadow-soft transition hover:bg-softgray disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('onboarding.skipContact')}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Bubble from="breso" text={t('onboarding.step4Done', { name: userName.trim() })} />
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              ) : null}
              <div className="text-sm font-semibold text-textdark/70">{finalizing ? t('common.loading') : t('common.loading')}</div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
