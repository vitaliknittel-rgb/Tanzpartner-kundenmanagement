import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams }      from 'react-router-dom'
import { supabase }                          from '../lib/supabase'
import StatusBadge                           from '../components/StatusBadge'
import TypBadge                              from '../components/TypBadge'

const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Meldungen() {
  const navigate             = useNavigate()
  const [searchParams]       = useSearchParams()

  const [meldungen, setMeldungen] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('alle')
  const [filterTyp,    setFilterTyp]    = useState(searchParams.get('typ') ?? 'alle')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('meldungen')
      .select('id, typ, status, beschreibung, created_at, gemeldeter_user_name, melder:user_id(name)')
      .order('created_at', { ascending: false })

    if (filterStatus !== 'alle') query = query.eq('status', filterStatus)
    if (filterTyp    !== 'alle') query = query.eq('typ',    filterTyp)

    const { data, error: qErr } = await query
    if (qErr) { setError(qErr.message); setLoading(false); return }

    setMeldungen(data ?? [])
    setLoading(false)
  }, [filterStatus, filterTyp])

  useEffect(() => {
    load().then(undefined, (err) => setError(err.message))
  }, [load])

  const filtered = search.trim()
    ? meldungen.filter(m => m.beschreibung.toLowerCase().includes(search.toLowerCase()))
    : meldungen

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          Meldungen
          <span className="ml-2 text-sm font-normal text-gray-500">({filtered.length})</span>
        </h2>
      </div>

      {/* Filter-Leiste */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Beschreibung durchsuchen…"
          className="px-4 py-2 rounded-xl text-sm text-white bg-navy-light border border-white/10 outline-none focus:border-white/30 transition-colors min-w-[220px]"
        />

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm text-white bg-navy-light border border-white/10 outline-none focus:border-white/30 transition-colors"
        >
          <option value="alle">Alle Status</option>
          <option value="neu">Neu</option>
          <option value="in_bearbeitung">In Bearbeitung</option>
          <option value="erledigt">Erledigt</option>
        </select>

        <select
          value={filterTyp}
          onChange={e => setFilterTyp(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm text-white bg-navy-light border border-white/10 outline-none focus:border-white/30 transition-colors"
        >
          <option value="alle">Alle Typen</option>
          <option value="fehler">Technischer Fehler</option>
          <option value="gewaltandrohung">Gewaltandrohung</option>
          <option value="sexuelle_belaestigung">Sexuelle Belästigung</option>
        </select>
      </div>

      {/* Tabelle */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Lade Meldungen…</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-red-400">Fehler: {error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">Keine Meldungen gefunden.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">Datum</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Typ</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Beschreibung</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Melder</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden xl:table-cell">Gemeldeter User</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/meldungen/${m.id}`)}
                  className="cursor-pointer hover:bg-white/5 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <td className="px-5 py-3.5 text-sm text-gray-300 whitespace-nowrap">{fmt(m.created_at)}</td>
                  <td className="px-5 py-3.5"><TypBadge typ={m.typ} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 hidden lg:table-cell max-w-xs">
                    <span className="line-clamp-2">{m.beschreibung.slice(0, 100)}{m.beschreibung.length > 100 ? '…' : ''}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell whitespace-nowrap">
                    {m.melder?.name ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400 hidden xl:table-cell whitespace-nowrap">
                    {m.gemeldeter_user_name ?? <span className="text-gray-600">—</span>}
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
