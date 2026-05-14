import { NavLink, useNavigate } from 'react-router-dom'
import { supabase }              from '../lib/supabase'

const NAV = [
  { to: '/',          label: 'Dashboard' },
  { to: '/meldungen', label: 'Meldungen' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()

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
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'linear-gradient(90deg, rgba(226,40,128,0.2) 0%, rgba(38,140,251,0.2) 100%)', border: '1px solid rgba(226,40,128,0.3)' }
                : {}
              }
            >
              {label}
            </NavLink>
          ))}
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
