import { useState, type ReactNode } from 'react'

/**
 * Before/after comparison. `before` is revealed from the left up to the
 * divider; `after` fills the rest. Both should be the same size. Drag anywhere,
 * or use the arrow keys.
 */
export function CompareSlider({ before, after, label = 'Compare before and after' }: { before: ReactNode; after: ReactNode; label?: string }) {
  const [split, setSplit] = useState(50)
  return (
    <div className="relative inline-block max-w-full overflow-hidden rounded-xl border border-border select-none">
      <div className="checkerboard">{after}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>{before}</div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary" style={{ left: `${split}%` }}>
        <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-ink shadow">
          ↔
        </span>
      </div>
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">Before</span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
