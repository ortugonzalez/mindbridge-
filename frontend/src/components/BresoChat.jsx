import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function BresoChat({
  messages = [],
  onSend,
  isSending = false,
  error,
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const canSend = useMemo(() => text.trim().length > 0 && !isSending, [text, isSending])

  const handleSubmit = async () => {
    if (!canSend) return
    const next = text.trim()
    setText('')
    await onSend?.(next)
  }

  return (
    <div className="flex h-[70svh] flex-col gap-3">
      <div className="flex-1 overflow-y-auto rounded-xl border border-softgray bg-whiteish p-3 shadow-soft">
        <div className="space-y-3">
          {messages.map((m, idx) => {
            const fromBreso = m.from === 'breso'
            return (
              <div
                key={idx}
                className={fromBreso ? 'flex justify-start' : 'flex justify-end'}
              >
                <div
                  className={[
                    'max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow-soft',
                    fromBreso
                      ? 'bg-sage text-whiteish rounded-bl-lg'
                      : 'bg-whiteish text-textdark border border-softgray rounded-br-lg',
                  ].join(' ')}
                >
                  {m.text}
                </div>
              </div>
            )
          })}

          {isSending ? (
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl bg-sage px-4 py-2 text-sm text-whiteish shadow-soft rounded-bl-lg">
                {t('chat.typing')}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-softgray bg-whiteish p-3 shadow-soft">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('chat.inputPlaceholder')}
              className="min-h-[46px] w-full resize-none rounded-xl border border-softgray bg-whiteish px-3 py-2 text-sm outline-none focus:border-sage"
              rows={1}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              canSend ? 'bg-sage text-whiteish hover:opacity-90' : 'bg-softgray text-textdark/60',
            ].join(' ')}
          >
            {isSending ? t('chat.loadingReply') : t('common.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
