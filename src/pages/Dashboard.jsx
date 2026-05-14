import { useState, useEffect, useMemo } from 'react'
import { useNavigate }                   from 'react-router-dom'
import { supabase }                      from '../lib/supabase'
import StatusBadge                       from '../components/StatusBadge'
import TypBadge                          from '../components/TypBadge'

const fmt = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function getISOWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function formatDuration(ms) {
  if (ms < 0) return '—'
  const h = ms / 3600000
  if (h < 48) return `${h.toFixed(1)} Std.`
  return `${(h / 24).toFixed(1)} Tage`
}

const ABSCHLUSS_LABELS = {
  hat_sich_geklaert:    'Hat sich geklärt',
  fehlalarm:            'Fehlalarm',
  zur_anzeige_gebracht: 'Zur Anzeige gebracht',
}
const MONAT_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function Dashboard() {
  const navigate = useNavigate()
  const [allRows,  setAllRows]  = useState([])
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const [filterJahr,  setFilterJahr]  = useState('')
  const [filterMonat, setFilterMonat] = useState('')
  const [filterKW,    setFilterKW]    = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      const [allRes, recentRes] = await Promise.all([
        supabase.from('meldungen').select('id, status, typ, created_at, erledigt_at, abschlussgrund'),
        supabase.from('meldungen')
          .select('id, typ, status, beschreibung, created_at, melder:user_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (cancelled) return
      if (allRes.error) { setError(allRes.error.message); setLoading(false); return }
      if (recentRes.error) { setError(recentRes.error.message); setLoading(false); return }
      setAllRows(allRes.data ?? [])
      setRecent(recentRes.data ?? [])
      setLoading(false)
    }

    load().then(undefined, (err) => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const years = useMemo(() => {
    const set = new Set(allRows.map(r => new Date(r.created_at).getFullYear()))
    return [...set].sort((a, b) => b - a)
  }, [allRows])

  const filtered = useMemo(() => allRows.filter(r => {
    const d = new Date(r.created_at)
    if (filterJahr  && d.getFullYear()  !== Number(filterJahr))  return false
    if (filterMonat && (d.getMonth()+1) !== Number(filterMonat)) return false
    if (filterKW    && getISOWeek(d)    !== Number(filterKW))    return false
    return true
  }), [allRows, filterJahr, filterMonat, filterKW])

  const stats = useMemo(() => ({
    gesamt:               filtered.length,
    neu:                  filtered.filter(r => r.status === 'neu').length,
    in_bearbeitung:       filtered.filter(r => r.status === 'in_bearbeitung').length,
    erledigt:             filtered.filter(r => r.status === 'erledigt').length,
    fehler:               filtered.filter(r => r.typ === 'fehler').length,
    gewaltandrohung:      filtered.filter(r => r.typ === 'gewaltandrohung').length,
    sexuelle_belaestigung:filtered.filter(r => r.typ === 'sexuelle_belaestigung').length,
    hat_sich_geklaert:    filtered.filter(r => r.abschlussgrund === 'hat_sich_geklaert').length,
    fehlalarm:            filtered.filter(r => r.abschlussgrund === 'fehlalarm').length,
    zur_anzeige_gebracht: filtered.filter(r => r.abschlussgrund === 'zur_anzeige_gebracht').length,
  }), [filtered])

  const { avgDuration, erledigtTable } = useMemo(() => {
    const done = filtered.filter(r => r.status === 'erledigt' && r.erledigt_at)
    const durations = done.map(r => new Date(r.erledigt_at) - new Date(r.created_at)).filter(d => d >= 0)
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
    const table = done
      .slice().sort((a, b) => new Date(b.erledigt_at) - new Date(a.erledigt_at)).slice(0, 10)
      .map(r => ({ ...r, duration: new Date(r.erledigt_at) - new Date(r.created_at) }))
    return { avgDuration: avg, erledigtTable: table }
  }, [filtered])

  if (loading) return <div className="p-8 text-gray-400 text-sm">Lade Dashboard…</div>
  if (error)   return <div className="p-8 text-red-400 text-sm">Fehler: {error}</div>

  const card = { background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>

      {/* Zeitraum-Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-2xl" style={card}>
        <span className="text-xs text-gray-500 font-semibold mr-1">Zeitraum:</span>

        <select value={filterJahr} onChange={e => { setFilterJahr(e.target.value); setFilterKW('') }}
          className="px-3 py-2 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none">
          <option value="">Alle Jahre</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={filterMonat} onChange={e => { setFilterMonat(e.target.value); setFilterKW('') }}
          className="px-3 py-2 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none">
          <option value="">Alle Monate</option>
          {MONAT_LABELS.map((l, i) => <option key={i+1} value={i+1}>{l}</option>)}
        </select>

        <select value={filterKW} onChange={e => setFilterKW(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none">
          <option value="">Alle KW</option>
          {Array.from({ length: 53 }, (_, i) => i + 1).map(kw => <option key={kw} value={kw}>KW {kw}</option>)}
        </select>

        {(filterJahr || filterMonat || filterKW) && (
          <button onClick={() => { setFilterJahr(''); setFilterMonat(''); setFilterKW('') }}
            className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            × Zurücksetzen
          </button>
        )}

        <span className="ml-auto text-xs text-gray-600">{filtered.length} Meldungen im Zeitraum</span>
      </div>

      {/* Status-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Gesamt',         value: stats.gesamt,         color: 'text-white' },
          { label: 'Neu',            value: stats.neu,            color: 'text-blue-400' },
          { label: 'In Bearbeitung', value: stats.in_bearbeitung, color: 'text-orange-400' },
          { label: 'Erledigt',       value: stats.erledigt,       color: 'text-green-400' },
        ].map(c => (
          <div key={c.label} className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Typ-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Technische Fehler',    value: stats.fehler,                 color: 'text-gray-400' },
          { label: 'Gewaltandrohungen',    value: stats.gewaltandrohung,        color: 'text-red-400' },
          { label: 'Sexuelle Belästigung', value: stats.sexuelle_belaestigung,  color: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Abschlussgrund-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Hat sich geklärt',     value: stats.hat_sich_geklaert,    color: 'text-green-400' },
          { label: 'Fehlalarm',            value: stats.fehlalarm,            color: 'text-yellow-400' },
          { label: 'Zur Anzeige gebracht', value: stats.zur_anzeige_gebracht, color: 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 font-medium mb-1">Abschluss: {c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Durchlaufzeit */}
      <div className="rounded-2xl overflow-hidden mb-6" style={card}>
        <div className="px-5 py-4 border-b flex items-center gap-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <h3 className="text-sm font-semibold text-white">Durchlaufzeit</h3>
            <p className="text-xs text-gray-500">Vom Eingang bis zur Erledigung</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">Ø Durchlaufzeit</p>
            <p className="text-xl font-bold text-white">{avgDuration !== null ? formatDuration(avgDuration) : '—'}</p>
          </div>
        </div>
        {erledigtTable.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">Noch keine erledigten Tickets im gewählten Zeitraum.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Typ</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Eingegangen</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Erledigt</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">Dauer</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Abschluss</th>
              </tr>
            </thead>
            <tbody>
              {erledigtTable.map(r => (
                <tr key={r.id} onClick={() => navigate(`/meldungen/${r.id}`)}
                  className="cursor-pointer hover:bg-white/5 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-5 py-3"><TypBadge typ={r.typ} /></td>
                  <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmt(r.erledigt_at)}</td>
                  <td className="px-5 py-3 text-sm text-green-400 font-medium whitespace-nowrap">{formatDuration(r.duration)}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {r.abschlussgrund ? ABSCHLUSS_LABELS[r.abschlussgrund] : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Letzte 5 Meldungen */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-white">Letzte Meldungen (gesamt)</h3>
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
              {recent.map(m => (
                <tr key={m.id} onClick={() => navigate(`/meldungen/${m.id}`)}
                  className="cursor-pointer hover:bg-white/5 transition-colors border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-5 py-3 text-sm text-gray-300 whitespace-nowrap">{fmt(m.created_at)}</td>
                  <td className="px-5 py-3"><TypBadge typ={m.typ} /></td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell max-w-xs truncate">{m.beschreibung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
