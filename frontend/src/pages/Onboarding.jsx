import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addContact, setupProfile } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'
const USER_PHONE_KEY = 'breso_user_phone'
const CONTACT_NAME_KEY = 'breso_trust_contact_name'
const CONTACT_REL_KEY = 'breso_trust_contact_relation'
const CONTACT_PHONE_KEY = 'breso_trust_contact_phone'

function safeSet(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

export default function Onboarding() {
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

      await setupProfile({
        user_type: 'patient',
        display_name: userName.trim(),
        phone_number: userPhone.trim() ? phoneCountry + userPhone.trim() : undefined,
      }).catch(() => {})

      if (!skipContact && contactName.trim()) {
        await addContact({ name: contactName.trim(), email: contactEmail.trim(), relation: contactRelation })
      }
      
      setStep(4)
    } catch {
      setError('Ocurrió un error al guardar tu perfil. Intentá de nuevo.')
    } finally {
      setFinalizing(false)
    }
  }

  const renderProgressBar = () => (
    <div className="w-full h-1.5 rounded-full bg-softgray/50 dark:bg-dm-border overflow-hidden mb-8">
      <div 
        className="h-full bg-sage transition-all duration-700 ease-out" 
        style={{ width: `${(step / 4) * 100}%` }}
      />
    </div>
  )

  const renderSoledadPrompt = (text) => (
    <div className="flex items-start gap-4 mb-8">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-[#7C9A7E] flex items-center justify-center text-white text-base font-bold shadow-soft">
        S
      </div>
      <div className="bg-[#F0F7F0] dark:bg-sage/10 rounded-2xl rounded-tl-sm px-5 py-4 text-textdark dark:text-dm-text text-base font-medium leading-relaxed border border-[#7C9A7E]/20 shadow-sm relative">
        {text}
      </div>
    </div>
  )

  const inputCls = 'w-full rounded-xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text px-4 py-3.5 text-base outline-none focus:border-sage transition placeholder-textdark/40 dark:placeholder-dm-muted/50 shadow-sm'
  const btnPrimary = 'w-full flex justify-center rounded-xl bg-[#7C9A7E] px-6 py-4 text-base font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none'
  const btnSecondary = 'w-full flex justify-center rounded-xl border-2 border-[#7C9A7E] px-6 py-3.5 text-base font-bold text-[#7C9A7E] transition hover:bg-[#7C9A7E]/5 disabled:opacity-50 disabled:pointer-events-none'

  return (
    <div className="min-h-[90vh] flex flex-col pt-10 px-4 max-w-[480px] mx-auto animate-fade-in-page">
      {renderProgressBar()}

      <div className="flex items-center justify-between mb-8">
        <span className="text-xs font-black text-textdark/50 dark:text-dm-muted tracking-[0.15em] uppercase">
          Paso {step} de 4
        </span>
        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)} className="text-sm font-semibold text-sage hover:underline">
            ← Volver
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {step === 1 && (
          <div className="animate-fade-up flex-1 flex flex-col">
            {renderSoledadPrompt('Para empezar, ¿cómo te llamás?')}
            <div className="mt-auto space-y-4 pb-8">
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className={inputCls}
                type="text"
                placeholder="Tu nombre o apodo"
                autoComplete="given-name"
                autoFocus
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' && userName.trim()) {
                    safeSet(USER_NAME_KEY, userName.trim())
                    setStep(2)
                  }
                }}
              />
              <button
                type="button"
                disabled={!userName.trim()}
                onClick={() => {
                  safeSet(USER_NAME_KEY, userName.trim())
                  setStep(2)
                }}
                className={btnPrimary}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up flex-1 flex flex-col">
            {renderSoledadPrompt('Para poder avisarte si algo importante pasa, me gustaría tener tu número. Solo lo uso para alertas.')}
            <div className="mt-auto space-y-4 pb-8">
              <div className="flex gap-2">
                <select
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  className="rounded-xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface text-textdark dark:text-dm-text px-3 py-3.5 text-sm font-medium outline-none focus:border-sage transition flex-shrink-0 shadow-sm"
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
                  className={inputCls}
                  type="tel"
                  placeholder="Tu número"
                  autoFocus
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && userPhone.trim()) {
                      safeSet(USER_PHONE_KEY, phoneCountry + userPhone.trim())
                      setStep(3)
                    } 
                  }}
                />
              </div>
              <button type="button" disabled={!userPhone.trim()} onClick={() => {
                safeSet(USER_PHONE_KEY, phoneCountry + userPhone.trim())
                setStep(3)
              }} className={btnPrimary}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up flex-1 flex flex-col">
            {renderSoledadPrompt('¿Hay alguien de confianza que quieras agregar? No es obligatorio.')}
            <div className="mt-8 space-y-3 pb-8">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputCls}
                type="text"
                placeholder="Nombre de tu contacto"
                disabled={finalizing}
              />
              <select
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                className={inputCls}
                disabled={finalizing}
              >
                <option value="">Relación (opcional)</option>
                <option value="parent">Padre/Madre</option>
                <option value="sibling">Hermano/a</option>
                <option value="partner">Pareja</option>
                <option value="friend">Amigo/a</option>
                <option value="other">Otro</option>
              </select>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputCls}
                type="tel"
                placeholder="Teléfono (opcional)"
                disabled={finalizing}
              />
              <input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputCls}
                type="email"
                placeholder="Email (opcional)"
                disabled={finalizing}
              />
              <div className="pt-4 space-y-3">
                <button type="button" disabled={finalizing || !contactName.trim()} onClick={() => finalize({ skipContact: false })} className={btnPrimary}>
                  {finalizing ? 'Guardando...' : 'Agregar contacto'}
                </button>
                <button type="button" disabled={finalizing} onClick={() => finalize({ skipContact: true })} className={btnSecondary}>
                  Omitir paso
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-up flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-center items-center pb-12">
               <div className="h-24 w-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-sm animate-bounce-short">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-center text-textdark dark:text-dm-text mb-2">
                Todo listo, {userName}.
              </h2>
              <p className="text-center text-textdark/70 dark:text-dm-muted text-lg font-medium">
                Empecemos.
              </p>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4 text-sm text-red-700 font-medium">{error}</div>
            )}
            <div className="pb-8">
              <button
                type="button"
                disabled={finalizing}
                onClick={() => navigate('/home')}
                className={btnPrimary}
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
