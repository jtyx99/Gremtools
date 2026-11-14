/**
 * Ling, the Gremtools gremling. A placeholder illustration drawn in code;
 * see docs/BRAND.md for the character rules a final illustration should follow.
 */
export type LingPose = 'idle' | 'working' | 'happy' | 'oops'

const SKIN = '#9bd84a'
const SKIN_DARK = '#6fae2b'
const INK = '#1d2a0c'
const LENS = '#a78bfa'

export function Mascot({ pose = 'idle', size = 120, className }: { pose?: LingPose; size?: number; className?: string }) {
  const stroke = { stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`Ling the gremling, ${pose === 'oops' ? 'looking sheepish' : pose}`}
    >
      <g className={pose === 'idle' ? 'ling-bob' : undefined}>
        {/* body */}
        <path d="M72 150c0-16 12-24 28-24s28 8 28 24v22c0 6-4 10-10 10H82c-6 0-10-4-10-10z" fill={SKIN} {...stroke} />
        <path d="M86 182v8M114 182v8" {...stroke} fill="none" />
        {/* left arm */}
        <path d={pose === 'happy' ? 'M74 146c-12-4-18-14-20-26' : 'M74 148c-10 2-16 8-18 16'} fill="none" {...stroke} strokeWidth={9} stroke={INK} />
        <path d={pose === 'happy' ? 'M74 146c-12-4-18-14-20-26' : 'M74 148c-10 2-16 8-18 16'} fill="none" stroke={SKIN} strokeWidth={4} strokeLinecap="round" />
        {/* right arm with wrench */}
        <g className={pose === 'working' ? 'ling-tinker' : undefined}>
          <path d="M126 148c12-2 20-10 24-20" fill="none" {...stroke} strokeWidth={9} />
          <path d="M126 148c12-2 20-10 24-20" fill="none" stroke={SKIN} strokeWidth={4} strokeLinecap="round" />
          <g transform="rotate(28 152 122)">
            <rect x="147" y="92" width="10" height="40" rx="4" fill="#c9ced8" {...stroke} strokeWidth={4} />
            <path d="M140 84a12 12 0 0 1 24 0l-6 2v8h-12v-8z" fill="#c9ced8" {...stroke} strokeWidth={4} />
          </g>
        </g>
        {/* ears */}
        <path d="M52 92C30 86 14 70 8 50c20 2 30 6 38 12l6-4c6 6 10 14 12 22z" fill={SKIN} {...stroke} />
        <path d="M148 92c22-6 38-22 44-42-20 2-30 6-38 12l-6-4c-6 6-10 14-12 22z" fill={SKIN} {...stroke} />
        <path d="M26 60c8 4 16 10 22 18M174 60c-8 4-16 10-22 18" fill="none" stroke={SKIN_DARK} strokeWidth={4} strokeLinecap="round" />
        {/* head */}
        <path d="M100 30c34 0 54 20 54 50 0 32-22 52-54 52s-54-20-54-52c0-30 20-50 54-50z" fill={SKIN} {...stroke} />
        {/* goggles pushed up */}
        <path d="M52 58c14-18 82-18 96 0" fill="none" {...stroke} strokeWidth={7} />
        <circle cx="80" cy="46" r="15" fill={LENS} {...stroke} />
        <circle cx="120" cy="46" r="15" fill={LENS} {...stroke} />
        <path d="M73 41c3-4 7-5 11-4M113 41c3-4 7-5 11-4" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity=".8" />
        {/* eyes */}
        {pose === 'happy' ? (
          <path d="M68 90c6-10 16-10 22 0M110 90c6-10 16-10 22 0" fill="none" {...stroke} />
        ) : (
          <>
            <ellipse cx="79" cy="88" rx="12" ry={pose === 'working' ? 9 : 13} fill="#fff" {...stroke} strokeWidth={4} />
            <ellipse cx="121" cy="88" rx="12" ry={pose === 'working' ? 9 : 13} fill="#fff" {...stroke} strokeWidth={4} />
            <circle cx={pose === 'working' ? 84 : 81} cy={pose === 'oops' ? 91 : 89} r="5.5" fill={INK} />
            <circle cx={pose === 'working' ? 126 : 123} cy={pose === 'oops' ? 91 : 89} r="5.5" fill={INK} />
            {pose === 'oops' && <path d="M66 72l18 5M134 72l-18 5" fill="none" {...stroke} strokeWidth={4} />}
          </>
        )}
        {/* mouth */}
        {pose === 'oops' ? (
          <path d="M84 116c6-6 26-6 32 0" fill="none" {...stroke} />
        ) : (
          <>
            <path d={pose === 'happy' ? 'M76 106c8 18 40 18 48 0z' : 'M80 108c8 12 32 12 40 0z'} fill="#3a1420" {...stroke} strokeWidth={4} />
            <path d="M88 109l5 9 5-8z" fill="#fff" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
          </>
        )}
        {/* cheeks */}
        <ellipse cx="62" cy="104" rx="7" ry="4" fill="#ff9e8a" opacity=".55" />
        <ellipse cx="138" cy="104" rx="7" ry="4" fill="#ff9e8a" opacity=".55" />
        {pose === 'oops' && (
          <>
            <path d="M150 62c4 6 6 10 6 14a6 6 0 0 1-12 0c0-4 2-8 6-14z" fill="#8fd3ff" stroke={INK} strokeWidth={3} />
            <path d="M172 118l8-6-3 9 9 0-8 6M20 124l6 6-9 1 6 7" fill="none" stroke="#ffb347" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {pose === 'happy' && (
          <path d="M34 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM170 110l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffd84a" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        )}
      </g>
    </svg>
  )
}

/** Head-only mark used in the header and as the app icon. */
export function LingMark({ size = 32 }: { size?: number }) {
  const stroke = { stroke: INK, strokeWidth: 7, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 20 200 120" aria-hidden="true">
      <path d="M52 92C30 86 14 70 8 50c20 2 30 6 38 12l6-4c6 6 10 14 12 22z" fill={SKIN} {...stroke} />
      <path d="M148 92c22-6 38-22 44-42-20 2-30 6-38 12l-6-4c-6 6-10 14-12 22z" fill={SKIN} {...stroke} />
      <path d="M100 30c34 0 54 20 54 50 0 32-22 52-54 52s-54-20-54-52c0-30 20-50 54-50z" fill={SKIN} {...stroke} />
      <ellipse cx="79" cy="82" rx="12" ry="13" fill="#fff" {...stroke} strokeWidth={5} />
      <ellipse cx="121" cy="82" rx="12" ry="13" fill="#fff" {...stroke} strokeWidth={5} />
      <circle cx="81" cy="83" r="6" fill={INK} />
      <circle cx="123" cy="83" r="6" fill={INK} />
      <path d="M80 104c8 12 32 12 40 0z" fill="#3a1420" {...stroke} strokeWidth={5} />
      <path d="M88 105l5 9 5-8z" fill="#fff" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  )
}
