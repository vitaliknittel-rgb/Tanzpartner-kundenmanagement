const CONFIG = {
  fehler:                { label: 'Technischer Fehler',    bg: 'rgba(113,113,122,0.15)', border: 'rgba(113,113,122,0.3)', text: '#a1a1aa' },
  gewaltandrohung:       { label: 'Gewaltandrohung',       bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#fca5a5' },
  sexuelle_belaestigung: { label: 'Sexuelle Belästigung',  bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#d8b4fe' },
  stalking:              { label: 'Stalking',               bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)',  text: '#fde047' },
  betrug:                { label: 'Betrug',                 bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', text: '#fdba74' },
  hassrede:              { label: 'Hassrede',               bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)', text: '#f87171' },
  spam:                  { label: 'Spam',                   bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.3)', text: '#5eead4' },
  fake_profil:           { label: 'Fake-Profil',            bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', text: '#93c5fd' },
  minderjaehrigenschutz: { label: 'Minderjährigenschutz',  bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)',  text: '#86efac' },
  sonstiges:             { label: 'Sonstiges',              bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: '#d1d5db' },
  feed_meldung:          { label: 'Feed-Meldung',           bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc' },
}

export default function TypBadge({ typ }) {
  const cfg = CONFIG[typ] ?? { label: typ, bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: '#a1a1aa' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}
