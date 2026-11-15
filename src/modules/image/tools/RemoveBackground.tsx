import { useEffect, useRef, useState } from 'react'
import { CompareSlider } from '../../../shared/CompareSlider'
import { Dropzone } from '../../../shared/Dropzone'
import { Icon } from '../../../shared/Icon'
import { ChosenFile, ToolShell } from '../../../shared/ToolShell'
import { ToolError } from '../../../shared/errors'
import { download } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { removeBackgroundInWorker } from '../client'
import type { BgModel } from '../engines/backgroundRemoval'
import { MAX_OUTPUT_PIXELS, blurRadius, coverRect, fitArea, fitWithin, outputName, type BackgroundKind } from '../lib/compose'
import { imageTool } from '../meta'

const IMAGE_ACCEPT = 'image/*'
const PREVIEW_MAX = 900
const SWATCHES = ['#ffffff', '#000000', '#b4f03a', '#a78bfa', '#38bdf8', '#f87171', '#fbbf24']

interface Background {
  kind: BackgroundKind
  colour: string
  image: ImageBitmap | null
}

/** The original photo and its cut-out, both at output size. */
interface Result {
  original: ImageBitmap
  cutout: ImageBitmap
  originalUrl: string
  width: number
  height: number
}

/** Use the (small) cut-out's transparency as a mask over the full-size original. */
async function applyMask(original: ImageBitmap, mask: ImageBitmap, width: number, height: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(original, 0, 0, width, height)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(mask, 0, 0, width, height)
  return createImageBitmap(canvas)
}

/** Paint the chosen background, then the cut-out on top. Used for both the preview and the download. */
function drawComposite(ctx: CanvasRenderingContext2D, w: number, h: number, result: Result, bg: Background) {
  ctx.clearRect(0, 0, w, h)
  if (bg.kind === 'colour') {
    ctx.fillStyle = bg.colour
    ctx.fillRect(0, 0, w, h)
  } else if (bg.kind === 'blur') {
    const r = blurRadius(w, h)
    ctx.filter = `blur(${r}px)`
    // Drawn slightly oversized so the blur does not fade out at the edges.
    ctx.drawImage(result.original, -2 * r, -2 * r, w + 4 * r, h + 4 * r)
    ctx.filter = 'none'
  } else if (bg.kind === 'image' && bg.image) {
    const { sx, sy, sw, sh } = coverRect(bg.image.width, bg.image.height, w, h)
    ctx.drawImage(bg.image, sx, sy, sw, sh, 0, 0, w, h)
  }
  ctx.drawImage(result.cutout, 0, 0, w, h)
}

