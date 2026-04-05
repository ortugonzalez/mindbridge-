import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

export default function InviteConnect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userType = (() => { try { return localStorage.getItem('breso_user_type') || 'patient' } catch { return 'patient' } })()

  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const [tokenInput, setTokenInput] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerate = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${BASE_URL}/family/generate-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('breso_token')}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Error generating invite')
      const data = await res.json()
      const link = data.invite_url || `${window.location.origin}/accept-invite/${data.token || 'demo-token'}`
      setInviteLink(link)
    } catch {
      const demoToken = `demo-${Math.random().toString(36).substr(2, 9)}`
      setInviteLink(`${window.location.origin}/accept-invite/${demoToken}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConnect = async () => {
    if (!tokenInput.trim()) return
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    let token = tokenInput.trim()
    if (token.includes('/accept-invite/')) {
      token = token.split('/accept-invite/')[1]
    }

    try {
      const res = await fetch(`${BASE_URL}/family/accept-invite/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('breso_token')}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Invalid token')
      setSuccessMsg(t('invite.success'))
      setTimeout(() => navigate('/family-dashboard'), 2000)
    } catch {
      setErrorMsg(t('invite.error', 'No pudimos validar ese enlace o token.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center animate-fade-up">
      <div className="w-full max-w-md bg-white dark:bg-dm-surface rounded-[24px] p-6 md:p-8 shadow-soft border border-softgray dark:border-dm-border">

        {userType !== 'family' ? (
          // PATIENT VIEW
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center text-2xl mb-4">
                🔗
              </div>
              <h2 className="text-xl font-bold text-textdark dark:text-dm-text">
                {t('invite.title_patient')}
              </h2>
              <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed pb-2">
                {t('invite.desc_patient')}
              </p>
            </div>

            {!inviteLink ? (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-sage text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-soft disabled:opacity-50"
              >
                {loading ? t('invite.generating') : t('invite.generate_btn')}
              </button>
            ) : (
              <div className="space-y-6 animate-fade-in-page">
                <div className="bg-[#FAF8F5] dark:bg-dm-bg rounded-xl p-4 border border-softgray dark:border-dm-border">
                  <p className="text-xs font-semibold text-textdark/50 dark:text-dm-muted uppercase tracking-wider mb-2">
                    {t('invite.link_label')}
                  </p>
                  <p className="text-sm font-medium text-textdark dark:text-dm-text break-all">
                    {inviteLink}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="mt-3 w-full bg-white dark:bg-dm-surface border border-sage text-sage font-bold py-2 rounded-lg text-sm hover:bg-sage/5 transition"
                  >
                    {copied ? t('invite.copied') : t('invite.copy_btn')}
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center pt-2">
                  <p className="text-xs text-textdark/50 dark:text-dm-muted mb-3">{t('invite.qr_label')}</p>
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-softgray/50">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteLink)}`}
                      alt="QR Code"
                      width="150"
                      height="150"
                      className="rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // FAMILY VIEW
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-sage/10 rounded-full flex items-center justify-center text-2xl mb-4">
                🤝
              </div>
              <h2 className="text-xl font-bold text-textdark dark:text-dm-text">
                {t('invite.title_family')}
              </h2>
              <p className="text-sm text-textdark/70 dark:text-dm-muted leading-relaxed pb-2">
                {t('invite.desc_family')}
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t('invite.token_placeholder')}
                className="w-full bg-[#FAF8F5] dark:bg-dm-bg border border-softgray dark:border-dm-border rounded-xl px-4 py-3.5 text-sm text-textdark dark:text-dm-text outline-none focus:border-sage transition text-center"
              />

              {errorMsg && <p className="text-xs text-red-500 text-center font-medium">{errorMsg}</p>}
              {successMsg && <p className="text-sm text-sage text-center font-bold bg-sage/10 py-2 rounded-lg">{successMsg}</p>}

              <button
                onClick={handleConnect}
                disabled={loading || !tokenInput.trim() || !!successMsg}
                className="w-full bg-sage text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-soft disabled:opacity-50"
              >
                {loading ? t('invite.connecting') : t('invite.connect_btn')}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
