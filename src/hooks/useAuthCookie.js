import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook zum Überwachen des JWT-Cookies aus tanzpartner-web.
 * Wenn Cookie nicht existiert → User ist in der Hauptapp ausgeloggt → Local Session invalidieren.
 *
 * Dies ermöglicht automatisches Cross-Domain Logout.
 */
export function useAuthCookie() {
  useEffect(() => {
    // Lese JWT-Cookie
    const jwt = getCookie('__tp_jwt')
    if (!jwt) {
      // Kein Cookie → Logout lokal auch
      supabase.auth.signOut()
    }

    // Überwache Cookie-Änderungen (ca. alle 5s)
    const interval = setInterval(() => {
      const currentJwt = getCookie('__tp_jwt')
      if (!currentJwt) {
        // Cookie wurde gelöscht in tanzpartner-web → logout
        supabase.auth.signOut()
        clearInterval(interval)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])
}

// Helper
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}
