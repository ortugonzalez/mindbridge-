import axios from 'axios'
import i18n from '../i18n'
import { supabase } from '../lib/supabase'

// PRIORITY 1: Always connect to Railway backend; env var overrides for other environments
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://mindbridge-production-c766.up.railway.app'

const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
})

// Attach stored auth token to every request
axiosClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('breso_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch { }
  return config
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeLocalStorage(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

function modeToKey(rawMode) {
  const m = String(rawMode || '').toLowerCase()
  if (m.includes('escucha') || m.includes('listening')) return 'listening'
  if (m.includes('motiv') || m.includes('motivation')) return 'motivation'
  if (m.includes('propuesta') || m.includes('proposal')) return 'proposal'
  if (m.includes('celebr') || m.includes('celebration')) return 'celebration'
  return 'listening'
}

function normalizeWeeklyToBooleans(raw) {
  if (!Array.isArray(raw)) return null
  const slice = raw.slice(0, 7)
  if (slice.length !== 7) return null
  return slice.map((d) => Boolean(d.completed ?? d.done ?? d))
}

/** Calls fn(); on any error (network, 4xx, 5xx, no base URL) returns mock silently. */
async function requestWithMock(fn, mockFactory) {
  // If no base URL is configured, skip the network call entirely
  if (!API_BASE) return { data: mockFactory(), fromMock: true }
  try {
    const res = await fn()
    return { data: res, fromMock: false }
  } catch {
    return { data: mockFactory(), fromMock: true }
  }
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function mockTodaysCheckin() {
  const es = i18n.language?.startsWith('es')
  return {
    id: 'mock-1',
    mode: 'listening',
    message: es
      ? '¡Hola! Soy Soledad 🌱 ¿Cómo estás hoy?'
      : "Hi! I'm Soledad 🌱 How are you feeling today?",
    status: 'pending',
  }
}

const ES_REPLIES = [
  'Entiendo. No siempre es fácil poner en palabras cómo uno se siente. ¿Hay algo en particular que esté ocupando tu cabeza últimamente?',
  'Gracias por contarme. Cuando decís eso, ¿a qué te referís exactamente? Me gustaría entender mejor.',
  'Lo que describís suena agotador. ¿Hace cuánto venís sintiendo esto?',
  'Me alegra que lo puedas decir. A veces nombrar lo que sentimos ya es un primer paso. ¿Querés contarme más?',
  'Tiene sentido que te sientas así. ¿Cómo venís durmiendo últimamente?',
  'Lo escucho. ¿Y cómo impacta eso en tu día a día?',
  '¿Hay alguien con quien puedas hablar de esto además de acá?',
  'No tenés que tener todo claro para hablar. Podemos ir de a poco.',
]
const EN_REPLIES = [
  "I understand. It's not always easy to put feelings into words. Is there something specific that's been on your mind lately?",
  "Thank you for sharing that. When you say that, what do you mean exactly? I'd like to understand better.",
  "What you're describing sounds exhausting. How long have you been feeling this way?",
  "I'm glad you can say that. Sometimes naming what we feel is already a first step. Do you want to tell me more?",
  'It makes sense that you feel that way. How have you been sleeping lately?',
  'I hear you. And how does that affect your daily life?',
  'Is there someone you can talk to about this besides here?',
  "You don't have to have everything figured out to talk. We can go slowly.",
]

function mockCheckinReply(mode) {
  const es = i18n.language?.startsWith('es')
  if (es) {
    const replies = ES_REPLIES
    return replies[Math.floor(Math.random() * replies.length)]
  }
  const replies = EN_REPLIES
  return replies[Math.floor(Math.random() * replies.length)]
}

function mockDashboard() {
  const userName = safeLocalStorage('breso_user_name') || (i18n.language?.startsWith('es') ? 'Amigo/a' : 'Friend')
  const contactName = safeLocalStorage('breso_trust_contact_name') || 'María'
  const contactRelation = safeLocalStorage('breso_trust_contact_relation') || 'hermana'
  return {
    user: { nombre: userName, plan: 'essential' },
    streakDaysConsecutive: 4,
    weeklyCompleted: [true, true, true, true, false, false, false],
    proposal: i18n.language?.startsWith('es')
      ? 'Salí a caminar 15 minutos hoy 🌿'
      : 'Take a 15-minute walk today 🌿',
    contact: { nombre: contactName, relacion: contactRelation },
    mode: 'listening',
    language: i18n.language || 'es',
  }
}

function mockCheckinHistory() {
  const now = Date.now()
  return {
    weeklyCompleted: [true, true, true, true, false, false, false],
    items: Array.from({ length: 4 }, (_, i) => ({
      id: `mock-checkin-${i + 1}`,
      scheduled_at: new Date(now - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      responded: true,
      tone_score: parseFloat((0.5 + Math.random() * 0.3).toFixed(2)),
    })),
  }
}

// ---------------------------------------------------------------------------
// Normalizers (map real API shapes to the shape pages expect)
// ---------------------------------------------------------------------------

function normalizeDashboard(raw) {
  const mock = mockDashboard()
  const r = raw || {}
  const userRaw = r.user || r.profile || r.usuario || r
  return {
    user: {
      nombre: userRaw?.nombre || userRaw?.name || mock.user.nombre,
      plan: userRaw?.plan || r.plan || mock.user.plan,
    },
    streakDaysConsecutive: Number(
      r.streakDaysConsecutive ?? r.streak_days ?? r.streak ?? r.streakDays ?? mock.streakDaysConsecutive
    ),
    weeklyCompleted:
      normalizeWeeklyToBooleans(r.weeklyCompleted) ||
      normalizeWeeklyToBooleans(r.weekly) ||
      normalizeWeeklyToBooleans(r.history) ||
      mock.weeklyCompleted,
    proposal: r.proposal || r.proposalText || r.nextProposal || r.propuesta || mock.proposal,
    contact: {
      nombre: r.contact?.nombre || r.contact?.name || mock.contact.nombre,
      relacion: r.contact?.relacion || r.contact?.relationship || mock.contact.relacion,
    },
    mode: modeToKey(r.mode || r.currentMode || mock.mode),
    language: i18n.language || 'es',
  }
}

function normalizeHistory(raw) {
  const mock = mockCheckinHistory()
  const r = raw || {}
  return {
    weeklyCompleted:
      normalizeWeeklyToBooleans(r.weeklyCompleted) ||
      normalizeWeeklyToBooleans(r.weekly) ||
      normalizeWeeklyToBooleans(r.history) ||
      mock.weeklyCompleted,
    items: Array.isArray(r.items) ? r.items : mock.items,
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function signIn({ email, password }) {
  return requestWithMock(
    () =>
      axiosClient.post('/auth/signin', { email, password }).then((res) => {
        const token = res.data?.access_token || res.data?.token || null
        if (token) { try { localStorage.setItem('breso_token', token) } catch { } }
        return res.data
      }),
    () => ({ access_token: 'mock-token', user_id: 'mock-user', fromMock: true })
  )
}

export async function sendMagicLink({ email }) {
  return requestWithMock(
    () => axiosClient.post('/auth/magic-link', { email }).then((res) => res.data),
    () => ({ message: 'Magic link sent', fromMock: true })
  )
}

export async function getUserProfile() {
  return requestWithMock(
    () => axiosClient.get('/users/me/profile').then((res) => res.data),
    () => ({
      name: safeLocalStorage('breso_user_name') || null,
      plan: 'free_trial',
      user_type: 'patient',
      language: i18n.language || 'es',
      trial_days_left: 15,
    })
  )
}

export async function getConversationHistory(limit = 20) {
  return requestWithMock(
    () => axiosClient.get('/checkins/conversation-history', { params: { limit } }).then((res) => res.data),
    () => []
  )
}

export async function registerUser({ name, email, password }) {
  const lang = i18n.language || 'es'
  return requestWithMock(
    () =>
      axiosClient.post('/auth/register', { name, email, password, preferred_language: lang }).then((res) => {
        const token = res.data?.token || res.data?.access_token || null
        if (token) { try { localStorage.setItem('breso_token', token) } catch { } }
        return res.data
      }),
    () => ({ ok: true, fromMock: true })
  )
}

// ---------------------------------------------------------------------------
// PRIORITY 1: Direct Railway backend chat function
// ---------------------------------------------------------------------------

const ES_MOCKS = [
  "Lo que describís suena agotador. No es solo un mal día, ¿verdad? ¿Hace cuánto venís sintiéndote así?",
  "Eso que decís me queda dando vueltas. ¿Podés contarme un poco más?",
  "A veces 'estoy bien' viene solo, casi por inercia. ¿Cómo venís siendo honestamente esta semana?",
  "Lo raro es difícil de explicar justamente porque no encontrás la palabra. ¿Hay algo que pasó últimamente?",
]
const EN_MOCKS = [
  "What you're describing sounds exhausting. It's not just a bad day, is it? How long have you been feeling this way?",
  "What you said stays with me. Can you tell me a bit more?",
  "Sometimes 'I'm fine' just comes out automatically. How have you honestly been this week?",
]

export async function sendMessageToSoledad(message, history = [], language = 'es') {
  // Bug B fix: ONLY use Supabase session token — no localStorage fallback
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  console.log('[Soledad] token source:', token ? 'supabase_session' : 'NONE')

  if (!token) {
    console.error('[Soledad] No auth session — user must be signed in via Supabase')
    throw new Error('No auth session')
  }

  // Bug C fix: resolve textKey to actual text, then filter empty entries
  const historyPayload = history
    .slice(-10)
    .map(m => ({
      role: (m.role === 'soledad' || m.from === 'breso') ? 'assistant' : 'user',
      content: m.text || (m.textKey ? i18n.t(m.textKey) : ''),
    }))
    .filter(m => m.content)

  const BASE_URL = API_BASE
  console.log('[Soledad] POST to:', BASE_URL + '/checkins/respond')
  console.log('[Soledad] history length:', historyPayload.length)

  const response = await fetch(`${BASE_URL}/checkins/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, language, history: historyPayload }),
    signal: AbortSignal.timeout(30000),
  })

  console.log('[Soledad] response status:', response.status)

  // Bug A fix: never swallow errors silently — surface the full details
  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    console.error('[Soledad] Backend error', response.status, errorBody)
    // Only fall back to mock when there is no backend URL at all
    if (!API_BASE) {
      const pool = language === 'en' ? EN_MOCKS : ES_MOCKS
      return { text: pool[Math.floor(Math.random() * pool.length)], crisisDetected: false, memoryExists: false }
    }
    throw new Error(`Backend ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  console.log('[Soledad] response data:', JSON.stringify(data).slice(0, 200))

  const rawText = data.response || data.message || data.breso_message || data.reply || ''
  const text = typeof rawText === 'string' ? rawText.replace(/ — /g, ', ').replace(/—/g, ', ') : rawText
  return {
    text,
    suggestion: data.suggestion || null,
    crisisDetected: !!(data.crisis || data.is_crisis || data.crisisDetected),
    memoryExists: !!(data.memory || data.has_memory || data.memoryExists),
  }
}

export async function addContact({ name, email, relation }) {
  return requestWithMock(
    () => axiosClient.post('/contacts', { name, email, relation }).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
  )
}

export async function inviteContact({ email, name, relationship }) {
  return requestWithMock(
    () => axiosClient.post('/relationships/invite', { email, name, relationship }).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
  )
}

export async function getSupportNetwork() {
  return requestWithMock(
    () => axiosClient.get('/relationships/my-support-network').then((res) => res.data),
    () => []
  )
}

export async function getDashboard() {
  return requestWithMock(
    () => axiosClient.get('/dashboard').then((res) => normalizeDashboard(res.data)),
    () => normalizeDashboard({})
  )
}

export async function getCheckinHistory() {
  return requestWithMock(
    () => axiosClient.get('/checkin/history').then((res) => normalizeHistory(res.data)),
    () => normalizeHistory({})
  )
}

/** Get (or generate) today's check-in message from Soledad. */
export async function getTodaysCheckin() {
  return requestWithMock(
    () => axiosClient.get('/checkins/today').then((res) => res.data),
    () => mockTodaysCheckin()
  )
}

/** Submit the user's text response to a check-in and get Soledad's reply. */
export async function submitCheckinResponse({ checkinId, response, mode }) {
  return requestWithMock(
    () =>
      axiosClient.post(`/checkins/${checkinId}/respond`, { response, mode }).then((res) => {
        const rawReply = res.data?.reply?.text || res.data?.replyText || res.data?.message || res.data?.text || mockCheckinReply(mode)
        const safeReply = typeof rawReply === 'string' ? rawReply.replace(/ — /g, ', ').replace(/—/g, ', ') : rawReply
        return {
          reply: safeReply,
          nextMode: modeToKey(res.data?.nextMode || res.data?.mode || mode),
        }
      }),
    () => ({
      reply: mockCheckinReply(mode),
      nextMode: modeToKey(mode),
    })
  )
}

/**
 * postCheckin — legacy alias used by Chat.jsx.
 * Maps to submitCheckinResponse internally.
 */
export async function getDailySummaries() {
  return requestWithMock(
    () => axiosClient.get('/checkins/daily-summaries').then((res) => res.data),
    () => []
  )
}

export async function getFamilyPatientStatus() {
  return requestWithMock(
    () => axiosClient.get('/family/patient-status').then((res) => res.data),
    () => ({ alert_level: 'green', streak: 0, last_checkin: 'Sin datos', checkins_this_week: 0, weekly_summary: '', needs_attention: false })
  )
}

export async function getFamilyWeeklyReport() {
  return requestWithMock(
    () => axiosClient.get('/family/weekly-report').then((res) => res.data),
    () => ({ week: '', summary: '', alert_level: 'green', recommendation: '' })
  )
}

export async function notifyPatient({ message }) {
  return requestWithMock(
    () => axiosClient.post('/family/notify-patient', { message }).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
  )
}

export async function getVapidPublicKey() {
  return requestWithMock(
    () => axiosClient.get('/users/me/vapid-public-key').then((res) => res.data),
    () => ({ vapid_public_key: null })
  )
}

export async function saveProfile({ display_name, phone_number, plan, user_type, language }) {
  const payload = {}
  if (display_name) payload.display_name = display_name
  if (phone_number) payload.phone_number = phone_number
  if (plan) payload.plan = plan
  if (user_type) payload.user_type = user_type
  if (language) payload.language = language
  return requestWithMock(
    () => axiosClient.patch('/users/me/profile', payload).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
  )
}

export async function savePushSubscription(subscription) {
  return requestWithMock(
    () => axiosClient.post('/users/me/push-subscription', { subscription }).then((res) => res.data),
    () => ({ success: true })
  )
}

export async function postCheckin({ message, mode }) {
  const result = await submitCheckinResponse({ checkinId: 'today', response: message, mode })
  // Return shape Chat.jsx expects: { data: { replyText, nextMode } }
  return {
    data: { replyText: result.data?.reply, nextMode: result.data?.nextMode },
    fromMock: result.fromMock,
  }
}
