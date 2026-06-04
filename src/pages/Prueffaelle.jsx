import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PLACEMENT_LABELS = {
  search: '🔍 Suche',
  feed:   '📰 Feed',
  chat:   '💬 Chat',
  jobs:   '💼 Jobs',
  rooms:  '🏢 Räume',
}

const AD_SIZE_LABELS = {
  small:  'Klein',
  medium: 'Mittel',
  large:  'Groß',
  xl:     'Premium',
}

const REFUND_STATUS = {
  pending:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#F59E0B', label: 'Ausstehend' },
  credited: { bg: 'rgba(38,140,251,0.1)',  border: 'rgba(38,140,251,0.3)',  text: '#268CFB', label: 'Gutschrift' },
  refunded: { bg: 'rgba(104,223,158,0.1)', border: 'rgba(104,223,158,0.3)', text: '#68DF9E', label: 'Erstattet'  },
}

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n ?? 0))
}

function pct(used, budget) {
  if (!budget) return 0
  return Math.min(100, Math.round((used / budget) * 100))
}

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 justify-between">
      <p className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      <p className="text-xs text-white text-right" style={{ wordBreak: 'break-all' }}>{value}</p>
    </div>
  )
}

function CampaignCard({ c }) {
  const deliveryPct = pct(c.impressions_used, c.budget_impressions)
  const isZero      = c.impressions_used === 0
  const st          = REFUND_STATUS[c.refund_status] ?? REFUND_STATUS.pending

  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl"
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Bild */}
      {c.image_url && (
        <div className="rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '16/9' }}>
          <img src={c.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {!c.image_url && (
        <div className="rounded-xl flex items-center justify-center mb-2"
             style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p className="text-xs text-gray-600">Kein Bild</p>
        </div>
      )}

      {/* Felder */}
      <div className="flex flex-col gap-1.5">
        <DetailRow label="Überschrift"  value={c.headline} />
        <DetailRow label="Beschreibung" value={c.description} />
        <DetailRow label="Ziel-URL"     value={c.target_url} />
        <DetailRow label="Placements"
          value={(c.placements ?? []).map(p => PLACEMENT_LABELS[p] ?? p).join(', ')} />
        <DetailRow label="Standort"
          value={[c.campaign_city, c.campaign_plz].filter(Boolean).join(' ')} />
        <DetailRow label="Umkreis"
          value={c.targeting_radius_km === 0 ? 'Bundesweit' : `${c.targeting_radius_km} km`} />
        <DetailRow label="Tanzstile"
          value={(c.targeting_styles ?? []).length > 0
            ? c.targeting_styles.join(', ')
            : 'Alle Stile'} />
        <DetailRow label="Größe"        value={AD_SIZE_LABELS[c.ad_size] ?? c.ad_size} />
        <DetailRow label="Laufzeit"     value={c.duration_days ? `${c.duration_days} Tage` : null} />
      </div>

      {/* Diagnose-Hinweis */}
      {(c.targeting_styles ?? []).length > 0 && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg"
             style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
          <p className="text-xs" style={{ color: 'rgba(239,68,68,0.85)' }}>
            Stil-Targeting aktiv ({c.targeting_styles.join(', ')}) — nur Nutzer mit diesen Stilen sehen die Anzeige. Bei kleiner Nutzerbasis oft Hauptgrund für 0 Einblendungen.
          </p>
        </div>
      )}
      {c.targeting_radius_km > 0 && c.targeting_radius_km <= 10 && (
        <div className="mt-1 flex items-start gap-2 px-3 py-2 rounded-lg"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span style={{ color: '#F59E0B' }}>📍</span>
          <p className="text-xs" style={{ color: 'rgba(245,158,11,0.85)' }}>
            Sehr kleiner Radius ({c.targeting_radius_km} km) — wenige Nutzer im Gebiet.
          </p>
        </div>
      )}
    </div>
  )
}

