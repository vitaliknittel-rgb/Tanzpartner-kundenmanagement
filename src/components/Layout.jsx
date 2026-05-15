import { useState, useEffect, useRef }         from 'react'
import { NavLink, useNavigate, useLocation }    from 'react-router-dom'
import { supabase }                              from '../lib/supabase'

const MELDUNG_TYPEN = [
  { typ: 'sexuelle_belaestigung', label: 'Sexuelle Belästigung' },
  { typ: 'gewaltandrohung',       label: 'Gewaltandrohung' },
  { typ: 'stalking',              label: 'Stalking' },
  { typ: 'betrug',                label: 'Betrug' },
  { typ: 'hassrede',              label: 'Hassrede' },
  { typ: 'spam',                  label: 'Spam' },
  { typ: 'fake_profil',           label: 'Fake-Profil' },
  { typ: 'minderjaehrigenschutz', label: 'Minderjährigenschutz' },
  { typ: 'sonstiges',             label: 'Sonstiges' },
  { typ: 'fehler',                label: 'Technischer Fehler' },
]

const navItemStyle = (active) =>
  active
    ? { background: 'linear-gradient(90deg, rgba(226,40,128,0.2) 0%, rgba(38,140,251,0.2) 100%)', border: '1px solid rgba(226,40,128,0.3)' }
    : {}

function Badge({ count }) {
  if (!count) return null
  return (
    <span
      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
      style={{ background: 'linear-gradient(90deg, #E22880, #268CFB)', color: '#fff' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Layout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()

  const isMeldungenActive = location.pathname.startsWith('/meldungen')
  const [meldungenOpen, setMeldungenOpen] = useState(isMeldungenActive)

  const [neuCount,     setNeuCount]     = useState(0)
  const [feedNeuCount, setFeedNeuCount] = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const [allRes, feedRes] = await Promise.all([
        supabase.from('meldungen').select('id', { count: 'exact', head: true }).eq('status', 'neu'),
        supabase.from('meldungen').select('id', { count: 'exact', head: true }).eq('status', 'neu').eq('typ', 'feed_meldung'),
      ])
      setNeuCount(allRes.count ?? 0)
      setFeedNeuCount(feedRes.count ?? 0)
    }
    load().then(undefined, (err) => console.error('[Layout] Badge-Load:', err))

    if (channelRef.current) { try { channelRef.current.unsubscribe() } catch {} }
    channelRef.current = supabase
      .channel('layout_meldungen_badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meldungen' }, (payload) => {
        setNeuCount(n => n + 1)
        if (payload.new?.typ === 'feed_meldung') setFeedNeuCount(n => n + 1)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meldungen' }, () => {
        load().then(undefined, () => {})
      })
      .subscribe()

    return () => { try { channelRef.current?.unsubscribe() } catch {} }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-navy flex">
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col"
        style={{ background: '#161b22', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Tanzpartner</p>
          <h1 className="text-base font-bold text-white mt-0.5">Kundenmanagement</h1>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {/* Dashboard */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => navItemStyle(isActive)}
          >
            Dashboard
          </NavLink>

          {/* Meldungen – aufklappbar */}
          <div>
            <button
              onClick={() => setMeldungenOpen(o => !o)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isMeldungenActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              style={isMeldungenActive && !location.search ? navItemStyle(true) : {}}
            >
              <span>Meldungen</span>
              <div className="flex items-center gap-1.5">
                <Badge count={neuCount - feedNeuCount} />
                <span className="text-xs text-gray-500 transition-transform duration-200"
                  style={{ display: 'inline-block', transform: meldungenOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ›
                </span>
              </div>
            </button>

            {meldungenOpen && (
              <div className="mt-1 ml-3 flex flex-col gap-0.5">
                {/* Alle Meldungen */}
                <NavLink
                  to="/meldungen"
                  end
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive && !location.search ? 'text-white bg-white/8' : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  Alle
                  <Badge count={neuCount} />
                </NavLink>

                {/* Feed-Meldungen */}
                {(() => {
                  const isActive = location.pathname === '/meldungen' && location.search === '?typ=feed_meldung'
                  return (
                    <NavLink
                      to="/meldungen?typ=feed_meldung"
                      className={`flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive ? 'text-white bg-white/8' : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Feed
                      <Badge count={feedNeuCount} />
                    </NavLink>
                  )
                })()}

                {/* Übrige Typen */}
                {MELDUNG_TYPEN.map(({ typ, label }) => {
                  const isActive = location.pathname === '/meldungen' && location.search === `?typ=${typ}`
                  return (
                    <NavLink
                      key={typ}
                      to={`/meldungen?typ=${typ}`}
                      className={`flex items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive ? 'text-white bg-white/8' : 'text-gray-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="px-3 pb-5">
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 text-left transition-all"
          >
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