function Editor({ result, fileName, onReset }: { result: Result; fileName: string; onReset: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [bg, setBg] = useState<Background>({ kind: 'transparent', colour: '#ffffff', image: null })
  const preview = fitWithin(result.width, result.height, PREVIEW_MAX)

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (ctx) drawComposite(ctx, preview.width, preview.height, result, bg)
  }, [bg, result, preview.width, preview.height])

  const save = async (ext: 'png' | 'jpg') => {
    const out = document.createElement('canvas')
    out.width = result.width
    out.height = result.height
    drawComposite(out.getContext('2d')!, result.width, result.height, result, bg)
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, ext === 'png' ? 'image/png' : 'image/jpeg', 0.92))
    if (blob) download({ name: outputName(fileName, ext), blob })
  }

  const kinds: { value: BackgroundKind; label: string }[] = [
    { value: 'transparent', label: 'Transparent' },
    { value: 'colour', label: 'Colour' },
    { value: 'blur', label: 'Blurred' },
    { value: 'image', label: 'Image' },
  ]
  const filled = bg.kind !== 'transparent' && !(bg.kind === 'image' && !bg.image)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="result">
      <div className="min-w-0 text-center">
        <CompareSlider
          before={<img src={result.originalUrl} alt="Original" className="block h-full w-full" draggable={false} />}
          after={
            <canvas
              ref={canvas}
              width={preview.width}
              height={preview.height}
              className="block h-auto max-w-full"
              aria-label="Result with the background removed"
            />
          }
        />
        <p className="hint">Drag across the image to compare. {result.width} × {result.height} px.</p>
      </div>

      <div className="card h-fit p-5">
        <fieldset>
          <legend className="label">Background</legend>
          <div className="grid grid-cols-2 gap-2">
            {kinds.map((k) => (
              <label key={k.value} className={`btn ${bg.kind === k.value ? 'border-primary! bg-surface-2' : ''}`}>
                <input type="radio" name="bg-kind" className="sr-only" checked={bg.kind === k.value} onChange={() => setBg({ ...bg, kind: k.value })} />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        {bg.kind === 'colour' && (
          <div className="mt-4">
            <span className="label">Colour</span>
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
          </div>
        )}

        {bg.kind === 'image' && (
          <div className="mt-4">
            <Dropzone
              accept={IMAGE_ACCEPT}
              noun="a background image"
              compact
              onFiles={async (f) => {
                try {
                  setBg({ ...bg, kind: 'image', image: await createImageBitmap(f[0]) })
                } catch { /* unreadable image: keep the current background */ }
              }}
            />
            <p className="hint">It is cropped to fill the picture.</p>
          </div>
        )}

        <div className="mt-5 grid gap-2">
          <button className="btn btn-primary btn-lg" data-testid="download-png" onClick={() => save('png')}>
            <Icon name="download" /> Download PNG
          </button>
          {filled && (
            <button className="btn" data-testid="download-jpg" onClick={() => save('jpg')}>
              <Icon name="download" size={16} /> Download JPG (smaller file)
            </button>
          )}
          <button className="btn" onClick={onReset}>Start over</button>
        </div>
        <p className="hint">Full resolution, free, and the photo never left this device.</p>
      </div>
    </div>
  )
}

export default function RemoveBackground() {
  const tool = imageTool('remove-background')
  const [file, setFile] = useState<File | null>(null)
  const [model, setModel] = useState<BgModel>('small')
  const [result, setResult] = useState<Result | null>(null)
  const { state, run, reset } = useRun()

  const clear = () => {
    if (result) {
      URL.revokeObjectURL(result.originalUrl)
      result.original.close()
      result.cutout.close()
    }
    setResult(null)
    setFile(null)
    reset()
  }

  const start = () =>
    run(async (setProgress) => {
      let original: ImageBitmap
      try {
        original = await createImageBitmap(file!)
      } catch {
        throw new ToolError('This file could not be read as an image. Try a JPG, PNG or WebP.')
      }
      const small = await removeBackgroundInWorker(file!, model, (p) =>
        p.stage === 'download'
          ? setProgress(p.fraction * 0.6, 'Fetching the model (first time only)…')
          : setProgress(0.6 + p.fraction * 0.4, 'Removing the background…'),
      )
      const mask = await createImageBitmap(small)
      const { width, height } = fitArea(original.width, original.height, MAX_OUTPUT_PIXELS)
      const cutout = await applyMask(original, mask, width, height)
      mask.close()
      setResult({ original, cutout, width, height, originalUrl: URL.createObjectURL(file!) })
      return { outputs: [] }
    })

  return (
    <ToolShell
      moduleId="image"
      moduleName="Image tools"
      title={tool.name}
      description={tool.description}
      run={state}
      onReset={clear}
      wide={state.status === 'done'}
      result={result && file ? <Editor result={result} fileName={file.name} onReset={clear} /> : undefined}
    >
      {!file ? (
        <Dropzone accept={IMAGE_ACCEPT} noun="an image" onFiles={(f) => setFile(f[0])} />
      ) : (
        <>
          <ChosenFile file={file} onClear={() => setFile(null)} />
          <div className="card p-5">
            <fieldset className="mb-5">
              <legend className="label">Quality</legend>
              <div className="flex flex-wrap gap-2">
                {([['small', 'Fast'], ['medium', 'Best']] as const).map(([value, label]) => (
                  <label key={value} className={`btn ${model === value ? 'border-primary! bg-surface-2' : ''}`}>
                    <input type="radio" name="bg-model" className="sr-only" checked={model === value} onChange={() => setModel(value)} />
                    {label}
                  </label>
                ))}
              </div>
              <p className="hint">
                {model === 'small'
                  ? 'Quicker, with a 44 MB one-time download. Good for most photos.'
                  : 'Cleaner edges, with an 88 MB one-time download. Takes about twice as long.'}
              </p>
            </fieldset>
            <button className="btn btn-primary btn-lg w-full sm:w-auto" onClick={start} data-testid="run">
              Remove background
            </button>
          </div>
        </>
      )}
    </ToolShell>
  )
}
