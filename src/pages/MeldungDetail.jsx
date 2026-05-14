import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate }       from 'react-router-dom'
import { supabase }                     from '../lib/supabase'
import StatusBadge                      from '../components/StatusBadge'
import TypBadge                         from '../components/TypBadge'
import jsPDF                            from 'jspdf'
import autoTable                        from 'jspdf-autotable'

const fmt     = (d) => d ? new Date(d).toLocaleString('de-DE',  { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const ABSCHLUSS_LABELS = {
  hat_sich_geklaert:    'Hat sich geklärt',
  fehlalarm:            'Fehlalarm',
  zur_anzeige_gebracht: 'Zur Anzeige gebracht',
}

function exportChatPdf(meldung, nachrichten) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.setTextColor(40)
  doc.text('Chat-Verlauf – Meldung', 14, 18)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`ID: ${meldung.id}`, 14, 26)
  doc.text(`Typ: ${meldung.typ}  |  Datum: ${fmt(meldung.created_at)}`, 14, 31)
  doc.text(`Melder: ${meldung.melder?.name ?? '—'}  |  Gemeldeter: ${meldung.gemeldeter?.name ?? meldung.gemeldeter_user_name ?? '—'}`, 14, 36)

  autoTable(doc, {
    startY: 42,
    head: [['Zeit', 'Von', 'Inhalt']],
    body: nachrichten.map(m => [
      fmt(m.sent_at),
      m.sender_is_melder ? 'Melder' : 'Gemeldeter',
      m.message_type === 'image' ? '📷 Bild' + (m.media_url ? ` (${m.media_url})` : '')
        : m.message_type === 'audio' ? '🎤 Sprachnachricht' + (m.media_url ? ` (${m.media_url})` : '')
        : (m.text ?? ''),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [22, 27, 34], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 25 } },
  })

  doc.save(`meldung-${meldung.id.slice(0, 8)}-chat.pdf`)
}

function AudioPlayer({ src }) {
  const audioRef = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 160 }}>
      <audio ref={audioRef} src={src}
        onTimeUpdate={e => setCurrent(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(90deg,#E22880,#268CFB)' }}>
        {playing ? <span className="text-white text-xs font-bold">‖</span> : <span className="text-white text-xs ml-0.5">▶</span>}
      </button>
      <div className="flex gap-0.5 items-end h-4 flex-1">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${30 + Math.sin(i * 1.3) * 55}%`, background: 'rgba(255,255,255,0.3)' }} />
        ))}
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">
        {Math.floor(current)}s{duration ? ` / ${Math.floor(duration)}s` : ''}
      </span>
    </div>
  )
}

function ChatMessage({ msg }) {
  const [lightbox, setLightbox] = useState(false)
  const isLeft = !msg.sender_is_melder
  return (
    <div className={`flex ${isLeft ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className="max-w-[70%]">
        {msg.message_type === 'text' && (
          <div className="px-3 py-2 rounded-2xl text-sm text-white"
            style={isLeft
              ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }
              : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }
            }>{msg.text}</div>
        )}
        {msg.message_type === 'image' && msg.media_url && (
          <>
            <img src={msg.media_url} alt="Bild" className="rounded-2xl cursor-pointer object-cover"
              style={{ maxHeight: 200, maxWidth: 240 }} onClick={() => setLightbox(true)} />
            {lightbox && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightbox(false)}>
                <img src={msg.media_url} alt="Bild" className="max-h-[90vh] max-w-[90vw] rounded-xl" />
              </div>
            )}
          </>
        )}
        {msg.message_type === 'audio' && msg.media_url && <AudioPlayer src={msg.media_url} />}
        <p className="text-xs text-gray-600 mt-0.5 px-1">{fmt(msg.sent_at)}</p>
      </div>
    </div>
  )
}

