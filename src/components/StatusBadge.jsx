const CONFIG = {
  neu:           { label: 'Neu',            bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  text: '#93c5fd' },
  in_bearbeitung: { label: 'In Bearbeitung', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)', text: '#fdba74' },
  erledigt:      { label: 'Erledigt',        bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)',  text: '#86efac' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: '#a1a1aa' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
    >
      {cfg.label}
    </span>
  )
}
