import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase }               from '../lib/supabase'
import StatusBadge                from '../components/StatusBadge'
import TypBadge                   from '../components/TypBadge'

const fmt = (d) => new Date(d).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export default function MeldungDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [meldung,  setMeldung]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const [status,       setStatus]       = useState('neu')
  const [adminNotizen, setAdminNotizen] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('meldungen')
      .select(`
        id, typ, status, beschreibung, created_at, updated_at,
        admin_notizen, gemeldeter_user_name,
        melder:user_id(id, name),
        gemeldeter:gemeldeter_user_id(id, name)
      `)
      .eq('id', id)
      .single()
      .then(({ data, error: qErr }) => {
        if (cancelled) return
        if (qErr) { setError(qErr.message); setLoading(false); return }
        setMeldung(data)
        setStatus(data.status)
        setAdminNotizen(data.admin_notizen ?? '')
        setLoading(false)
      }, (err) => {
        if (!cancelled) { setError(err.message); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    const { error: saveErr } = await supabase
      .from('meldungen')
      .update({ status, admin_notizen: adminNotizen || null })
      .eq('id', id)

    setSaving(false)

    if (saveErr) { setError('Speichern fehlgeschlagen: ' + saveErr.message); return }

    setMeldung(prev => ({ ...prev, status, admin_notizen: adminNotizen }))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Lade Meldung…</div>
  if (error)   return <div className="p-8 text-red-400 text-sm">Fehler: {error}</div>
  if (!meldung) return null

  const card = { background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/meldungen')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Zurück
        </button>
        <h2 className="text-xl font-bold text-white">Meldung</h2>
      </div>

      <div className="flex flex-col gap-5">

        {/* Meta-Infos */}
        <div className="p-5 rounded-2xl flex flex-wrap gap-4" style={card}>
          <div>
            <p className="text-xs text-gray-500 mb-1">Typ</p>
            <TypBadge typ={meldung.typ} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <StatusBadge status={meldung.status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Eingegangen</p>
            <p className="text-sm text-gray-300">{fmt(meldung.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Zuletzt aktualisiert</p>
            <p className="text-sm text-gray-300">{fmt(meldung.updated_at)}</p>
          </div>
        </div>

        {/* Melder + Gemeldeter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 mb-2">Melder</p>
            {meldung.melder ? (
              <>
                <p className="text-sm font-semibold text-white">{meldung.melder.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{meldung.melder.id}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Account gelöscht</p>
            )}
          </div>
          <div className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 mb-2">Gemeldeter User</p>
            {meldung.gemeldeter ? (
              <>
                <p className="text-sm font-semibold text-white">{meldung.gemeldeter.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{meldung.gemeldeter.id}</p>
              </>
            ) : meldung.gemeldeter_user_name ? (
              <p className="text-sm text-gray-300">{meldung.gemeldeter_user_name}</p>
            ) : (
              <p className="text-sm text-gray-500">—</p>
            )}
          </div>
        </div>

        {/* Beschreibung */}
        <div className="p-5 rounded-2xl" style={card}>
          <p className="text-xs text-gray-500 mb-2">Beschreibung des Nutzers</p>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{meldung.beschreibung}</p>
        </div>

        {/* Bearbeitung */}
        <div className="p-5 rounded-2xl flex flex-col gap-4" style={card}>
          <p className="text-sm font-semibold text-white">Ticket bearbeiten</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors"
            >
              <option value="neu">Neu</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
              <option value="erledigt">Erledigt</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Interne Notizen</label>
            <textarea
              value={adminNotizen}
              onChange={e => setAdminNotizen(e.target.value)}
              rows={4}
              placeholder="Interne Notizen (nur für Admins sichtbar)…"
              className="px-4 py-3 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #E22880 0%, #268CFB 100%)' }}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            {saved && <span className="text-sm text-green-400">Gespeichert ✓</span>}
          </div>
        </div>

      </div>
    </div>
  )
}
