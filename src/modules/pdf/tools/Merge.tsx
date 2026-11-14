import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { Icon } from '../../../shared/Icon'
import { Sortable } from '../../../shared/Sortable'
import { formatSize, readBytes, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import { OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

let seq = 0

export default function Merge() {
  const [items, setItems] = useState<{ id: string; file: File }[]>([])
  const { state, run, reset } = useRun()
  const add = (files: File[]) => setItems((cur) => [...cur, ...files.map((file) => ({ id: `f${seq++}`, file }))])

  const merge = () =>
    run(async () => {
      const files = await Promise.all(items.map((i) => readBytes(i.file)))
      const out = await runPdf('merge', { files })
      return { outputs: [{ name: 'merged.pdf', blob: toBlob(out, PDF_TYPE) }] }
    })

  return (
    <PdfToolShell id="merge" run={state} onReset={() => { setItems([]); reset() }}>
      {items.length === 0 ? (
        <Dropzone accept={PDF_ACCEPT} multiple noun="PDF files" onFiles={add} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">Drag to set the order. The top file comes first.</p>
          <Sortable
            items={items}
            onChange={setItems}
            className="mb-3 grid gap-2"
            render={(item, i, handle) => (
              <div className="card flex items-center gap-3 px-3 py-2" data-testid="merge-item">
                <button className="text-muted" aria-label={`Move ${item.file.name}`} {...handle}><Icon name="grip" /></button>
                <span className="w-6 text-center text-sm text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                <span className="text-xs text-muted">{formatSize(item.file.size)}</span>
                <button className="btn px-2 py-1" aria-label={`Remove ${item.file.name}`} onClick={() => setItems(items.filter((x) => x.id !== item.id))}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            )}
          />
          <div className="mb-4"><Dropzone accept={PDF_ACCEPT} multiple noun="PDF files" onFiles={add} compact /></div>
          <OptionsCard action={`Merge ${items.length} PDFs`} disabled={items.length < 2} onRun={merge} />
          {items.length < 2 && <p className="hint">Add at least two PDFs to merge.</p>}
        </>
      )}
    </PdfToolShell>
  )
}
