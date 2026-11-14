import { useEffect, useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { Icon } from '../../../shared/Icon'
import { PageThumb } from '../../../shared/PageThumb'
import { Sortable } from '../../../shared/Sortable'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, readBytes, toBlob } from '../../../shared/files'
import { usePdfFile } from '../../../shared/usePdfFile'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import { OpenError, OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

interface Item { id: string; index: number; rotate: number }

export default function Organise() {
  const pdf = usePdfFile()
  const { state, run, reset } = useRun()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    setItems(Array.from({ length: pdf.pageCount }, (_, index) => ({ id: `p${index}`, index, rotate: 0 })))
  }, [pdf.doc, pdf.pageCount])

  const turn = (id: string | null, by: number) =>
    setItems((cur) => cur.map((it) => (id === null || it.id === id ? { ...it, rotate: (it.rotate + by + 360) % 360 } : it)))

  const save = () =>
    run(async () => {
      const out = await runPdf('organise', {
        bytes: await readBytes(pdf.file!),
        pages: items.map(({ index, rotate }) => ({ index, rotate })),
      })
      return { outputs: [{ name: `${baseName(pdf.file!.name)}-organised.pdf`, blob: toBlob(out, PDF_TYPE) }] }
    })

  return (
    <PdfToolShell id="organise" run={state} onReset={() => { pdf.choose(null); reset() }}>
      {!pdf.file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => pdf.choose(f[0])} />
      ) : (
        <>
          <ChosenFile file={pdf.file} onClear={() => pdf.choose(null)} extra={pdf.doc ? ` · ${pdf.pageCount} pages` : ''} />
          <OpenError message={pdf.error} />
          {pdf.doc && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-muted">Drag pages to reorder them.</p>
                <button className="btn" onClick={() => turn(null, -90)}><Icon name="rotateLeft" size={16} /> Rotate all left</button>
                <button className="btn" onClick={() => turn(null, 90)}><Icon name="rotate" size={16} /> Rotate all right</button>
              </div>
              <Sortable
                items={items}
                onChange={setItems}
                className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
                render={(item, i, handle) => (
                  <div className="card p-2" data-testid="page-card" data-page={item.index + 1}>
                    <div {...handle} aria-label={`Page ${item.index + 1}, position ${i + 1}. Drag to move.`}>
                      <PageThumb doc={pdf.doc!} page={item.index + 1} rotate={item.rotate} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted">Page {item.index + 1}</span>
                      <span className="flex gap-1">
                        <button className="btn px-2 py-1" aria-label={`Rotate page ${item.index + 1}`} onClick={() => turn(item.id, 90)}><Icon name="rotate" size={16} /></button>
                        <button className="btn px-2 py-1" aria-label={`Delete page ${item.index + 1}`} onClick={() => setItems(items.filter((x) => x.id !== item.id))}><Icon name="trash" size={16} /></button>
                      </span>
                    </div>
                  </div>
                )}
              />
              <OptionsCard action="Save PDF" disabled={items.length === 0} onRun={save} />
            </>
          )}
        </>
      )}
    </PdfToolShell>
  )
}
