import { useState } from 'react'
import { supabase }  from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Anmeldung fehlgeschlagen: ' + authError.message)
      setLoading(false)
      return
    }

    // Admin-Prüfung
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
    if (adminError || !isAdmin) {
      await supabase.auth.signOut()
      setError('Zugriff verweigert: Kein Admin-Konto.')
      setLoading(false)
      return
    }

    onLogin()
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Kundenmanagement</h1>
          <p className="text-sm text-gray-400 mt-1">Nur für Administratoren</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="px-4 py-3 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors"
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="px-4 py-3 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #E22880 0%, #268CFB 100%)' }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
