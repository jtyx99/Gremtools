import { useEffect, useRef, useState } from 'react'
import { renderThumb, type PreviewDoc } from './pdfPreview'

/** One page thumbnail. Renders only once it scrolls into view. */
export function PageThumb({ doc, page, rotate = 0, width = 140 }: { doc: PreviewDoc; page: number; rotate?: number; width?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      renderThumb(doc, page, el, width).then(() => !cancelled && setReady(true), () => {})
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [doc, page, width])

  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg bg-surface-2">
      <canvas
        ref={canvas}
        className={`max-h-full max-w-full bg-white shadow transition-transform ${ready ? '' : 'opacity-0'}`}
        style={{ transform: `rotate(${rotate}deg) scale(${rotate % 180 ? 0.75 : 1})` }}
      />
    </div>
  )
}
