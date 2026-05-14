const CONFIG = {
  fehler:                { label: 'Technischer Fehler',  bg: 'rgba(113,113,122,0.15)', border: 'rgba(113,113,122,0.3)', text: '#a1a1aa' },
  gewaltandrohung:       { label: 'Gewaltandrohung',     bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#fca5a5' },
  sexuelle_belaestigung: { label: 'Sexuelle Belästigung', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#d8b4fe' },
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