export default function Prueffaelle() {
  const [cases,     setCases]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('pending')
  const [acting,    setActing]    = useState(null)
  const [expanded,  setExpanded]  = useState(null)
  const [error,     setError]     = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line

  async function load() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.rpc('admin_get_refund_cases')
    if (error) setError(error.message)
    else setCases(data ?? [])
    setLoading(false)
  }

  async function handleAction(campaignId, refundType) {
    const label = refundType === 'refunded' ? 'Stripe-Rückerstattung' : 'Gutschrift'
    if (!confirm(`${label} für diese Kampagne ausstellen?`)) return
    setActing(campaignId)
    const { error } = await supabase.rpc('admin_mark_refunded', {
      p_campaign_id: campaignId,
      p_refund_type: refundType,
    })
    if (error) { setError(error.message); setActing(null); return }
    setCases(prev => prev.map(c =>
      c.campaign_id === campaignId ? { ...c, refund_status: refundType } : c
    ))
    setActing(null)
  }

  const visible      = cases.filter(c => filter === 'all' || c.refund_status === filter)
  const pendingCount = cases.filter(c => c.refund_status === 'pending').length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Prüffälle</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}>
              {pendingCount} offen
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Kampagnen mit 0 oder &lt; 10 % Einblendungen — Werbekarte einsehen, Ursache verstehen, Rückerstattung ausstellen.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { value: 'pending',  label: 'Ausstehend' },
          { value: 'refunded', label: 'Erstattet'  },
          { value: 'credited', label: 'Gutschrift'  },
          { value: 'all',      label: 'Alle'        },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filter === f.value
              ? { background: 'linear-gradient(90deg,rgba(226,40,128,0.2),rgba(38,140,251,0.2))', border: '1px solid rgba(226,40,128,0.35)', color: '#E22880' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA' }
            }>{f.label}</button>
        ))}
        <button onClick={load} className="ml-auto text-xs text-gray-500 hover:text-white transition-colors px-2">
          ↻ Aktualisieren
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400"
             style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm">Keine offenen Prüffälle.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map(c => {
            const deliveryPct = pct(c.impressions_used, c.budget_impressions)
            const isZero      = c.impressions_used === 0
            const st          = REFUND_STATUS[c.refund_status] ?? REFUND_STATUS.pending
            const isActing    = acting === c.campaign_id
            const isExpanded  = expanded === c.campaign_id

            return (
              <div key={c.campaign_id} className="flex flex-col gap-3 p-5 rounded-2xl"
                   style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white text-[15px]">{c.headline || c.title}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text }}>
                        {st.label}
                      </span>
                      {isZero
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                            0 Einblendungen
                          </span>
                        : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
                            {deliveryPct}% erreicht
                          </span>
                      }
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{c.owner_name} · {c.owner_email}</p>
                  </div>
                  {c.price_eur && (
                    <p className="text-lg font-extrabold flex-shrink-0"
                       style={{ color: c.refund_status === 'pending' ? '#F59E0B' : '#68DF9E' }}>
                      {Number(c.price_eur).toFixed(2)} €
                    </p>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{fmt(c.impressions_used)} / {fmt(c.budget_impressions)} Einblendungen</span>
                    <span style={{ color: deliveryPct < 10 ? '#F59E0B' : '#68DF9E' }}>{deliveryPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full"
                         style={{
                           width: `${deliveryPct}%`,
                           background: deliveryPct < 10
                             ? 'linear-gradient(90deg,#EF4444,#F59E0B)'
                             : 'linear-gradient(90deg,#E22880,#268CFB)',
                         }} />
                  </div>
                </div>

                {/* Laufzeit + Stripe */}
                <div className="flex gap-4 text-xs text-gray-500">
                  {c.starts_at && <span>Start: {new Date(c.starts_at).toLocaleDateString('de-DE')}</span>}
                  {c.ends_at   && <span>Ende: {new Date(c.ends_at).toLocaleDateString('de-DE')}</span>}
                  {c.stripe_session_id && <span className="text-gray-600">Stripe ✓</span>}
                </div>

                {/* Werbekarte aufklappen */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.campaign_id)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA' }}>
                  <span>{isExpanded ? 'Werbekarte ausblenden' : '🔍 Werbekarte & Einstellungen einsehen'}</span>
                  <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▾</span>
                </button>

                {isExpanded && <CampaignCard c={c} />}

                {/* Aktionen */}
                {c.refund_status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(c.campaign_id, 'refunded')} disabled={isActing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(104,223,158,0.08)', border: '1px solid rgba(104,223,158,0.25)', color: '#68DF9E' }}>
                      {isActing
                        ? <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block" />
                        : '↩ Stripe zurückzahlen'
                      }
                    </button>
                    <button onClick={() => handleAction(c.campaign_id, 'credited')} disabled={isActing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(38,140,251,0.08)', border: '1px solid rgba(38,140,251,0.25)', color: '#268CFB' }}>
                      🎁 Gutschrift ausstellen
                    </button>
                  </div>
                )}

                {c.refund_status !== 'pending' && (
                  <p className="text-xs font-semibold" style={{ color: st.text }}>✓ {st.label} wurde ausgestellt</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
