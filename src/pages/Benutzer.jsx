import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ACCOUNT_LABELS = {
  personal:   'Privat',
  school:     'Tanzschule',
  agency:     'Agentur',
  organizer:  'Veranstalter',
}

const ACCOUNT_COLORS = {
  personal:   { bg: 'rgba(113,113,122,0.15)',  color: '#A1A1AA' },
  school:     { bg: 'rgba(38,140,251,0.15)',   color: '#60A5FA' },
  agency:     { bg: 'rgba(168,85,247,0.15)',   color: '#C084FC' },
  organizer:  { bg: 'rgba(34,197,94,0.15)',    color: '#4ADE80' },
}

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—'

function Pill({ label, color, bg }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

function Toggle({ active, onChange, disabled, color = '#E22880' }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all disabled:opacity-40"
      style={active ? { background: color } : { background: 'rgba(255,255,255,0.1)' }}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  )
}

export default function Benutzer() {
  const [users,       setUsers]       = useState([])
  const [query,       setQuery]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [acting,      setActing]      = useState(null)   // user-id während einer Aktion
  const [resetSent,   setResetSent]   = useState(null)   // user-id nach Reset-Mail
  const [copiedId,    setCopiedId]    = useState(null)
  const debounceRef = useRef(null)

  const search = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('admin_search_users', { p_query: q ?? '' })
    if (err) setError(err.message)
    else setUsers(data ?? [])
    setLoading(false)
  }, [])

  // Alle laden beim ersten Öffnen
  useEffect(() => { search('') }, [search])

  // Suche debounced (400ms)
  const handleSearch = (val) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const toggleSuspend = async (u) => {
    setActing(u.id)
    const { error: err } = await supabase.rpc('admin_set_suspended', {
      p_user_id: u.id,
      p_suspend: !u.is_suspended,
    })
    if (err) setError(err.message)
    else setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_suspended: !u.is_suspended } : x))
    setActing(null)
  }

  const toggleAdmin = async (u) => {
    setActing(u.id)
    const { error: err } = await supabase.rpc('admin_set_admin', {
      p_user_id: u.id, p_is_admin: !u.is_admin,
    })
    if (err) setError(err.message)
    else setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_admin: !u.is_admin } : x))
    setActing(null)
  }

  const toggleHouseAd = async (u) => {
    setActing(u.id)
    const { error: err } = await supabase.rpc('admin_set_house_advertiser', {
      p_user_id: u.id, p_value: !u.is_house_advertiser,
    })
    if (err) setError(err.message)
    else setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_house_advertiser: !u.is_house_advertiser } : x))
    setActing(null)
  }

  const sendPasswordReset = async (u) => {
    setActing(u.id)
    const { error: err } = await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${window.location.origin.replace('kundenmanagement', 'tanzpartner-web')}/auth/reset`,
    })
    if (err) setError(err.message)
    else { setResetSent(u.id); setTimeout(() => setResetSent(null), 4000) }
    setActing(null)
  }

  const copyId = async (id) => {
    await navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const acBadge = (type) => {
    const c = ACCOUNT_COLORS[type] ?? ACCOUNT_COLORS.personal
    return <Pill label={ACCOUNT_LABELS[type] ?? type} color={c.color} bg={c.bg} />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Benutzerverwaltung</h1>
        <p className="text-sm text-gray-400 mt-1">
          {users.length} Benutzer{query ? ` für „${query}"` : ' geladen'} · Suche nach Name, E-Mail oder Telefon
        </p>
      </div>

      {/* Suchfeld */}
      <div className="flex gap-3 mb-5">
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Name, E-Mail, Telefonnummer…"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={() => search(query)}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #E22880, #268CFB)', color: '#fff' }}
        >
          {loading ? '…' : 'Suchen'}
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Ladeanzeige */}
      {loading && users.length === 0 && (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {/* Keine Ergebnisse */}
      {!loading && users.length === 0 && (
        <p className="text-center py-16 text-gray-500">Keine Benutzer gefunden.</p>
      )}

      {/* Benutzerkarten */}
      <div className="flex flex-col gap-3">
        {users.map(u => (
          <div
            key={u.id}
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              opacity: u.is_suspended ? 0.7 : 1,
            }}
          >
            {/* Zeile 1: Name + Badges */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-sm">{u.name || '–'}</p>
                  {acBadge(u.account_type)}
                  {u.is_admin && (
                    <Pill label="Admin" color="#FF2D87" bg="rgba(255,45,135,0.15)" />
                  )}
                  {u.is_house_advertiser && (
                    <Pill label="📢 Hauswerbung" color="#A78BFA" bg="rgba(167,139,250,0.15)" />
                  )}
                  {u.is_suspended && (
                    <Pill label="Gesperrt" color="#F87171" bg="rgba(239,68,68,0.15)" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                {u.phone && <p className="text-xs text-gray-600 mt-0.5">{u.phone}</p>}
                <p className="text-xs text-gray-600 mt-1">Registriert: {fmt(u.created_at)}</p>
              </div>

              {/* User-ID kopieren */}
              <button
                onClick={() => copyId(u.id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: copiedId === u.id ? '#4ADE80' : '#666' }}
                title="User-ID kopieren"
              >
                {copiedId === u.id ? '✓ Kopiert' : 'ID'}
              </button>
            </div>

            {/* Reset-Bestätigung */}
            {resetSent === u.id && (
              <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }}>
                ✓ Passwort-Reset-Mail wurde an {u.email} gesendet
              </div>
            )}

            {/* Trennlinie */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

            {/* Aktionen */}
            <div className="flex flex-col gap-2.5">

              {/* Sperren/Entsperren */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {u.is_suspended ? 'Benutzer gesperrt' : 'Benutzer sperren'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {u.is_suspended ? 'Account ist deaktiviert. Toggle zum Entsperren.' : 'Verhindert Login und App-Nutzung.'}
                  </p>
                </div>
                <Toggle
                  active={u.is_suspended}
                  onChange={() => toggleSuspend(u)}
                  disabled={acting === u.id}
                  color="#EF4444"
                />
              </div>

              {/* Admin */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Admin-Rechte</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Zugang zu Admin-Panel und allen Verwaltungsfunktionen.
                  </p>
                </div>
                <Toggle
                  active={u.is_admin}
                  onChange={() => toggleAdmin(u)}
                  disabled={acting === u.id}
                  color="linear-gradient(135deg, #FF2D87, #7A5CFF)"
                />
              </div>

              {/* Hauswerbung */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    📢 Hauswerbung-Account
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Erlaubt bis zu 50 Lückenfüller-Anzeigen unter /house-ads.
                  </p>
                </div>
                <Toggle
                  active={u.is_house_advertiser}
                  onChange={() => toggleHouseAd(u)}
                  disabled={acting === u.id}
                  color="linear-gradient(135deg, #E22880, #268CFB)"
                />
              </div>

              {/* Passwort-Reset */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Passwort zurücksetzen</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sendet eine Reset-Mail an {u.email}
                  </p>
                </div>
                <button
                  onClick={() => sendPasswordReset(u)}
                  disabled={acting === u.id || resetSent === u.id}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#A1A1AA' }}
                >
                  {resetSent === u.id ? '✓ Gesendet' : acting === u.id ? '…' : 'Reset senden'}
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
