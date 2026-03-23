import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useSession() {
  const navigate = useNavigate()

  useEffect(() => {
    const redirectUser = () => {
      const name = localStorage.getItem('breso_user_name')
      const userType = localStorage.getItem('breso_user_type') || 'patient'
      const currentPath = window.location.pathname
      const publicPaths = ['/', '/signin', '/splash']

      if (publicPaths.includes(currentPath)) {
        if (!name) {
          navigate('/onboarding', { replace: true })
        } else if (userType === 'family') {
          navigate('/family-dashboard', { replace: true })
        } else {
          navigate('/home', { replace: true })
        }
      }
    }

    const init = async () => {
      // Step 1: Handle PKCE code in URL — must run before session check
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(window.location.href)
        window.history.replaceState({}, '', '/')
        if (data?.session) {
          try { localStorage.setItem('breso_token', data.session.access_token) } catch {}
          const name = localStorage.getItem('breso_user_name')
          const userType = localStorage.getItem('breso_user_type') || 'patient'
          
          if (!name) {
            if (userType === 'family') navigate('/family-onboarding', { replace: true })
            else navigate('/onboarding', { replace: true })
          } else {
            if (userType === 'family') navigate('/family-dashboard', { replace: true })
            else navigate('/home', { replace: true })
          }
          return
        }
      }

      // Step 2: Check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { localStorage.setItem('breso_token', session.access_token) } catch {}
        redirectUser()
      }
    }

    init()

    // Step 3: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try { localStorage.setItem('breso_token', session.access_token) } catch {}
        redirectUser()
      }
      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('breso_token') } catch {}
        navigate('/', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])
}
