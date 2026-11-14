import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { PageThumb } from '../../../shared/PageThumb'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, readBytes, toBlob } from '../../../shared/files'
import { usePdfFile } from '../../../shared/usePdfFile'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import { everyN, parseRanges } from '../lib/ranges'
import { Choice, OpenError, OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

type Mode = 'ranges' | 'every' | 'pick'

export default function Split() {
  const pdf = usePdfFile()
  const { state, run, reset } = useRun()
  const [mode, setMode] = useState<Mode>('ranges')
  const [ranges, setRanges] = useState('')
  const [every, setEvery] = useState(1)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [rangeError, setRangeError] = useState<string | null>(null)

  const split = () => {
    let groups: number[][]
    try {
      groups =
        mode === 'ranges' ? parseRanges(ranges, pdf.pageCount)
        : mode === 'every' ? everyN(every, pdf.pageCount)
        : [[...picked].sort((a, b) => a - b)]
    } catch (e) {
      return setRangeError((e as Error).message)
    }
    setRangeError(null)
    run(async () => {
      const outs = await runPdf('split', { bytes: await readBytes(pdf.file!), groups })
      const base = baseName(pdf.file!.name)
      return {
        outputs: outs.map((bytes, i) => {
          const g = groups[i]
          const label = mode === 'pick' ? 'selected' : g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`
          return { name: `${base}-${label}.pdf`, blob: toBlob(bytes, PDF_TYPE) }
        }),
      }
    })
  }

  const toggle = (i: number) => {
    const next = new Set(picked)
    if (!next.delete(i)) next.add(i)
    setPicked(next)
  }

  return (
    <PdfToolShell id="split" run={state} zipName="split.zip" onReset={() => { pdf.choose(null); setPicked(new Set()); setRanges(''); reset() }}>
      {!pdf.file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => pdf.choose(f[0])} />
      ) : (
        <>
          <ChosenFile file={pdf.file} onClear={() => pdf.choose(null)} extra={pdf.doc ? ` · ${pdf.pageCount} pages` : ''} />
          <OpenError message={pdf.error} />
          {pdf.doc && (
            <>
              <div className="mb-4">
                <Choice
                  label="How to split"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'ranges', label: 'By page ranges' },
                    { value: 'every', label: 'Every few pages' },
                    { value: 'pick', label: 'Pick pages' },
                  ]}
                />
              </div>
              {mode === 'pick' && (
                <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {Array.from({ length: pdf.pageCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => toggle(i)}
                      aria-pressed={picked.has(i)}
                      data-testid="pick-page"
                      className={`rounded-xl border-2 p-1 text-xs ${picked.has(i) ? 'border-primary bg-surface-2' : 'border-transparent'}`}
                    >
                      <PageThumb doc={pdf.doc!} page={i + 1} />
                      <span className="mt-1 block text-muted">{i + 1}</span>
                    </button>
                  ))}
                </div>
              )}
              <OptionsCard
                action={mode === 'pick' ? `Extract ${picked.size} page${picked.size === 1 ? '' : 's'}` : 'Split PDF'}
                disabled={mode === 'pick' ? picked.size === 0 : mode === 'ranges' ? !ranges.trim() : false}
                onRun={split}
              >
                {mode === 'ranges' && (
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="ranges">Pages for each new file</label>
                    <input id="ranges" className="field" placeholder="1-3, 4, 5-" value={ranges} onChange={(e) => setRanges(e.target.value)} />
                    <p className="hint">Separate files with commas. "1-3, 4, 5-" makes three files: pages 1 to 3, page 4, and page 5 to the end.</p>
                    {rangeError && <p className="mt-1 text-sm text-danger" role="alert">{rangeError}</p>}
                  </div>
                )}
                {mode === 'every' && (
                  <div>
                    <label className="label" htmlFor="every">Pages per file</label>
                    <input id="every" type="number" min={1} max={pdf.pageCount} className="field" value={every} onChange={(e) => setEvery(Number(e.target.value) || 1)} />
                    <p className="hint">Makes {everyN(every, pdf.pageCount).length} files.</p>
                  </div>
                )}
              </OptionsCard>
            </>
          )}
        </>
      )}
    </PdfToolShell>
  )
}
