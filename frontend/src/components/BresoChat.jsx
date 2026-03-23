import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getDateLabel(date) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  
  const formatted = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="typing-dot h-2 w-2 rounded-full bg-white/80 inline-block" />
      <span className="typing-dot h-2 w-2 rounded-full bg-white/80 inline-block" />
      <span className="typing-dot h-2 w-2 rounded-full bg-white/80 inline-block" />
    </div>
  )
}

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

function SoledadAvatar({ large }) {
  return (
    <div className={`${large ? 'h-10 w-10 text-base' : 'h-7 w-7 text-xs'} flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white font-bold self-end`}>
      S
    </div>
  )
}

function SuggestionCard({ suggestion }) {
  const [dismissed, setDismissed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  if (!suggestion || dismissed) return null

  const handleAccept = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('breso_proposals') || '[]')
      existing.push({ text: suggestion, date: new Date().toISOString() })
      localStorage.setItem('breso_proposals', JSON.stringify(existing))
    } catch {}
    setAccepted(true)
    setTimeout(() => setDismissed(true), 2000)
  }

  return (
    <div className="mt-2 w-full p-3 rounded-xl border border-sage/40 bg-sage/5 max-w-full text-left shadow-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-1.5">
        <span>💡</span>
        <span className="text-xs font-bold text-sage">Una idea de Soledad</span>
      </div>
      <p className="text-sm text-textdark dark:text-dm-text font-medium italic mb-3">"{suggestion}"</p>
      
      {accepted ? (
        <div className="flex items-center gap-2 text-sage text-sm font-bold bg-sage/10 rounded-lg px-3 py-1.5 w-fit">
          <span>✓</span> Anotado
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={handleAccept} className="flex-1 bg-sage text-white text-xs font-bold py-1.5 px-3 rounded-lg active:scale-95 transition">✓ La anoto</button>
          <button onClick={() => setDismissed(true)} className="flex-1 border border-sage text-sage bg-transparent text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-sage/10 active:scale-95 transition">Ahora no</button>
        </div>
      )}
    </div>
  )
}

