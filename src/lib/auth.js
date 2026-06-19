import { supabase } from './supabase'

/**
 * Logout mit Cookie-Cleanup
 * Löscht JWT-Cookie und beendet Supabase-Session
 */
export async function logout() {
  // Lösche JWT-Cookie
  const domain = import.meta.env.VITE_COOKIE_DOMAIN || 'localhost'
  document.cookie = `__tp_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`

  // Logout in Supabase
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[Auth] Logout error:', error)
}

/**
 * Lese JWT-Cookie
 */
export function getJwtCookie() {
  const match = document.cookie.match(new RegExp('(^|; )__tp_jwt=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}
