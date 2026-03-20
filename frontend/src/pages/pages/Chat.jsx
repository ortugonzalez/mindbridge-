import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import ModeIndicator from '../components/ModeIndicator'
import BresoChat from '../components/BresoChat'
import { getDashboard, postCheckin } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'

function safeGetLocalStorage(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export default function Chat() {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const startMode = location.state?.mode
  const MODE_EMOJI_MAP = useMemo(
    () => ({
      listening: '🎧',
      motivation: '⚡',
      proposal: '🌱',
      celebration: '🎉',
    }),
    []
  )

  const storedUserName = safeGetLocalStorage(USER_NAME_KEY)

  const hasUserReplied = useRef(false)

  const [userName] = useState(storedUserName)
  const [mode, setMode] = useState(startMode || 'listening')
  const [messages, setMessages] = useState([])

  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState('')

  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const buildThread = (threadMode) => {
    const name = userName?.trim() ? userName : '—'
    return [
      { from: 'breso', text: t('chat.welcome', { name }) },
      { from: 'breso', text: t(`chat.firstQuestion.${threadMode}`) },
    ]
  }

  // Keep welcome + first question updated with language changes until the user replies.
  useEffect(() => {
    if (hasUserReplied.current) return
    setMessages(buildThread(mode))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, t, i18n.language, userName])

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setDashLoading(true)
      setDashError('')
      try {
        const res = await getDashboard()
        if (!isMounted) return

        // If onboarding saved a name, always prefer it (prevents showing email).
        const apiMode = res.data?.mode
        // Nunca mostramos el email/username de Supabase: el nombre viene solo de localStorage.
        if (apiMode) setMode(apiMode)
      } catch {
        if (!isMounted) return
        setDashError(t('dashboard.error'))
      } finally {
        if (isMounted) setDashLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || sending) return

    hasUserReplied.current = true
    setSendError('')

    setMessages((prev) => [...prev, { from: 'user', text: trimmed }])
    setSending(true)
    try {
      const res = await postCheckin({ message: trimmed, mode })
      const replyText = res.data?.replyText || t('chat.mockReplies.listening')
      const nextMode = res.data?.nextMode || mode

      setMode(nextMode)
      setMessages((prev) => [...prev, { from: 'breso', text: replyText }])
    } catch {
      setSendError(t('chat.errorReply'))
    } finally {
      setSending(false)
    }
  }

  const modeDesc = t(`chat.modeDescriptions.${mode}`)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">
        <div className="text-sm font-semibold text-textdark/70">{t('chat.guide')}</div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-textdark/60">{t('chat.yourName')}</div>
            <div className="mt-1 text-xl font-bold text-textdark">{userName || '—'}</div>
          </div>

          <div className="text-right">
            <div className="text-xs font-semibold text-textdark/60">{t('chat.header.mode')}</div>
            <div className="mt-1 text-sm font-semibold text-textdark">
              {MODE_EMOJI_MAP[mode] || '🎧'} {t(`chat.modes.${mode}.es`)} / {t(`chat.modes.${mode}.en`)}
            </div>
            <div className="mt-1 text-xs font-semibold text-textdark/70">{modeDesc}</div>
          </div>
        </div>

        <div className="mt-4">
          <ModeIndicator mode={mode} onChange={(next) => setMode(next)} />
        </div>
      </section>

      {dashLoading ? (
        <div className="rounded-2xl border border-softgray bg-whiteish p-5 shadow-soft">{t('common.loading')}</div>
      ) : null}
      {dashError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{dashError}</div>
      ) : null}

      <BresoChat messages={messages} onSend={handleSend} isSending={sending} error={sendError} />
    </div>
  )
}