function ReactionMenu({ messageText, onReact }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(`"${messageText}" — Soledad por BRESO 🌱`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="absolute -top-10 left-0 bg-white dark:bg-dm-surface rounded-full shadow-md border border-softgray dark:border-dm-border px-3 py-1.5 flex gap-2 items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
      {['🌱', '❤️', '💙', '🙏'].map(r => (
        <button key={r} onClick={() => onReact(r)} className="hover:scale-125 transition-transform text-lg leading-none active:scale-90">{r}</button>
      ))}
      <div className="w-px h-4 bg-softgray dark:bg-dm-border mx-1" />
      <button onClick={handleCopy} className="hover:scale-110 active:scale-95 transition-transform text-sm text-sage relative flex items-center justify-center p-1" title="Compartir">
        🔗
        {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-textdark text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">Copiado</span>}
      </button>
    </div>
  )
}

function PaymentCard() {
  const navigate = useNavigate()
  return (
    <div className="rounded-2xl border border-sage/40 bg-sage/5 p-4 shadow-sm animate-fade-up max-w-[85%]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🌱</span>
        <span className="text-sm font-bold text-sage">Suscripción BRESO</span>
      </div>
      <p className="text-sm text-textdark dark:text-dm-text mb-3 leading-relaxed">
        Tu período de prueba ha terminado. Activá tu suscripción mensual por <strong>$5 USDT</strong> para seguir hablando con Soledad.
      </p>
      <button
        type="button"
        onClick={() => navigate('/payment?plan=essential')}
        className="w-full bg-sage text-white text-sm font-bold py-2.5 px-4 rounded-xl hover:opacity-90 active:scale-95 transition"
      >
        Activar suscripción →
      </button>
    </div>
  )
}

export default function BresoChat({ messages = [], onSend, onMoodSelected, isSending = false, error, onLoadOlder, loadingHistory }) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  
  const [reactions, setReactions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('breso_reactions') || '{}') } catch { return {} }
  })

  const handleReact = (msgId, emoji) => {
    try {
      const newReacts = { ...reactions, [msgId]: emoji }
      setReactions(newReacts)
      localStorage.setItem('breso_reactions', JSON.stringify(newReacts))
      // MOCK: POST to /checkins/react natively.
      fetch(import.meta.env.VITE_API_BASE_URL + '/checkins/react', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('breso_token') || ''}`
        },
        body: JSON.stringify({ message_id: msgId, reaction: emoji }),
      }).catch(() => {})
    } catch {}
  }
  
  // Mood Selector hook logic disabled for instant Demo loading 
  const [needsMood, setNeedsMood] = useState(false)

  const [flashError, setFlashError] = useState(false)
  useEffect(() => {
    if (error) {
      setFlashError(true)
      const t = setTimeout(() => setFlashError(false), 800)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleMoodSelect = async (emoji, textValue) => {
    try {
      localStorage.setItem('breso_last_checkin_date', todayStr)
      localStorage.setItem('breso_today_mood', emoji)
    } catch {}
    setNeedsMood(false)
    if (onMoodSelected) onMoodSelected(textValue)
  }

  const bottomRef = useRef(null)
  const baseTime = useRef(Date.now())

  const messagesWithTime = useMemo(() => {
    const total = messages.length
    return messages.map((m, i) => {
      const dateObj = new Date(m.timestamp || (baseTime.current - (total - 1 - i) * 60000))
      return {
        ...m,
        dateObj,
        time: formatTime(dateObj),
        dateLabel: getDateLabel(dateObj)
      }
    })
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const canSend = text.trim().length > 0 && !isSending

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && 
        !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta voz')
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = (i18n && i18n.language === 'en') ? 'en-US' : 'es-AR'
    recognition.continuous = false
    recognition.interimResults = false
    
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setText((prev) => prev ? prev + ' ' + transcript : transcript)
    }
    
    recognition.start()
  }

  const handleSubmit = async () => {
    if (!canSend) return
    const next = text.trim()
    setText('')
    await onSend?.(next)
  }

  return (
    <div className="flex flex-1 flex-col gap-2 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg p-4">
        <div className="space-y-4">
          {onLoadOlder && messagesWithTime.length >= 20 && (
            <div className="flex justify-center pb-2">
              <button 
                onClick={onLoadOlder}
                disabled={loadingHistory}
                className="bg-white dark:bg-dm-surface text-sage border border-sage/20 border-b-sage/40 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition"
              >
                {loadingHistory ? 'Cargando...' : '📅 Ver anteriores'}
              </button>
            </div>
          )}
          {messagesWithTime.map((m, idx) => {
            const fromSoledad = m.from === 'breso'
            const isOpeningMsg = messagesWithTime.length <= 2 && fromSoledad
            const msgId = m.timestamp || `idx-${idx}`
            
            let showDivider = false
            if (idx === 0) {
              showDivider = true
            } else {
              const prev = messagesWithTime[idx - 1]
              if (prev.dateLabel !== m.dateLabel) showDivider = true
            }

            return (
              <div key={idx} className="space-y-4">
                {showDivider && (
                  <div className="flex items-center justify-center my-6 gap-3">
                    <span className="text-xs font-semibold text-[#9CA3AF] px-2 uppercase tracking-widest">─── {m.dateLabel} ───</span>
                  </div>
                )}
                
                <div className={fromSoledad ? 'flex items-end gap-2' : 'flex justify-end'}>
                  {fromSoledad && <SoledadAvatar large={isOpeningMsg} />}

                  {m.isPaymentRequired ? (
                    <div className="flex flex-col items-start">
                      <PaymentCard />
                      <div className="text-[10px] text-[#9CA3AF] mt-1 px-1 font-medium">{m.time}</div>
                    </div>
                  ) : (
                  <div className={['flex flex-col relative group', fromSoledad ? (isOpeningMsg ? 'items-start max-w-[85%]' : 'items-start max-w-[78%]') : 'items-end max-w-[78%]'].join(' ')}>

                    {fromSoledad && <ReactionMenu messageText={m.textKey ? t(m.textKey) : m.text} onReact={(emoji) => handleReact(msgId, emoji)} />}

                    <div
                      className={[
                        'leading-relaxed shadow-sm animate-fade-up relative',
                        isOpeningMsg ? 'px-5 py-4 text-base sm:text-lg font-medium' : 'px-4 py-2.5 text-sm',
                        fromSoledad
                          ? 'bg-sage text-white rounded-[20px] rounded-bl-[4px]'
                          : 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text border border-softgray dark:border-dm-border rounded-[20px] rounded-br-[4px]',
                      ].join(' ')}
                    >
                      {m.textKey ? t(m.textKey) : m.text}

                      {reactions[msgId] && (
                        <div className="absolute -bottom-2 -right-2 bg-white dark:bg-dm-surface shadow-sm border border-softgray dark:border-dm-border rounded-full px-1.5 py-0.5 text-xs animate-fade-in-page z-10">
                          {reactions[msgId]}
                        </div>
                      )}
                    </div>
                    {m.suggestion && <SuggestionCard suggestion={m.suggestion} />}
                    <div className="text-[10px] text-[#9CA3AF] mt-1 px-1 font-medium">
                      {m.time}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-end gap-2 mt-4 animate-fade-in-page">
              <SoledadAvatar />
              <div className="rounded-[20px] rounded-bl-[4px] bg-white dark:bg-dm-surface border border-softgray dark:border-dm-border px-4 py-2.5 shadow-sm">
                <span className="thinking-text font-medium">Soledad está pensando...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Mood Selector / Error / Input */}
      <div className="flex-shrink-0 flex flex-col gap-2">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {needsMood && !isSending && (
          <div className="rounded-2xl border border-sage/30 bg-sage/5 p-4 shadow-soft animate-fade-in-page">
            <p className="text-center font-bold text-sage mb-3 text-sm">¿Cómo llegás hoy?</p>
            <div className="flex justify-center gap-2 sm:gap-4">
              {[
                { e: '😔', v: 'Bastante mal hoy' },
                { e: '😟', v: 'No muy bien la verdad' },
                { e: '😐', v: 'Ni bien ni mal, regular' },
                { e: '🙂', v: 'Más o menos bien' },
                { e: '😊', v: 'Llegué bastante bien hoy' }
              ].map(mood => (
                <button
                  key={mood.e}
                  onClick={() => handleMoodSelect(mood.e, mood.v)}
                  className="h-10 w-10 sm:h-12 sm:w-12 text-2xl sm:text-3xl rounded-full hover:bg-sage/20 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                >
                  {mood.e}
                </button>
              ))}
            </div>
          </div>
        )}

        {!needsMood && (
        <div className="rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-3 shadow-soft animate-fade-up">
          <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí acá..."
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-softgray dark:border-dm-border bg-[#FAF8F5] dark:bg-dm-bg text-textdark dark:text-dm-text placeholder-textdark/30 dark:placeholder-dm-muted/50 px-4 py-2.5 text-sm outline-none focus:border-sage transition"
            rows={1}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend || isSending}
            aria-label={t('common.send')}
            className={[
              'h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 bg-sage text-white',
              flashError ? 'bg-red-500 text-white' :
              isSending ? 'cursor-not-allowed' :
              canSend
                ? 'hover:opacity-90 shadow-md'
                : 'opacity-50',
            ].join(' ')}
          >
            {isSending ? <Spinner /> : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.156.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
            </svg>
            )}
          </button>
          <button
            type="button"
            onClick={startVoiceInput}
            title={t('chat.speak') || "Hablar / Speak"}
            className={[
              'h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition text-lg',
              isListening ? 'bg-red-50 text-red-500 animate-pulse border border-red-200' : 'bg-sage/10 text-sage hover:bg-sage/20 border border-transparent'
            ].join(' ')}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        </div>
      </div>
      )}
      </div>
    </div>
  )
}
