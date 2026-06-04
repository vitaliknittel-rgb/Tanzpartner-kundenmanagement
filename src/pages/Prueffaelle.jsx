import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_COLOR = {
  pending:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  text: '#F59E0B',  label: 'Ausstehend' },
  credited: { bg: 'rgba(38,140,251,0.1)',  border: 'rgba(38,140,251,0.3)',  text: '#268CFB',  label: 'Gutschrift' },
  refunded: { bg: 'rgba(104,223,158,0.1)', border: 'rgba(104,223,158,0.3)', text: '#68DF9E',  label: 'Erstattet'  },
}

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n ?? 0))
}

function pct(used, budget) {
  if (!budget) return 0
  return Math.min(100, Math.round((used / budget) * 100))
}

export default function Prueffaelle() {
  const [cases,     setCases]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('pending')
  const [acting,    setActing]    = useState(null)
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

  const visible = cases.filter(c => filter === 'all' || c.refund_status === filter)
  const pendingCount = cases.filter(c => c.refund_status === 'pending').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
          Kampagnen mit 0 oder weniger als 10% Einblendungen – Rückerstattung oder Gutschrift ausstellen.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {[
          { value: 'pending',  label: 'Ausstehend' },
          { value: 'refunded', label: 'Erstattet'  },
          { value: 'credited', label: 'Gutschrift'  },
          { value: 'all',      label: 'Alle'        },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={filter === f.value
              ? { background: 'linear-gradient(90deg, rgba(226,40,128,0.2), rgba(38,140,251,0.2))', border: '1px solid rgba(226,40,128,0.35)', color: '#E22880' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#A1A1AA' }
            }
          >
            {f.label}
          </button>
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
          {[1,2,3].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse"
                 style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm">Keine offenen Prüffälle.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map(c => {
            const deliveryPct  = pct(c.impressions_used, c.budget_impressions)
            const isZero       = c.impressions_used === 0
            const st           = STATUS_COLOR[c.refund_status] ?? STATUS_COLOR.pending
            const isActing     = acting === c.campaign_id

            return (
              <div key={c.campaign_id}
                   className="flex flex-col gap-3 p-5 rounded-2xl"
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
                      {isZero && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                          0 Einblendungen
                        </span>
                      )}
                      {!isZero && deliveryPct < 10 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}>
                          {deliveryPct}% erreicht
                        </span>
                      )}
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

                {/* Impression progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">
                      {fmt(c.impressions_used)} / {fmt(c.budget_impressions)} Einblendungen
                    </span>
                    <span style={{ color: deliveryPct < 10 ? '#F59E0B' : '#68DF9E' }}>
                      {deliveryPct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden"
                       style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all"
                         style={{
                           width: `${deliveryPct}%`,
                           background: deliveryPct < 10
                             ? 'linear-gradient(90deg, #EF4444, #F59E0B)'
                             : 'linear-gradient(90deg, #E22880, #268CFB)',
                         }} />
                  </div>
                </div>

                {/* Laufzeit */}
                <div className="flex gap-4 text-xs text-gray-500">
                  {c.starts_at && (
                    <span>Start: {new Date(c.starts_at).toLocaleDateString('de-DE')}</span>
                  )}
                  {c.ends_at && (
                    <span>Ende: {new Date(c.ends_at).toLocaleDateString('de-DE')}</span>
                  )}
                  {c.stripe_session_id && (
                    <span className="text-gray-600">Stripe ✓</span>
                  )}
                </div>

                {/* Actions */}
                {c.refund_status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleAction(c.campaign_id, 'refunded')}
                      disabled={isActing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(104,223,158,0.08)', border: '1px solid rgba(104,223,158,0.25)', color: '#68DF9E' }}>
                      {isActing
                        ? <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block" />
                        : '↩ Stripe zurückzahlen'
                      }
                    </button>
                    <button
                      onClick={() => handleAction(c.campaign_id, 'credited')}
                      disabled={isActing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: 'rgba(38,140,251,0.08)', border: '1px solid rgba(38,140,251,0.25)', color: '#268CFB' }}>
                      🎁 Gutschrift ausstellen
                    </button>
                  </div>
                )}

                {c.refund_status !== 'pending' && (
                  <p className="text-xs font-semibold" style={{ color: st.text }}>
                    ✓ {st.label} wurde ausgestellt
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
