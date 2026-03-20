import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const USER_NAME_KEY = 'breso_user_name'

function getStoredName() {
  try { return localStorage.getItem(USER_NAME_KEY) || '' } catch { return '' }
}

/**
 * Listens to Supabase auth state changes and handles redirects.
 * Returns { session, loading }.
 */
export function useSession() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined) // undefined = loading
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoading(false)

      if (event === 'SIGNED_IN') {
        // Persist token for API calls
        const token = s?.access_token
        if (token) {
          try { localStorage.setItem('breso_token', token) } catch {}
        }
        // Persist name from metadata if present
        const name = s?.user?.user_metadata?.display_name || s?.user?.user_metadata?.name || ''
        if (name) {
          try { localStorage.setItem(USER_NAME_KEY, name) } catch {}
        }
        // Redirect: returning user → chat, new user → landing
        const hasName = getStoredName()
        navigate(hasName ? '/chat' : '/landing', { replace: true })
      }

      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('breso_token') } catch {}
        navigate('/signin', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { session, loading }
}
