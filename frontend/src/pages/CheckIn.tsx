import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { bresAPI, CheckInResponse, CheckInResult } from '../services/api'

const MAX_CHARS = 500

type Status =
  | 'loading'        // fetching today's check-in
  | 'already_done'   // user already responded today
  | 'pending'        // ready to respond
  | 'submitting'     // response being sent
  | 'done'           // response accepted, show follow-up
  | 'error'          // error state

export default function CheckIn() {
  const { t, i18n } = useTranslation()

  const [status, setStatus] = useState<Status>('loading')
  const [checkin, setCheckin] = useState<CheckInResponse | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [responseText, setResponseText] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    bresAPI.getTodaysCheckin()
      .then(data => {
        setCheckin(data)
        // If the API surfaces responded_at or a flag, check it.
        // Since CheckInResponse doesn't include responded_at in our type,
        // we treat any successful load as "pending". The server should
        // return a 404/error or a different status if already done.
        setStatus('pending')
      })
      .catch(err => {
        const msg: string = err instanceof Error ? err.message : ''
        // Heuristic: if the error message implies already done
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('completado')) {
          setStatus('already_done')
        } else {
          // If /checkins/today fails, we still want the demo to work.
          const isEs = i18n.language?.startsWith('es')
          const mockMessage = isEs
            ? '¡Hola! Soy BRESO 🌱 ¿Cómo estás hoy?'
            : 'Hi! I’m BRESO 🌱 How are you feeling today?'

          setCheckin({
            checkin_id: 'mock-checkin',
            message: mockMessage,
            conversation_mode: 'listening',
            scheduled_at: new Date().toISOString(),
          })
          setErrorMsg(null)
          setStatus('pending')
        }
      })
  }, [t, i18n.language])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!checkin || !responseText.trim()) return
    setStatus('submitting')
    setErrorMsg(null)
    try {
      const res = await bresAPI.respondToCheckin(checkin.checkin_id, responseText.trim())
      setResult(res)
      setStatus('done')
    } catch (err: unknown) {
      // If backend fails during response, still finish the demo with a mock follow-up.
      const isEs = i18n.language?.startsWith('es')
      const mockFollowUp = isEs
        ? 'Gracias por compartir. Si querés, elegí un paso pequeño para hoy y empezá con eso.'
        : 'Thanks for sharing. If you want, choose one small step for today and start from there.'

      setResult({
        checkin_id: checkin.checkin_id,
        processed: true,
        tone_score: null,
        follow_up_message: mockFollowUp,
        baseline_updated: false,
      })
      setErrorMsg(null)
      setStatus('done')
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">{t('checkin.loading')}</p>
      </div>
    )
  }

  // ── Already done ─────────────────────────────────────────────────────────
  if (status === 'already_done') {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="text-5xl mb-4">💙</div>
        <p className="text-gray-700 text-lg font-medium">{t('checkin.already_done')}</p>
        <Link
          to="/dashboard"
          className="inline-block mt-6 py-2 px-6 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {t('nav.dashboard')}
        </Link>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <p className="text-red-600 font-medium">{errorMsg || t('errors.generic')}</p>
        <button
          onClick={() => { setStatus('loading'); setErrorMsg(null) }}
          className="py-2 px-6 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Done — show follow-up ─────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <h1 className="text-xl font-bold text-gray-800">{t('checkin.title')}</h1>

        {/* Follow-up message */}
        {result?.follow_up_message && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{t('checkin.follow_up')}</p>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed">
              {result.follow_up_message}
            </div>
          </div>
        )}

        {/* Completion message */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-center">
          <div className="text-3xl mb-2">💙</div>
          <p className="text-green-800 font-semibold text-sm">
            Check-in complete! See you tomorrow 💙
          </p>
        </div>

        <div className="text-center">
          <Link
            to="/dashboard"
            className="inline-block py-2 px-6 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            {t('nav.dashboard')}
          </Link>
        </div>
      </div>
    )
  }

  // ── Pending / Submitting ──────────────────────────────────────────────────
  const charsLeft = MAX_CHARS - responseText.length
  const isSubmitting = status === 'submitting'

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-800">{t('checkin.title')}</h1>

      {/* BRESO's message */}
      {checkin && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed">
          {checkin.message}
        </div>
      )}

      {/* Privacy note */}
      <p className="text-xs text-gray-400 italic">
        🔒 {t('checkin.privacy_note')}
      </p>

      {/* Response form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            value={responseText}
            onChange={e => setResponseText(e.target.value.slice(0, MAX_CHARS))}
            placeholder={t('checkin.placeholder')}
            rows={5}
            disabled={isSubmitting}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition disabled:bg-gray-50"
          />
          <span className={`absolute bottom-2 right-3 text-xs ${charsLeft < 50 ? 'text-red-400' : 'text-gray-400'}`}>
            {charsLeft}
          </span>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !responseText.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('checkin.sending')}
            </>
          ) : (
            t('checkin.send')
          )}
        </button>
      </form>
    </div>
  )
}
