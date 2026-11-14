import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, imageForPdf, readBytes, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import type { WatermarkPosition } from '../lib/watermark'
import { Choice, IMAGE_ACCEPT, OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'center', label: 'Centre' },
  { value: 'tile', label: 'Repeat across page' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top', label: 'Top' },
  { value: 'top-right', label: 'Top right' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'bottom-right', label: 'Bottom right' },
]

export default function Watermark() {
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('DRAFT')
  const [image, setImage] = useState<File | null>(null)
  const [fontSize, setFontSize] = useState(64)
  const [imageScale, setImageScale] = useState(40)
  const [color, setColor] = useState('#888888')
  const [opacity, setOpacity] = useState(30)
  const [rotation, setRotation] = useState(45)
  const [position, setPosition] = useState<WatermarkPosition>('center')
  const { state, run, reset } = useRun()

  const apply = () =>
    run(async () => {
      const out = await runPdf('watermark', {
        bytes: await readBytes(file!),
        options: {
          kind, text, fontSize, color, position, rotation,
          opacity: opacity / 100,
          imageScale: imageScale / 100,
          image: kind === 'image' && image ? await imageForPdf(image) : undefined,
        },
      })
      return { outputs: [{ name: `${baseName(file!.name)}-watermarked.pdf`, blob: toBlob(out, PDF_TYPE) }] }
    })

  return (
    <PdfToolShell id="watermark" run={state} onReset={() => { setFile(null); reset() }}>
      {!file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => setFile(f[0])} />
      ) : (
        <>
          <ChosenFile file={file} onClear={() => setFile(null)} />
          <OptionsCard action="Add watermark" disabled={kind === 'text' ? !text.trim() : !image} onRun={apply}>
            <div className="sm:col-span-2">
              <Choice label="Watermark type" value={kind} onChange={setKind} options={[{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }]} />
            </div>
            {kind === 'text' ? (
              <>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="wm-text">Text</label>
                  <input id="wm-text" className="field" value={text} onChange={(e) => setText(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="wm-size">Text size: {fontSize} pt</label>
                  <input id="wm-size" type="range" min={12} max={160} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="label" htmlFor="wm-color">Colour</label>
                  <input id="wm-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 rounded border border-border bg-bg" />
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <span className="label">Image</span>
                  {image ? (
                    <p className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 truncate">{image.name}</span>
                      <button className="btn" onClick={() => setImage(null)}>Change image</button>
                    </p>
                  ) : (
                    <Dropzone accept={IMAGE_ACCEPT} noun="an image" onFiles={(f) => setImage(f[0])} compact />
                  )}
                  <p className="hint">A PNG with a transparent background works best.</p>
                </div>
                <div>
                  <label className="label" htmlFor="wm-scale">Width: {imageScale}% of the page</label>
                  <input id="wm-scale" type="range" min={5} max={100} value={imageScale} onChange={(e) => setImageScale(Number(e.target.value))} className="w-full" />
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="wm-opacity">Opacity: {opacity}%</label>
              <input id="wm-opacity" type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label" htmlFor="wm-rotation">Angle: {rotation}°</label>
              <input id="wm-rotation" type="range" min={-90} max={90} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label" htmlFor="wm-position">Position</label>
              <select id="wm-position" className="field" value={position} onChange={(e) => setPosition(e.target.value as WatermarkPosition)}>
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </OptionsCard>
        </>
      )}
    </PdfToolShell>
  )
}
