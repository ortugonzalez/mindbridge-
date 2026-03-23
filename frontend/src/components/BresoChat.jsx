import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

function SoledadAvatar({ large }) {
  return (
    <div className={`${large ? 'h-10 w-10 text-base' : 'h-7 w-7 text-xs'} flex-shrink-0 rounded-full bg-sage flex items-center justify-center text-white font-bold self-end`}>
      S
    </div>
  )
}

export default function BresoChat({ messages = [], onSend, isSending = false, error }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const baseTime = useRef(Date.now())

  const messagesWithTime = useMemo(() => {
    const total = messages.length
    return messages.map((m, i) => ({
      ...m,
      time: formatTime(new Date(baseTime.current - (total - 1 - i) * 90000)),
    }))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  const canSend = text.trim().length > 0 && !isSending

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
          {messagesWithTime.map((m, idx) => {
            const fromSoledad = m.from === 'breso'
            const isOpeningMsg = messagesWithTime.length <= 2 && fromSoledad
            return (
              <div
                key={idx}
                className={fromSoledad ? 'flex items-end gap-2' : 'flex justify-end'}
              >
                {fromSoledad && <SoledadAvatar large={isOpeningMsg} />}

                <div className={['flex flex-col', fromSoledad ? (isOpeningMsg ? 'items-start max-w-[85%]' : 'items-start max-w-[78%]') : 'items-end max-w-[78%]'].join(' ')}>
                  <div
                    className={[
                      'leading-relaxed shadow-soft animate-fade-up',
                      isOpeningMsg ? 'px-5 py-4 text-base sm:text-lg font-medium' : 'px-4 py-2.5 text-sm',
                      fromSoledad
                        ? 'bg-[#7C9A7E] text-white rounded-[18px] rounded-bl-[4px]'
                        : 'bg-white dark:bg-dm-surface text-textdark dark:text-dm-text border border-softgray dark:border-dm-border rounded-[18px] rounded-br-[4px]',
                    ].join(' ')}
                  >
                    {m.textKey ? t(m.textKey) : m.text}
                  </div>
                  <div
                    className="text-[10px] text-textdark/40 dark:text-dm-muted/60 mt-1 px-1"
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isSending && (
            <div className="flex items-end gap-2">
              <SoledadAvatar />
              <div className="rounded-2xl rounded-bl-sm bg-sage">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 rounded-2xl border border-softgray dark:border-dm-border bg-white dark:bg-dm-surface p-3 shadow-soft">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('chat.inputPlaceholder')}
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
            disabled={!canSend}
            aria-label={t('common.send')}
            className={[
              'h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition',
              canSend
                ? 'bg-sage text-white hover:opacity-90'
                : 'bg-softgray dark:bg-dm-border text-textdark/30 dark:text-dm-muted/40',
            ].join(' ')}
          >
            {/* Send arrow icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.156.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
