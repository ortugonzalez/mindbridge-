import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BresoChat from '../components/BresoChat'
import { getDashboard, postCheckin, getConversationHistory } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'

function safeGet(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

function getGreetingKey() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'chat.greetingMorning'
  if (h >= 12 && h < 20) return 'chat.greetingAfternoon'
  return 'chat.greetingEvening'
}

export default function Chat() {
  const { t, i18n } = useTranslation()
  const hasUserReplied = useRef(false)
  const historyLoaded = useRef(false)

  const [userName] = useState(safeGet(USER_NAME_KEY))
  const [mode, setMode] = useState('listening')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const buildOpening = () => [
    { from: 'breso', textKey: getGreetingKey() },
    { from: 'breso', textKey: 'chat.openingQuestion' },
  ]

  // Load conversation history on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const history = await getConversationHistory(20)
        if (!mounted) return
        // History returns newest-first; reverse to get chronological order
        const items = Array.isArray(history.data) ? history.data : (Array.isArray(history) ? history : [])
        if (items.length > 0) {
          historyLoaded.current = true
          hasUserReplied.current = true
          // Build message pairs oldest-first
          const historicMessages = [...items].reverse().flatMap((item) => {
            const msgs = []
            if (item.user_message) msgs.push({ from: 'user', text: item.user_message })
            if (item.soledad_response) msgs.push({ from: 'breso', text: item.soledad_response })
            return msgs
          })
          setMessages(historicMessages)
          return
        }
      } catch {}
      // No history or error → show opening messages
      if (mounted && !hasUserReplied.current) setMessages(buildOpening())
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch current mode from dashboard
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await getDashboard()
        if (!mounted) return
        const apiMode = res.data?.mode
        if (apiMode) setMode(apiMode)
      } catch {}
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild opening messages on language change (only if user hasn't replied and no history)
  useEffect(() => {
    if (hasUserReplied.current || historyLoaded.current) return
    setMessages(buildOpening())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

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

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 5.5rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-1 mb-2 flex-shrink-0">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white font-bold text-sm">
          S
        </div>
        <div>
          <div className="text-base font-semibold text-textdark dark:text-dm-text">Soledad</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs text-textdark/55 dark:text-dm-muted">{t('chat.online')}</span>
          </div>
        </div>
      </div>

      <BresoChat
        messages={messages}
        onSend={handleSend}
        isSending={sending}
        error={sendError}
      />
    </div>
  )
}
