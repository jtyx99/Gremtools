import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { CompareSlider } from '../../../../shared/CompareSlider'
import { Dropzone } from '../../../../shared/Dropzone'
import { Icon, type IconName } from '../../../../shared/Icon'
import { download } from '../../../../shared/files'
import { brushWidth, fitWithin, outputName, type BackgroundKind } from '../../lib/compose'
import { eraseRegion } from '../../lib/flatBackground'
import { canvasBlob, isFilled, makeCanvas, makeThumb, paintResult, type BgSettings, type Item } from './canvas'

type Tool = 'compare' | 'background' | 'erase' | 'restore' | 'wand'

const TOOLS: { id: Tool; label: string; icon: IconName }[] = [
  { id: 'compare', label: 'Compare', icon: 'compare' },
  { id: 'background', label: 'Background', icon: 'image' },
  { id: 'erase', label: 'Erase', icon: 'eraser' },
  { id: 'restore', label: 'Restore', icon: 'brush' },
  { id: 'wand', label: 'Magic eraser', icon: 'wand' },
]
const KINDS: { value: BackgroundKind; label: string }[] = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'colour', label: 'Colour' },
  { value: 'blur', label: 'Blurred' },
  { value: 'image', label: 'Image' },
]
const SWATCHES = ['#ffffff', '#000000', '#b4f03a', '#a78bfa', '#38bdf8', '#f87171', '#fbbf24']
const PREVIEW_MAX = 1000
const HISTORY_LIMIT = 12

interface Props {
  item: Item
  /** True when this picture is one of several; shows "Done" to go back to the list. */
  multi: boolean
  /** Save the edits and leave the editor (batch mode). */
  onDone: (patch: Partial<Item>) => void
  onStartOver: () => void
}

/**
 * Toolbar editor for one cut-out. The cut-out lives in a full-size canvas
 * (`cutout`); the brush and magic eraser edit that canvas directly, and the
 * preview is redrawn from it. Restoring paints pixels of the original back in.
 */