function ServiceChatPanel({ chat, meldungId, session }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [closing,     setClosing]     = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase
      .from('service_messages')
      .select('id, sender_id, sender_role, text, created_at')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []), (err) => console.error('[ServiceChat] Laden:', err))

    const channel = supabase
      .channel(`service_chat_${chat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chat.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const { error } = await supabase.from('service_messages').insert({
      chat_id:     chat.id,
      sender_id:   session?.user?.id,
      sender_role: 'admin',
      text,
    })
    setSending(false)
    if (error) console.error('[ServiceChat] Senden:', error)
  }

  const closeChat = async () => {
    setClosing(true)
    const { error } = await supabase
      .from('service_chats')
      .update({ is_active: false, closed_at: new Date().toISOString() })
      .eq('id', chat.id)
    setClosing(false)
    if (error) console.error('[ServiceChat] Schließen:', error)
  }

  const reactivateChat = async () => {
    setReactivating(true)
    const { error } = await supabase
      .from('service_chats')
      .update({ is_active: true, closed_at: null })
      .eq('id', chat.id)
    setReactivating(false)
    if (error) console.error('[ServiceChat] Reaktivieren:', error)
  }

  const label = chat.participant_role === 'melder' ? 'Melder' : 'Gemeldeter'

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', height: 380 }}>
      <div className="px-4 py-3 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <p className="text-xs font-semibold text-white">Service-Chat mit {label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{chat.is_active ? '🟢 Aktiv' : '🔴 Geschlossen'}</p>
        </div>
        {chat.is_active && (
          <button onClick={closeChat} disabled={closing}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            {closing ? '…' : 'Chat schließen'}
          </button>
        )}
        {!chat.is_active && (
          <button onClick={reactivateChat} disabled={reactivating}
            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
            {reactivating ? '…' : 'Reaktivieren'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.length === 0 && <p className="text-xs text-gray-500 text-center mt-8">Noch keine Nachrichten.</p>}
        {messages.map(m => {
          const isAdmin = m.sender_role === 'admin'
          return (
            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                <div className="px-3 py-2 rounded-2xl text-sm text-white"
                  style={isAdmin
                    ? { background: 'linear-gradient(90deg, rgba(226,40,128,0.25), rgba(38,140,251,0.25))', border: '1px solid rgba(226,40,128,0.3)' }
                    : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }
                  }>{m.text}</div>
                <p className="text-xs text-gray-600 mt-0.5 px-1">{fmt(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {chat.is_active && (
        <div className="px-3 py-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Nachricht schreiben…"
            className="flex-1 px-3 py-2 rounded-xl text-sm text-white bg-transparent outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(90deg, #E22880, #268CFB)' }}>
            ➤
          </button>
        </div>
      )}
    </div>
  )
}

export default function MeldungDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [meldung,      setMeldung]      = useState(null)
  const [adminInfo,    setAdminInfo]    = useState(null)
  const [nachrichten,  setNachrichten]  = useState([])
  const [serviceChats, setServiceChats] = useState([])
  const [session,      setSession]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [suspending,   setSuspending]   = useState(false)
  const [isSuspended,  setIsSuspended]  = useState(false)
  const [openingChat,  setOpeningChat]  = useState(null)

  const [status,        setStatus]        = useState('neu')
  const [adminNotizen,  setAdminNotizen]  = useState('')
  const [abschlussgrund, setAbschlussgrund] = useState('')
  const [showChat,      setShowChat]      = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session), () => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      const [meldRes, nachRes, chatRes] = await Promise.all([
        supabase
          .from('meldungen')
          .select(`
            id, typ, status, beschreibung, created_at, updated_at,
            admin_notizen, gemeldeter_user_name, abschlussgrund,
            gemeldeter_last_login, gemeldeter_ip,
            melder:user_id(id, name),
            gemeldeter:gemeldeter_user_id(id, name)
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('meldung_nachrichten')
          .select('id, sender_is_melder, text, message_type, media_url, sent_at')
          .eq('meldung_id', id)
          .order('sent_at', { ascending: true }),
        supabase
          .from('service_chats')
          .select('id, participant_id, participant_role, is_active, created_at, closed_at')
          .eq('meldung_id', id)
          .order('created_at', { ascending: true }),
      ])

      if (cancelled) return
      if (meldRes.error) { setError(meldRes.error.message); setLoading(false); return }

      const m = meldRes.data
      setMeldung(m)
      setStatus(m.status)
      setAdminNotizen(m.admin_notizen ?? '')
      setAbschlussgrund(m.abschlussgrund ?? '')
      setNachrichten(nachRes.data ?? [])
      setServiceChats(chatRes.data ?? [])

      const gemelderId = m.gemeldeter?.id
      if (gemelderId) {
        const { data: info } = await supabase.rpc('get_user_admin_info', { p_user_id: gemelderId })
        if (!cancelled && info && info.length > 0) {
          setAdminInfo(info[0])
          setIsSuspended(info[0].is_suspended)
        }
      }

      setLoading(false)
    }

    load().then(undefined, (err) => {
      if (!cancelled) { setError(err.message); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [id])

  // Realtime für service_chats (öffnen/schließen live)
  useEffect(() => {
    const channel = supabase
      .channel(`service_chats_meldung_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_chats', filter: `meldung_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setServiceChats(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setServiceChats(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleSave = async () => {
    if (status === 'erledigt' && !adminNotizen.trim()) {
      setError('Bitte fülle die internen Notizen aus, bevor du die Meldung als erledigt markierst.')
      return
    }
    if (status === 'erledigt' && !abschlussgrund) {
      setError('Bitte wähle einen Abschlussgrund aus.')
      return
    }
    setSaving(true); setSaved(false); setError(null)

    const updates = {
      status,
      admin_notizen: adminNotizen || null,
      abschlussgrund: status === 'erledigt' ? abschlussgrund : null,
    }
    if (status === 'erledigt' && meldung.status !== 'erledigt') {
      updates.erledigt_at = new Date().toISOString()
    }
    if (status === 'in_bearbeitung' && meldung.status !== 'in_bearbeitung') {
      updates.bearbeitung_started_at = new Date().toISOString()
    }

    const { error: saveErr } = await supabase.from('meldungen').update(updates).eq('id', id)

    setSaving(false)
    if (saveErr) { setError('Speichern fehlgeschlagen: ' + saveErr.message); return }

    setMeldung(prev => ({ ...prev, ...updates }))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSuspend = async () => {
    if (!meldung?.gemeldeter?.id) return
    setSuspending(true)
    const { error: suspErr } = await supabase.rpc('admin_suspend_user', {
      p_user_id: meldung.gemeldeter.id,
      p_suspend:  !isSuspended,
    })
    setSuspending(false)
    if (suspErr) { setError('Sperr-Aktion fehlgeschlagen: ' + suspErr.message); return }
    setIsSuspended(s => !s)
  }

  const openServiceChat = async (role) => {
    const userId = role === 'melder' ? meldung?.melder?.id : meldung?.gemeldeter?.id
    if (!userId || openingChat) return
    setOpeningChat(role)

    const { data: newChat, error } = await supabase
      .from('service_chats')
      .insert({
        meldung_id:       id,
        participant_id:   userId,
        participant_role: role,
      })
      .select('id, participant_id, participant_role, is_active, created_at, closed_at')
      .single()

    setOpeningChat(null)
    if (error) {
      console.error('[ServiceChat] Öffnen:', error)
      return
    }
    // Sofort in den State schreiben – kein Warten auf Realtime
    setServiceChats(prev => {
      if (prev.some(c => c.id === newChat.id)) return prev
      return [...prev, newChat]
    })
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Lade Meldung…</div>
  if (error && !meldung) return <div className="p-8 text-red-400 text-sm">Fehler: {error}</div>
  if (!meldung) return null

  const card = { background: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }

  const melderChat    = serviceChats.find(c => c.participant_role === 'melder')
  const gemeldeterChat = serviceChats.find(c => c.participant_role === 'gemeldeter')

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/meldungen')} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Zurück
        </button>
        <h2 className="text-xl font-bold text-white">Meldung</h2>
      </div>

      <div className="flex flex-col gap-5">

        {/* Meta */}
        <div className="p-5 rounded-2xl flex flex-wrap gap-4" style={card}>
          <div><p className="text-xs text-gray-500 mb-1">Typ</p><TypBadge typ={meldung.typ} /></div>
          <div><p className="text-xs text-gray-500 mb-1">Status</p><StatusBadge status={meldung.status} /></div>
          {meldung.abschlussgrund && (
            <div><p className="text-xs text-gray-500 mb-1">Abschluss</p>
              <span className="text-xs font-medium text-green-400">{ABSCHLUSS_LABELS[meldung.abschlussgrund]}</span>
            </div>
          )}
          <div><p className="text-xs text-gray-500 mb-1">Eingegangen</p><p className="text-sm text-gray-300">{fmt(meldung.created_at)}</p></div>
          <div><p className="text-xs text-gray-500 mb-1">Aktualisiert</p><p className="text-sm text-gray-300">{fmt(meldung.updated_at)}</p></div>
        </div>

        {/* Melder + Gemeldeter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl" style={card}>
            <p className="text-xs text-gray-500 mb-2">Melder</p>
            {meldung.melder ? (
              <><p className="text-sm font-semibold text-white">{meldung.melder.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 font-mono break-all">{meldung.melder.id}</p></>
            ) : <p className="text-sm text-gray-500">Account gelöscht</p>}
          </div>

          <div className="p-5 rounded-2xl flex flex-col gap-3" style={card}>
            <div>
              <p className="text-xs text-gray-500 mb-2">Gemeldeter User</p>
              {meldung.gemeldeter ? (
                <><p className="text-sm font-semibold text-white">{meldung.gemeldeter.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-mono break-all">{meldung.gemeldeter.id}</p></>
              ) : meldung.gemeldeter_user_name ? (
                <p className="text-sm text-gray-300">{meldung.gemeldeter_user_name}</p>
              ) : <p className="text-sm text-gray-500">—</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Letzter Login (Meldezeitpunkt)</p>
                <p className="text-gray-300 mt-0.5">{fmt(meldung.gemeldeter_last_login)}</p>
              </div>
              <div>
                <p className="text-gray-500">IP (Meldezeitpunkt)</p>
                <p className="text-gray-300 mt-0.5 font-mono">{meldung.gemeldeter_ip ?? '—'}</p>
              </div>
              {adminInfo && <>
                <div><p className="text-gray-500">Letzte Aktivität</p><p className="text-gray-300 mt-0.5">{fmt(adminInfo.last_seen_at)}</p></div>
                <div><p className="text-gray-500">Aktuelle IP</p><p className="text-gray-300 mt-0.5 font-mono">{adminInfo.last_known_ip ?? '—'}</p></div>
              </>}
            </div>

            {meldung.gemeldeter?.id && (
              <div className="flex items-center gap-3 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-xs font-medium" style={{ color: isSuspended ? '#f87171' : '#86efac' }}>
                  {isSuspended ? '🔴 Gesperrt' : '🟢 Aktiv'}
                </span>
                <button onClick={handleSuspend} disabled={suspending}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={isSuspended
                    ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }
                    : { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }
                  }>
                  {suspending ? '…' : isSuspended ? 'Sperre aufheben' : 'Benutzer sperren'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Beschreibung */}
        <div className="p-5 rounded-2xl" style={card}>
          <p className="text-xs text-gray-500 mb-2">Beschreibung des Nutzers</p>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{meldung.beschreibung}</p>
        </div>

        {/* Chat-Verlauf – Button */}
        <button onClick={() => setShowChat(true)}
          className="p-5 rounded-2xl text-left w-full flex items-center justify-between transition-all hover:brightness-110"
          style={card}>
          <div>
            <p className="text-sm font-semibold text-white">Chat-Verlauf anzeigen</p>
            <p className="text-xs text-gray-500 mt-0.5">{nachrichten.length} Nachrichten gespeichert</p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </button>

        {/* Chat-Verlauf – Modal */}
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowChat(false)}>
            <div className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
              style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 flex items-center justify-between border-b flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Chat-Verlauf <span className="ml-1 text-xs font-normal text-gray-500">({nachrichten.length} Nachrichten)</span>
                  </p>
                  {nachrichten.length > 0 && (
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'rgba(239,68,68,0.4)' }} />Gemeldeter</span>
                      <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'rgba(255,255,255,0.15)' }} />Melder</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {nachrichten.length > 0 && (
                    <button onClick={() => exportChatPdf(meldung, nachrichten)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      PDF ↓
                    </button>
                  )}
                  <button onClick={() => setShowChat(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)' }}>✕</button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {nachrichten.length === 0
                  ? <p className="text-sm text-gray-500">Kein Chat-Verlauf gespeichert.</p>
                  : nachrichten.map(m => <ChatMessage key={m.id} msg={m} />)
                }
              </div>
            </div>
          </div>
        )}

        {/* Service-Chats */}
        <div className="rounded-2xl overflow-hidden" style={card}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-white">Service-Chats</p>
            <p className="text-xs text-gray-500 mt-0.5">Direkter Kontakt mit den Parteien – erscheint bei ihnen als „Service 🛡️"</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {/* Melder-Chat */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400">Chat mit Melder{meldung.melder ? ` (${meldung.melder.name})` : ''}</p>
                {!melderChat && meldung.melder?.id && (
                  <button onClick={() => openServiceChat('melder')} disabled={!!openingChat}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-all"
                    style={{ background: 'linear-gradient(90deg, #E22880, #268CFB)' }}>
                    {openingChat === 'melder' ? '…' : 'Chat öffnen'}
                  </button>
                )}
              </div>
              {melderChat
                ? <ServiceChatPanel chat={melderChat} meldungId={id} session={session} />
                : <p className="text-xs text-gray-600 py-2">Noch kein Chat geöffnet.</p>
              }
            </div>

            {/* Gemeldeter-Chat */}
            {meldung.gemeldeter?.id && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400">Chat mit Gemeldeten ({meldung.gemeldeter.name})</p>
                  {!gemeldeterChat && (
                    <button onClick={() => openServiceChat('gemeldeter')} disabled={!!openingChat}
                      className="px-3 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(90deg, #E22880, #268CFB)' }}>
                      {openingChat === 'gemeldeter' ? '…' : 'Chat öffnen'}
                    </button>
                  )}
                </div>
                {gemeldeterChat
                  ? <ServiceChatPanel chat={gemeldeterChat} meldungId={id} session={session} />
                  : <p className="text-xs text-gray-600 py-2">Noch kein Chat geöffnet.</p>
                }
              </div>
            )}
          </div>
        </div>

        {/* Ticket bearbeiten */}
        <div className="p-5 rounded-2xl flex flex-col gap-4" style={card}>
          <p className="text-sm font-semibold text-white">Ticket bearbeiten</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors">
              <option value="neu">Neu</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
              <option value="erledigt">Erledigt</option>
            </select>
          </div>

          {status === 'erledigt' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Abschlussgrund <span className="text-red-400">*</span></label>
              <select value={abschlussgrund} onChange={e => setAbschlussgrund(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors">
                <option value="">— bitte wählen —</option>
                <option value="hat_sich_geklaert">Hat sich geklärt</option>
                <option value="fehlalarm">Fehlalarm</option>
                <option value="zur_anzeige_gebracht">Zur Anzeige gebracht</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Interne Notizen {status === 'erledigt' && <span className="text-red-400">*</span>}</label>
            <textarea value={adminNotizen} onChange={e => setAdminNotizen(e.target.value)}
              rows={4} placeholder="Interne Notizen (nur für Admins sichtbar)…"
              className="px-4 py-3 rounded-xl text-sm text-white bg-navy border border-white/10 outline-none focus:border-white/30 transition-colors resize-none" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(90deg, #E22880 0%, #268CFB 100%)' }}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
            {saved && <span className="text-sm text-green-400">Gespeichert ✓</span>}
          </div>
        </div>

      </div>
    </div>
  )
}
