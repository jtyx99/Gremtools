import { useEffect, useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { Icon } from '../../../shared/Icon'
import { Sortable } from '../../../shared/Sortable'
import { imageForPdf, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import type { ImagesToPdfOptions } from '../lib/imagesToPdf'
import { Choice, IMAGE_ACCEPT, OptionsCard, PDF_TYPE, PdfToolShell } from './shared'

let seq = 0
interface Item { id: string; file: File; url: string }

export default function ImagesToPdf() {
  const [items, setItems] = useState<Item[]>([])
  const [options, setOptions] = useState<ImagesToPdfOptions>({ pageSize: 'a4', orientation: 'auto', margin: 24 })
  const { state, run, reset } = useRun()

  const add = (files: File[]) =>
    setItems((cur) => [...cur, ...files.map((file) => ({ id: `i${seq++}`, file, url: URL.createObjectURL(file) }))])
  const remove = (item: Item) => {
    URL.revokeObjectURL(item.url)
    setItems((cur) => cur.filter((x) => x.id !== item.id))
  }
  // Release preview URLs when leaving the page.
  useEffect(() => () => setItems((cur) => (cur.forEach((i) => URL.revokeObjectURL(i.url)), cur)), [])

  const convert = () =>
    run(async () => {
      const images = await Promise.all(items.map((i) => imageForPdf(i.file)))
      const out = await runPdf('imagesToPdf', { images, options })
      return { outputs: [{ name: 'images.pdf', blob: toBlob(out, PDF_TYPE) }] }
    })

  return (
    <PdfToolShell id="images-to-pdf" run={state} onReset={() => { items.forEach((i) => URL.revokeObjectURL(i.url)); setItems([]); reset() }}>
      {items.length === 0 ? (
        <Dropzone accept={IMAGE_ACCEPT} multiple noun="images" onFiles={add} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">Each image becomes one page. Drag to set the order.</p>
          <Sortable
            items={items}
            onChange={setItems}
            className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5"
            render={(item, i, handle) => (
              <div className="card p-2" data-testid="image-item">
                <div {...handle} aria-label={`${item.file.name}, position ${i + 1}. Drag to move.`} className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-2">
                  <img src={item.url} alt="" className="max-h-full max-w-full" draggable={false} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="min-w-0 truncate text-xs text-muted">{i + 1}. {item.file.name}</span>
                  <button className="btn px-1.5 py-1" aria-label={`Remove ${item.file.name}`} onClick={() => remove(item)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            )}
          />
          <div className="mb-4"><Dropzone accept={IMAGE_ACCEPT} multiple noun="images" onFiles={add} compact /></div>
          <OptionsCard action="Create PDF" onRun={convert}>
            <Choice
              label="Page size"
              value={options.pageSize}
              onChange={(pageSize) => setOptions({ ...options, pageSize })}
              options={[{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }, { value: 'fit', label: 'Same as image' }]}
            />
            {options.pageSize !== 'fit' && (
              <Choice
                label="Orientation"
                value={options.orientation}
                onChange={(orientation) => setOptions({ ...options, orientation })}
                options={[{ value: 'auto', label: 'Auto' }, { value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]}
              />
            )}
            <Choice
              label="Margin"
              value={String(options.margin)}
              onChange={(m) => setOptions({ ...options, margin: Number(m) })}
              options={[{ value: '0', label: 'None' }, { value: '24', label: 'Small' }, { value: '48', label: 'Large' }]}
            />
          </OptionsCard>
        </>
      )}
    </PdfToolShell>
  )
}