export function Editor({ item, multi, onDone, onStartOver }: Props) {
  const { width, height } = item
  const preview = fitWithin(width, height, PREVIEW_MAX)
  const view = useRef<HTMLCanvasElement>(null)
  const original = useRef<ImageBitmap | null>(null)
  const cutout = useRef<HTMLCanvasElement | null>(null)
  const initial = useRef<HTMLCanvasElement | null>(null)
  const undo = useRef<HTMLCanvasElement[]>([])
  const redo = useRef<HTMLCanvasElement[]>([])
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const frame = useRef(0)

  const [ready, setReady] = useState(false)
  const [originalUrl, setOriginalUrl] = useState('')
  const [tool, setTool] = useState<Tool>('compare')
  const [bg, setBg] = useState<BgSettings>(item.bg)
  const [bgImage, setBgImage] = useState<ImageBitmap | null>(null)
  const [brush, setBrush] = useState(12)
  const [tolerance, setTolerance] = useState(28)
  const [cursor, setCursor] = useState<{ x: number; y: number; size: number } | null>(null)
  const [, setHistoryTick] = useState(0)

  // Decode the original and the cut-out once.
  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(item.file)
    setOriginalUrl(url)
    ;(async () => {
      const [orig, cut, bgImg] = await Promise.all([
        createImageBitmap(item.file),
        createImageBitmap(item.cutout!),
        item.bg.kind === 'image' && item.bg.image ? createImageBitmap(item.bg.image) : null,
      ])
      if (cancelled) return
      original.current = orig
      cutout.current = makeCanvas(width, height)
      cutout.current.getContext('2d', { willReadFrequently: true })!.drawImage(cut, 0, 0, width, height)
      initial.current = copyOf(cutout.current)
      cut.close()
      setBgImage(bgImg)
      setReady(true)
    })()
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
      original.current?.close()
    }
    // The editor is remounted (keyed) per item, so this runs once per picture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const redraw = useCallback(() => {
    const ctx = view.current?.getContext('2d')
    if (!ctx || !original.current || !cutout.current) return
    if (tool === 'restore') {
      // Show the removed parts faintly so the user can see what there is to bring back.
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, preview.width, preview.height)
      ctx.globalAlpha = 0.35
      ctx.drawImage(original.current, 0, 0, preview.width, preview.height)
      ctx.globalAlpha = 1
      ctx.drawImage(cutout.current, 0, 0, preview.width, preview.height)
    } else {
      paintResult(ctx, preview.width, preview.height, original.current, cutout.current, bg, bgImage)
    }
  }, [tool, bg, bgImage, preview.width, preview.height])

  useEffect(() => { if (ready) redraw() }, [ready, redraw])

  // ----- history -----
  function copyOf(source: HTMLCanvasElement) {
    const c = makeCanvas(source.width, source.height)
    c.getContext('2d')!.drawImage(source, 0, 0)
    return c
  }
  const remember = () => {
    undo.current.push(copyOf(cutout.current!))
    if (undo.current.length > HISTORY_LIMIT) undo.current.shift()
    redo.current = []
    setHistoryTick((t) => t + 1)
  }
  const show = (state: HTMLCanvasElement) => {
    const ctx = cutout.current!.getContext('2d')!
    ctx.globalCompositeOperation = 'copy'
    ctx.drawImage(state, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    redraw()
    setHistoryTick((t) => t + 1)
  }
  const step = (from: HTMLCanvasElement[], to: HTMLCanvasElement[]) => {
    const state = from.pop()
    if (!state) return
    to.push(copyOf(cutout.current!))
    show(state)
  }
  const resetEdits = () => {
    remember()
    show(initial.current!)
  }

  // ----- brush and magic eraser -----
  const toPicture = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
      cssX: e.clientX - rect.left,
      cssY: e.clientY - rect.top,
      scale: rect.width / width,
    }
  }
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = cutout.current!.getContext('2d')!
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brushWidth(brush, width, height)
    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000'
    } else {
      // Paint with the original picture as the "ink", so its pixels come back in place.
      ctx.globalCompositeOperation = 'source-over'
      const pattern = ctx.createPattern(original.current!, 'no-repeat')!
      pattern.setTransform(new DOMMatrix().scale(width / original.current!.width, height / original.current!.height))
      ctx.strokeStyle = pattern
    }
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x + 0.01, to.y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(redraw)
  }
  const magicErase = (x: number, y: number) => {
    const ctx = cutout.current!.getContext('2d')!
    const data = ctx.getImageData(0, 0, width, height)
    const p = Math.floor(y) * width + Math.floor(x)
    if (data.data[p * 4 + 3] < 10) return
    remember()
    eraseRegion(data.data, width, height, [p], [data.data[p * 4], data.data[p * 4 + 1], data.data[p * 4 + 2]], tolerance)
    ctx.putImageData(data, 0, 0)
    redraw()
  }

  const brushing = tool === 'erase' || tool === 'restore'
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return
    const pt = toPicture(e)
    if (tool === 'wand') return magicErase(pt.x, pt.y)
    if (!brushing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    remember()
    drawing.current = pt
    stroke(pt, pt)
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!brushing) return
    const pt = toPicture(e)
    setCursor({ x: pt.cssX, y: pt.cssY, size: brushWidth(brush, width, height) * pt.scale })
    if (drawing.current) {
      stroke(drawing.current, pt)
      drawing.current = pt
    }
  }
  const onUp = () => { drawing.current = null }

  // ----- output -----
  const save = async (ext: 'png' | 'jpg') => {
    const out = makeCanvas(width, height)
    paintResult(out.getContext('2d')!, width, height, original.current!, cutout.current!, bg, bgImage)
    download({ name: outputName(item.file.name, ext), blob: await canvasBlob(out, ext) })
  }
  const done = async () => {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl)
    onDone({
      cutout: await canvasBlob(cutout.current!, 'png'),
      bg,
      thumbUrl: await makeThumb(original.current!, cutout.current!, width, height, bg, bgImage),
    })
  }

  return (
    <div data-testid="result">
      <div className="card mb-3 flex flex-wrap items-center gap-2 p-2" role="toolbar" aria-label="Editing tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`btn ${tool === t.id ? 'border-primary! bg-surface-2' : 'border-transparent'}`}
            aria-pressed={tool === t.id}
            onClick={() => { setTool(t.id); setCursor(null) }}
          >
            <Icon name={t.icon} size={18} /> {t.label}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <button className="btn border-transparent px-2" aria-label="Undo" disabled={!undo.current.length} onClick={() => step(undo.current, redo.current)}>
          <Icon name="undo" size={18} />
        </button>
        <button className="btn border-transparent px-2" aria-label="Redo" disabled={!redo.current.length} onClick={() => step(redo.current, undo.current)}>
          <Icon name="redo" size={18} />
        </button>
        <button className="btn border-transparent" disabled={!undo.current.length} onClick={resetEdits}>Reset edits</button>
        <span className="ml-auto flex flex-wrap gap-2">
          {isFilled(bg) && (
            <button className="btn" data-testid="download-jpg" disabled={!ready} onClick={() => save('jpg')}>JPG</button>
          )}
          <button className="btn btn-primary" data-testid="download-png" disabled={!ready} onClick={() => save('png')}>
            <Icon name="download" size={18} /> Download PNG
          </button>
          {multi && <button className="btn" data-testid="editor-done" disabled={!ready} onClick={done}>Done</button>}
        </span>
      </div>

      <div className="card mb-4 flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        {tool === 'compare' && <p className="text-muted">Drag across the picture to compare it with the original.</p>}
        {tool === 'background' && (
          <>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Background">
              {KINDS.map((k) => (
                <label key={k.value} className={`btn ${bg.kind === k.value ? 'border-primary! bg-surface-2' : ''}`}>
                  <input type="radio" name="bg-kind" className="sr-only" checked={bg.kind === k.value} onChange={() => setBg({ ...bg, kind: k.value })} />
                  {k.label}
                </label>
              ))}
            </div>
            {bg.kind === 'colour' && (
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    aria-label={`Use ${c}`}
                    onClick={() => setBg({ ...bg, colour: c })}
                    className={`h-8 w-8 rounded-full border-2 ${bg.colour === c ? 'border-accent' : 'border-border'}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" aria-label="Pick another colour" value={bg.colour} onChange={(e) => setBg({ ...bg, colour: e.target.value })} className="h-8 w-10 rounded border border-border bg-bg" />
              </div>
            )}
            {bg.kind === 'image' && (
              <div className="min-w-56">
                <Dropzone
                  accept="image/*"
                  noun="a background image"
                  compact
                  onFiles={async (f) => {
                    try {
                      const bitmap = await createImageBitmap(f[0])
                      bgImage?.close()
                      setBgImage(bitmap)
                      setBg({ ...bg, kind: 'image', image: f[0] })
                    } catch { /* unreadable image: keep the current background */ }
                  }}
                />
              </div>
            )}
          </>
        )}
        {brushing && (
          <>
            <label className="flex items-center gap-2" htmlFor="brush-size">
              Brush size
              <input id="brush-size" type="range" min={1} max={100} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
            </label>
            <p className="text-muted">
              {tool === 'erase' ? 'Paint over anything that should not be there.' : 'Paint over faded areas to bring them back.'}
            </p>
          </>
        )}
        {tool === 'wand' && (
          <>
            <label className="flex items-center gap-2" htmlFor="wand-tolerance">
              Colour range
              <input id="wand-tolerance" type="range" min={4} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
            </label>
            <p className="text-muted">Click an area to remove everything of that colour connected to it.</p>
          </>
        )}
      </div>

      <div className="text-center">
        <CompareSlider
          enabled={tool === 'compare'}
          before={originalUrl ? <img src={originalUrl} alt="Original" className="block h-full w-full" draggable={false} /> : null}
          after={
            <>
              <canvas
                ref={view}
                width={preview.width}
                height={preview.height}
                data-testid="editor-canvas"
                className="block h-auto max-w-full"
                style={{ touchAction: brushing ? 'none' : undefined, cursor: brushing ? 'none' : tool === 'wand' ? 'crosshair' : undefined }}
                aria-label="Result with the background removed"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={() => setCursor(null)}
              />
              {brushing && cursor && (
                <div
                  className="pointer-events-none absolute rounded-full border-2 border-white mix-blend-difference"
                  style={{ left: cursor.x - cursor.size / 2, top: cursor.y - cursor.size / 2, width: cursor.size, height: cursor.size }}
                />
              )}
            </>
          }
        />
        <p className="hint">
          {width} × {height} px · {item.method === 'graphic' ? 'Removed as a flat-colour graphic' : 'Removed with the photo model'} · full resolution, nothing uploaded.
        </p>
        <button className="btn mt-3" onClick={onStartOver}>Start over</button>
      </div>
    </div>
  )
}
