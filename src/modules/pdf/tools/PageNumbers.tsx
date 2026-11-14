import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, readBytes, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import type { PageNumberOptions } from '../lib/pageNumbers'
import { OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

const POSITIONS: { value: PageNumberOptions['position']; label: string }[] = [
  { value: 'bottom', label: 'Bottom centre' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'top', label: 'Top centre' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
]
const FORMATS = ['{n}', '{n} / {total}', 'Page {n}', 'Page {n} of {total}']

export default function PageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [options, setOptions] = useState<PageNumberOptions>({
    position: 'bottom', format: '{n}', start: 1, fontSize: 11, margin: 28, color: '#000000', pages: '',
  })
  const set = (patch: Partial<PageNumberOptions>) => setOptions({ ...options, ...patch })
  const { state, run, reset } = useRun()

  const apply = () =>
    run(async () => {
      const out = await runPdf('pageNumbers', { bytes: await readBytes(file!), options })
      return { outputs: [{ name: `${baseName(file!.name)}-numbered.pdf`, blob: toBlob(out, PDF_TYPE) }] }
    })

  return (
    <PdfToolShell id="page-numbers" run={state} onReset={() => { setFile(null); reset() }}>
      {!file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => setFile(f[0])} />
      ) : (
        <>
          <ChosenFile file={file} onClear={() => setFile(null)} />
          <OptionsCard action="Add page numbers" onRun={apply}>
            <div>
              <label className="label" htmlFor="pn-position">Position</label>
              <select id="pn-position" className="field" value={options.position} onChange={(e) => set({ position: e.target.value as PageNumberOptions['position'] })}>
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pn-format">Style</label>
              <select id="pn-format" className="field" value={options.format} onChange={(e) => set({ format: e.target.value })}>
                {FORMATS.map((f) => <option key={f} value={f}>{f.replace('{n}', '1').replace('{total}', '12')}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="pn-start">First number</label>
              <input id="pn-start" type="number" className="field" value={options.start} onChange={(e) => set({ start: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label" htmlFor="pn-pages">Pages to number</label>
              <input id="pn-pages" className="field" placeholder="All pages" value={options.pages} onChange={(e) => set({ pages: e.target.value })} />
              <p className="hint">Leave empty for all. "2-" skips a cover page.</p>
            </div>
            <div>
              <label className="label" htmlFor="pn-size">Text size: {options.fontSize} pt</label>
              <input id="pn-size" type="range" min={7} max={24} value={options.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="label" htmlFor="pn-color">Colour</label>
              <input id="pn-color" type="color" value={options.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-16 rounded border border-border bg-bg" />
            </div>
          </OptionsCard>
        </>
      )}
    </PdfToolShell>
  )
}
