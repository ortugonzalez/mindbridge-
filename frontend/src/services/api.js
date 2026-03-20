import axios from 'axios'
import i18n from '../i18n'

const API_BASE = 'http://localhost:8000'

const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  withCredentials: true,
})

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

function mockDashboardData() {
  const lng = i18n.language || 'en'
  const storedUserName = (() => {
    try {
      return localStorage.getItem('breso_user_name') || ''
    } catch {
      return ''
    }
  })()
  const storedContactName = (() => {
    try {
      return localStorage.getItem('breso_trust_contact_name') || ''
    } catch {
      return ''
    }
  })()
  const storedContactRelation = (() => {
    try {
      return localStorage.getItem('breso_trust_contact_relation') || ''
    } catch {
      return ''
    }
  })()

  const userName = storedUserName || i18n.t('dashboard.mock.userName')
  const contactName = storedContactName || i18n.t('dashboard.mock.contactName')
  const contactRelation = storedContactRelation || i18n.t('dashboard.mock.contactRelation')
  const nextProposal = i18n.t('dashboard.mock.nextProposal')
  const streakDays = Number(i18n.t('dashboard.mock.streakDays'))
  const weeklyCompleted = i18n.t('dashboard.mock.weeklyCompleted', { returnObjects: true })
  const mode = i18n.t('dashboard.mock.mode')

  return {
    user: { nombre: userName, plan: 'essential' },
    streakDaysConsecutive: streakDays,
    weeklyCompleted: weeklyCompleted || [true, true, true, true, false, false, false],
    proposal: nextProposal,
    contact: { nombre: contactName, relacion: contactRelation },
    mode: mode || 'listening',
    language: lng,
  }
}

async function requestWithMock(fn, mockFactory) {
  try {
    const res = await fn()
    return { data: res, fromMock: false }
  } catch (error) {
    return { data: mockFactory(), fromMock: true, error }
  }
}

function extractTokenFromResponse(resData) {
  if (!resData) return null
  return resData.token || resData.access_token || resData.accessToken || resData.jwt || null
}

function normalizeDashboardResponse(raw) {
  const mock = mockDashboardData()
  const r = raw || {}

  const userRaw = r.user || r.profile || r.usuario || r
  const nombre = userRaw?.nombre || userRaw?.name || mock.user.nombre
  const plan = userRaw?.plan || r.plan || userRaw?.subscription?.plan || mock.user.plan

  const streakDaysConsecutive =
    r.streakDaysConsecutive ?? r.streak_days ?? r.streak ?? r.streakDays ?? mock.streakDaysConsecutive

  const weeklyCompleted =
    normalizeWeeklyToBooleans(r.weeklyCompleted) ||
    normalizeWeeklyToBooleans(r.weekly) ||
    normalizeWeeklyToBooleans(r.checkinsWeekly) ||
    normalizeWeeklyToBooleans(r.history) ||
    mock.weeklyCompleted

  const proposal = r.proposal || r.proposalText || r.nextProposal || r.propuesta || mock.proposal

  const contactRaw = r.contact || r.trustContact || r.confidenceContact || r.contacto || {}
  const contact = {
    nombre: contactRaw?.nombre || contactRaw?.name || mock.contact.nombre,
    relacion: contactRaw?.relacion || contactRaw?.relationship || mock.contact.relacion,
  }

  const mode = modeToKey(r.mode || r.currentMode || r.modo || mock.mode)

  return {
    user: { nombre, plan },
    streakDaysConsecutive: Number(streakDaysConsecutive),
    weeklyCompleted,
    proposal,
    contact,
    mode,
    language: i18n.language || 'en',
  }
}

function normalizeCheckinHistoryResponse(raw) {
  const mock = mockDashboardData()
  const r = raw || {}

  const weeklyCompleted =
    normalizeWeeklyToBooleans(r.weeklyCompleted) ||
    normalizeWeeklyToBooleans(r.weekly) ||
    normalizeWeeklyToBooleans(r.checkinsWeekly) ||
    normalizeWeeklyToBooleans(r.history) ||
    mock.weeklyCompleted

  return { weeklyCompleted }
}

export async function registerUser({ name, email, password }) {
  const lang = i18n.language || 'en'
  const payload = { name, email, password, preferred_language: lang, language: lang }

  return requestWithMock(
    () =>
      axiosClient.post('/auth/register', payload).then((res) => {
        const token = extractTokenFromResponse(res.data)
        if (token) localStorage.setItem('breso_token', token)
        return res.data
      }),
    () => ({ ok: true, fromMock: true })
  )
}

export async function addContact({ name, email, relation }) {
  const payload = { name, email, relation }

  return requestWithMock(
    () => axiosClient.post('/contacts', payload).then((res) => res.data),
    () => ({ ok: true, fromMock: true })
  )
}

export async function getDashboard() {
  return requestWithMock(
    () => axiosClient.get('/dashboard').then((res) => normalizeDashboardResponse(res.data)),
    () => normalizeDashboardResponse({})
  )
}

export async function getCheckinHistory() {
  return requestWithMock(
    () => axiosClient.get('/checkin/history').then((res) => normalizeCheckinHistoryResponse(res.data)),
    () => normalizeCheckinHistoryResponse({})
  )
}

export async function postCheckin({ message, mode }) {
  const payload = { message, mode, language: i18n.language || 'en' }
  return requestWithMock(
    () =>
      axiosClient.post('/checkin', payload).then((res) => {
        const replyText =
          res.data?.reply?.text ||
          res.data?.replyText ||
          res.data?.message ||
          res.data?.text ||
          null

        const nextMode = modeToKey(res.data?.nextMode || res.data?.mode)

        return {
          replyText,
          nextMode: nextMode || modeToKey(mode),
        }
      }),
    () => {
      const replyText = i18n.t(`chat.mockReplies.${modeToKey(mode)}`)
      return { replyText, nextMode: modeToKey(mode) }
    }
  )
}
