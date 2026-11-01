const GEMS = [
  // ruby — diamond cut
  { base: '#e11d48', light: '#fb7185', dark: '#9f1239', shape: 'diamond' },
  // sapphire — round
  { base: '#2563eb', light: '#7cb0ff', dark: '#1e3a8a', shape: 'round' },
  // emerald — octagon step cut
  { base: '#059669', light: '#6ee7b7', dark: '#064e3b', shape: 'octagon' },
  // topaz — hexagon
  { base: '#f59e0b', light: '#fde68a', dark: '#b45309', shape: 'hexagon' },
  // amethyst — kite
  { base: '#9333ea', light: '#d8a8ff', dark: '#581c87', shape: 'kite' },
  // diamond — triangle-ish shield
  { base: '#67e8f9', light: '#ecfeff', dark: '#0e7490', shape: 'shield' },
]

const OUTLINE = {
  diamond: '50,6 90,38 50,94 10,38',
  hexagon: '26,10 74,10 94,50 74,90 26,90 6,50',
  octagon: '30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30',
  kite: '50,5 88,40 66,94 34,94 12,40',
  shield: '12,14 88,14 94,40 50,95 6,40',
}

export default function Gem({ type, special }) {
  const g = GEMS[type]
  const id = `g${type}`
  const outline = OUTLINE[g.shape]
  const facet = g.shape === 'round' ? null : outline
  return (
    <svg viewBox="0 0 100 100" className="gem-svg" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={g.light} />
          <stop offset="0.5" stopColor={g.base} />
          <stop offset="1" stopColor={g.dark} />
        </linearGradient>
      </defs>
      {g.shape === 'round' ? (
        <>
          <circle cx="50" cy="50" r="42" fill={`url(#${id})`} stroke={g.dark} strokeWidth="3" />
          <circle cx="50" cy="50" r="26" fill="none" stroke={g.light} strokeOpacity="0.55" strokeWidth="3" />
          <circle cx="50" cy="50" r="12" fill={g.light} fillOpacity="0.35" />
        </>
      ) : (
        <>
          <polygon points={facet} fill={`url(#${id})`} stroke={g.dark} strokeWidth="3" strokeLinejoin="round" />
          <polygon points="50,22 70,50 50,78 30,50" fill={g.light} fillOpacity="0.3" stroke={g.light} strokeOpacity="0.6" strokeWidth="2" />
        </>
      )}
      <ellipse cx="34" cy="28" rx="11" ry="6" fill="#fff" fillOpacity="0.75" transform="rotate(-35 34 28)" />
      {special === 'blast' && (
        <g className="gem-special">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="10 8" />
          <path d="M50 30 L56 46 L72 50 L56 54 L50 70 L44 54 L28 50 L44 46 Z" fill="#fff" />
        </g>
      )}
      {special === 'rainbow' && (
        <g className="gem-special">
          <circle cx="50" cy="50" r="40" fill="#1b1038" />
          {['#ff4d6d', '#ffb703', '#4ade80', '#38bdf8', '#a855f7'].map((c, i) => (
            <circle key={c} cx="50" cy="50" r={34 - i * 6} fill="none" stroke={c} strokeWidth="5" />
          ))}
          <circle cx="50" cy="50" r="5" fill="#fff" />
        </g>
      )}
    </svg>
  )
}
