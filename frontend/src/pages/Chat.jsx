import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BresoChat from '../components/BresoChat'
import CrisisOverlay from '../components/CrisisOverlay'
import { getDashboard, sendMessageToSoledad, getConversationHistory } from '../services/api'

const USER_NAME_KEY = 'breso_user_name'

function safeGet(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

// Replaced external greeting definitions with explicit localized strings within buildOpening

export default function Chat() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const hasUserReplied = useRef(false)
  const historyLoaded = useRef(false)

  const [userName] = useState(safeGet(USER_NAME_KEY))
  const [mode, setMode] = useState('listening')
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem('breso_conversation') || localStorage.getItem('breso_conversation_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasUserReplied.current = true
          historyLoaded.current = true
          return parsed.slice(-10) // Mid-conversation: Load last 10 messages immediately
        }
      }
    } catch {}
    historyLoaded.current = true
    return [] // Handled in useEffect to use 't'
  })
  const [isReturning] = useState(() => {
    try {
      const stored = localStorage.getItem('breso_conversation') || localStorage.getItem('breso_conversation_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) && parsed.length > 0
      }
    } catch {}
    return false
  })

  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [historyLimit, setHistoryLimit] = useState(20)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [crisisDetected, setCrisisDetected] = useState(false)
  const [memoryExists, setMemoryExists] = useState(false)
  const [memoryPreview, setMemoryPreview] = useState('')
  const [memoryExpanded, setMemoryExpanded] = useState(false)
  const [showStreakBanner, setShowStreakBanner] = useState(false)
  const [streakDays, setStreakDays] = useState(0)

  const buildOpening = () => {
    const h = new Date().getHours()
    let key = 'chat.opening_evening'
    if (h >= 6 && h < 12) key = 'chat.opening_morning'
    else if (h >= 12 && h < 20) key = 'chat.opening_afternoon'

    let text = t(key)
    if (userName) {
      // Insert ", {name}" after the first greeting word cluster (before first period)
      text = text.replace(/^([^.]+)\./, `$1, ${userName}.`)
    }

    return [{ from: 'breso', role: 'soledad', text, timestamp: new Date().toISOString() }]
  }

  // Save messages to localStorage whenever they change (only after user interaction)
  useEffect(() => {
    if (!hasUserReplied.current || messages.length === 0) return
    try {
      const toStore = messages.map(m => ({ from: m.from, role: m.role, text: m.text, textKey: m.textKey }))
      localStorage.setItem('breso_conversation', JSON.stringify(toStore.slice(-50)))
    } catch { }
  }, [messages])

  // Load conversation history on mount
  useEffect(() => {
    let mounted = true
    if (isDemo) {
      setMessages([])
      setMemoryExists(true)
      historyLoaded.current = true
      return
    }

    if (messages.length === 0) setMessages(buildOpening())
    
      ; (async () => {
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
              if (item.user_message) msgs.push({ from: 'user', role: 'user', text: item.user_message })
              if (item.soledad_response) msgs.push({ from: 'breso', role: 'soledad', text: item.soledad_response })
              return msgs
            })
            setMessages(historicMessages)
            return
          }
        } catch { }
      })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo])

  // Demo injection sequence
  useEffect(() => {
    if (!isDemo) return

    const DEMO_CONVERSATION = [
      { role: 'soledad', text: "Hi again. Last week you told me you were having trouble sleeping. How has that been?", delay: 0, showMemory: true },
      { role: 'user', text: "Still the same... I can't turn my mind off", delay: 3500 },
      { role: 'soledad', text: "That sounds exhausting. When you say you can't turn your mind off, what kind of thoughts keep coming up?", delay: 6000 },
      { role: 'user', text: 'Work mostly. I feel like nothing is ever enough.', delay: 10000 },
      { role: 'soledad', text: "That feeling of never being enough is really heavy to carry. How long have you been feeling this way?", delay: 13000 },
      { role: 'user', text: 'About two months now.', delay: 17000 },
      { role: 'soledad', text: "Two months is a long time. I'm glad you're naming it — that takes courage. Is there anyone in your life you feel safe talking to about this?", delay: 20000 },
      { role: 'user', text: "Not really... that's kind of why I'm here", delay: 25000 },
      { role: 'soledad', text: "Then I'm glad you came. You don't have to figure this out alone. I'll be here tomorrow too.", delay: 28000 }
    ]

    let timeouts = []

    DEMO_CONVERSATION.forEach((msg, idx) => {
      if (msg.role === 'soledad' && msg.delay > 2000) {
        // Show typing indicator
        timeouts.push(setTimeout(() => {
          setSending(true)
        }, msg.delay - 2000))
      }

      timeouts.push(setTimeout(() => {
        setSending(false)
        setMessages(prev => [...prev, { 
          from: msg.role === 'soledad' ? 'breso' : 'user', 
          role: msg.role, 
          text: msg.text,
          timestamp: new Date().toISOString()
        }])
      }, msg.delay))
    })

    return () => timeouts.forEach(clearTimeout)
  }, [isDemo])

  // Fetch current mode from dashboard
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const res = await getDashboard()
          if (!mounted) return
          const apiMode = res.data?.mode
          if (apiMode) setMode(apiMode)

          const days = res.data?.streakDaysConsecutive || 0
          setStreakDays(days)
          if (days >= 3) {
            setShowStreakBanner(true)
            setTimeout(() => { if (mounted) setShowStreakBanner(false) }, 3000)
          }
        } catch { }
      })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild opening messages on language change (only if user hasn't replied and no history)
  useEffect(() => {
    // Disabled rebuilding opening dynamically to avoid overriding mood selector workflow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language])

  const handleLoadOlder = async () => {
    if (loadingHistory) return
    setLoadingHistory(true)
    try {
      const newLimit = historyLimit + 20
      const history = await getConversationHistory(newLimit)
      const items = Array.isArray(history.data) ? history.data : (Array.isArray(history) ? history : [])
      const newHistoricMessages = [...items].reverse().flatMap((item) => {
        const msgs = []
        if (item.user_message) msgs.push({ from: 'user', role: 'user', text: item.user_message, timestamp: item.scheduled_at || new Date().toISOString() })
        if (item.soledad_response) msgs.push({ from: 'breso', role: 'soledad', text: item.soledad_response, timestamp: item.scheduled_at || new Date().toISOString() })
        return msgs
      })
      
      setHistoryLimit(newLimit)
      
      setMessages(prev => {
        const existingTexts = new Set(prev.map(m => m.text))
        const toAdd = newHistoricMessages.filter(m => !existingTexts.has(m.text))
        return [...toAdd, ...prev]
      })
    } catch {}
    setLoadingHistory(false)
  }

  const handleMoodSelected = (moodText) => {
    const userMsg = { from: 'user', role: 'user', text: moodText, timestamp: new Date().toISOString() }
    const openingMsg = buildOpening()[0]
    hasUserReplied.current = true
    setMessages(prev => [...prev, userMsg, openingMsg])
  }

  const handleSend = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || sending) return

    hasUserReplied.current = true
    setSendError('')
    const userMsg = { from: 'user', role: 'user', text: trimmed, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
      // Pass full conversation history (including the new user message) to backend
      const currentMessages = [...messages, userMsg]
      const reply = await sendMessageToSoledad(trimmed, currentMessages, lang)

      if (reply.paymentRequired) {
        setMessages((prev) => [...prev, {
          from: 'breso',
          role: 'soledad',
          isPaymentRequired: true,
          paymentData: reply.paymentData,
          text: null,
          timestamp: new Date().toISOString(),
        }])
        return
      }

      setMessages((prev) => [...prev, { from: 'breso', role: 'soledad', text: reply.text, suggestion: reply.suggestion, timestamp: new Date().toISOString() }])

      if (reply.crisisDetected) setCrisisDetected(true)
      if (reply.memoryExists) {
        setMemoryExists(true)
        if (reply.memoryPreview) setMemoryPreview(reply.memoryPreview)
      }
    } catch (err) {
      console.error('[Chat] handleSend failed:', err?.message || err)
      setSendError(t('chat.errorReply'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100dvh - 5.5rem)' }}>
      {showStreakBanner && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-500 min-w-max">
          <div className="bg-sage text-white px-4 py-2 rounded-full shadow-md text-sm font-semibold flex items-center gap-2">
            <span>🔥</span> {t('chat.streakBanner', { days: streakDays })}
          </div>
        </div>
      )}

      <CrisisOverlay isVisible={crisisDetected} onClose={() => setCrisisDetected(false)} />

      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-1 mb-2 flex-shrink-0">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white font-bold text-sm">
          S
        </div>
        <div>
          <div className="text-base font-semibold text-textdark dark:text-dm-text flex items-center gap-2">
            Soledad
            {memoryExists && (
              <span className="text-[10px] font-medium text-sage bg-sage/10 px-2 py-0.5 rounded-full border border-sage/20">Te recuerda 🌱</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs text-textdark/55 dark:text-dm-muted">en línea</span>
          </div>
        </div>
      </div>

      {/* Memory Banner */}
      {memoryExists && memoryPreview && (
        <div className="mx-4 mb-3 border border-sage/30 bg-sage/5 rounded-xl px-4 py-2 flex flex-col transition-all cursor-pointer shadow-sm animate-fade-in-page" onClick={() => setMemoryExpanded(!memoryExpanded)}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🌱</span>
            <span className="text-sm font-bold text-sage flex-1">Soledad te recuerda</span>
            <span className="text-xs text-sage/60">{memoryExpanded ? '▲' : '▼'}</span>
          </div>
          {memoryExpanded && (
            <p className="mt-2 text-sm text-textdark/80 dark:text-dm-text/80 italic animate-fade-in-page">
              "{memoryPreview}"
            </p>
          )}
        </div>
      )}

      {isReturning && (
        <div className="flex justify-center mb-2 animate-fade-in-page">
          <span className="text-xs font-semibold text-sage bg-sage/10 px-3 py-1 rounded-full border border-sage/20">Soledad está aquí 🌱</span>
        </div>
      )}

      <BresoChat
        messages={messages}
        onSend={handleSend}
        onMoodSelected={handleMoodSelected}
        isSending={sending}
        error={sendError}
        onLoadOlder={handleLoadOlder}
        loadingHistory={loadingHistory}
        isDemo={isDemo}
      />
    </div>
  )
}
