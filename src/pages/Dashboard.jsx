import { useState, useEffect } from 'react'
import { useNavigate }         from 'react-router-dom'
import { supabase }            from '../lib/supabase'
import StatusBadge             from '../components/StatusBadge'
import TypBadge                from '../components/TypBadge'

const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats,   setStats]   = useState(null)
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)

      const [allRes, recentRes] = await Promise.all([
        supabase.from('meldungen').select('status, typ'),
        supabase
          .from('meldungen')
          .select('id, typ, status, beschreibung, created_at, melder:user_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (cancelled) return

      if (allRes.error) { setError(allRes.error.message); setLoading(false); return }
      if (recentRes.error) { setError(recentRes.error.message); setLoading(false); return }

      const rows = allRes.data ?? []
      const computed = {
        gesamt:        rows.length,
        neu:           rows.filter(r => r.status === 'neu').length,
        in_bearbeitung: rows.filter(r => r.status === 'in_bearbeitung').length,
        erledigt:      rows.filter(r => r.status === 'erledigt').length,
        fehler:        rows.filter(r => r.typ === 'fehler').length,
        gewaltandrohung: rows.filter(r => r.typ === 'gewaltandrohung').length,
        sexuelle_belaestigung: rows.filter(r => r.typ === 'sexuelle_belaestigung').length,
      }
      setStats(computed)
      setRecent(recentRes.data ?? [])
      setLoading(false)
    }

    load().then(undefined, (err) => {
      if (!cancelled) { setError(err.message); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Lade Dashboard…</div>
  if (error)   return <div className="p-8 text-red-400 text-sm">Fehler: {error}</div>

  const statCards = [
    { label: 'Gesamt',         value: stats.gesamt,         color: 'text-white' },
    { label: 'Neu',            value: stats.neu,            color: 'text-blue-400' },
    { label: 'In Bearbeitung', value: stats.in_bearbeitung, color: 'text-orange-400' },
    { label: 'Erledigt',       value: stats.erledigt,       color: 'text-green-400' },
  ]

  const typCards = [
    { label: 'Technische Fehler',    value: stats.fehler,                 color: 'text-gray-400' },
    { label: 'Gewaltandrohungen',    value: stats.gewaltandrohung,         color: 'text-red-400' },
    { label: 'Sexuelle Belästigung', value: stats.sexuelle_belaestigung,   color: 'text-purple-400' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>

      {/* Status-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(c => (
          <div
            key={c.label}
            className="p-5 rounded-2xl"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Typ-Aufschlüsselung */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {typCards.map(c => (
          <div
            key={c.label}
            className="p-5 rounded-2xl"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Letzte 5 Meldungen */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-white">Letzte Meldungen</h3>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">Noch keine Meldungen vorhanden.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Datum</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Typ</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m, i) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/meldungen/${m.id}`)}
                  className="cursor-pointer hover:bg-white/5 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmt(m.created_at)}</td>
                  <td className="px-5 py-3"><TypBadge typ={m.typ} /></td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell max-w-xs truncate">
                    {m.beschreibung}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
