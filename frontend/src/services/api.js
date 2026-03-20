import axios from 'axios'
import i18n from '../i18n'

// Use env var for Vercel; empty string means "no backend" → always use mock
const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const axiosClient = axios.create({
  baseURL: API_BASE,
  // Short timeout so fallback to mock is fast when backend is unreachable
  timeout: 3000,
  withCredentials: true,
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
  'Gracias por compartir eso conmigo 🌱 ¿Querés contarme más?',
  'Te escucho. ¿Qué es lo que más te pesa hoy?',
  'Entiendo cómo te sentís. ¿Hay algo pequeño que podría alegrarte hoy?',
]
const EN_REPLIES = [
  'Thank you for sharing that with me 🌱 Want to tell me more?',
  "I'm listening. What's weighing on you most today?",
  'I understand how you feel. Is there something small that could brighten your day?',
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

export async function registerUser({ name, email, password }) {
  const lang = i18n.language || 'es'
  return requestWithMock(
    () =>
      axiosClient.post('/auth/register', { name, email, password, preferred_language: lang }).then((res) => {
        const token = res.data?.token || res.data?.access_token || null
        if (token) { try { localStorage.setItem('breso_token', token) } catch {} }
        return res.data
      }),
    () => ({ ok: true, fromMock: true })
  )
}

export async function addContact({ name, email, relation }) {
  return requestWithMock(
    () => axiosClient.post('/contacts', { name, email, relation }).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
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
      axiosClient.post(`/checkins/${checkinId}/respond`, { response, mode }).then((res) => ({
        reply:
          res.data?.reply?.text ||
          res.data?.replyText ||
          res.data?.message ||
          res.data?.text ||
          mockCheckinReply(mode),
        nextMode: modeToKey(res.data?.nextMode || res.data?.mode || mode),
      })),
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
export async function postCheckin({ message, mode }) {
  const result = await submitCheckinResponse({ checkinId: 'today', response: message, mode })
  // Return shape Chat.jsx expects: { data: { replyText, nextMode } }
  return {
    data: { replyText: result.data?.reply, nextMode: result.data?.nextMode },
    fromMock: result.fromMock,
  }
}
