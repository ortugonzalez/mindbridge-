import { supabase } from '../lib/supabase'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
  })
  if (response.status === 401) {
    await supabase.auth.signOut()
    window.location.href = '/signin'
    throw new Error('Unauthorized')
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error((error as { message?: string }).message || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
}

// Typed API models
export interface CheckInResponse {
  checkin_id: string
  message: string
  conversation_mode: string
  scheduled_at: string
}

export interface CheckInResult {
  checkin_id: string
  processed: boolean
  tone_score: number | null
  follow_up_message: string | null
  baseline_updated: boolean
}

export interface UserProfile {
  id: string
  language: string
  timezone: string
  checkin_time_preference: string
  baseline_ready: boolean
}

export interface BehavioralBaseline {
  user_id: string
  checkins_count: number
  avg_tone_score: number
  engagement_rate: number
}

export interface CheckInHistoryItem {
  scheduled_at: string
  responded: boolean
  tone_score: number | null
  word_count: number | null
}

export const bresAPI = {
  // Health
  health: () => api.get<{ status: string }>('/health'),

  // Auth
  register: (data: { email: string; password: string; language: string; timezone: string }) =>
    api.post<{ user_id: string; message: string }>('/auth/register', data),
  signin: (email: string, password: string) =>
    api.post<{ access_token: string; user_id: string }>('/auth/signin', { email, password }),
  magicLink: (email: string) =>
    api.post<{ message: string }>('/auth/magic-link', { email }),
  signout: () => api.post<{ message: string }>('/auth/signout', {}),

  // Users
  getMe: () => api.get<UserProfile>('/users/me'),
  updateMe: (data: Partial<UserProfile>) => api.patch<UserProfile>('/users/me', data),
  getBaseline: () => api.get<BehavioralBaseline>('/users/me/baseline'),

  // Check-ins
  getTodaysCheckin: () => api.get<CheckInResponse>('/checkins/today'),
  respondToCheckin: (checkin_id: string, response_text: string) =>
    api.post<CheckInResult>('/checkins/respond', { checkin_id, response_text }),
  getCheckinHistory: (days = 30) =>
    api.get<CheckInHistoryItem[]>(`/checkins/history?days=${days}`),
}
