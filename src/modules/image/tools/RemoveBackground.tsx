import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { Icon } from '../../../shared/Icon'
import { ToolShell } from '../../../shared/ToolShell'
import { ToolError } from '../../../shared/errors'
import { download, formatSize, zipFiles } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { cutOut, type CutoutMethod } from '../client'
import type { BgModel } from '../engines/backgroundRemoval'
import { outputName, uniqueNames } from '../lib/compose'
import { imageTool } from '../meta'
import { Editor } from './removeBackground/Editor'
import { DEFAULT_BG, renderItem, type Item } from './removeBackground/canvas'

const IMAGE_ACCEPT = 'image/*'
type Method = CutoutMethod | 'auto'

const METHODS: { value: Method; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Ling looks at each picture and picks the right method.' },
  { value: 'photo', label: 'Photo', hint: 'For people, products, animals and other real-world photos. Uses the AI model.' },
  { value: 'graphic', label: 'Logo or graphic', hint: 'For logos, illustrations and screenshots on a plain background. Exact and instant.' },
]

let seq = 0

function Choice<T extends string>({ label, name, value, options, onChange }: { label: string; name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={`btn ${value === o.value ? 'border-primary! bg-surface-2' : ''}`}>
            <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Batch results: one card per picture, with edit and download. */
function Grid({ items, onEdit, onStartOver }: { items: Item[]; onEdit: (id: string) => void; onStartOver: () => void }) {
  const done = items.filter((i) => i.cutout)
  const downloadAll = async () => {
    const names = uniqueNames(done.map((i) => outputName(i.file.name, 'png')))
    const files = []
    for (let n = 0; n < done.length; n++) files.push({ name: names[n], blob: await renderItem(done[n], 'png') })
    download(await zipFiles(files, 'no-background.zip'))
  }
  return (
    <div data-testid="result">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-muted">
          {done.length} of {items.length} pictures ready. Open one to touch it up or change its background.
        </p>
        <button className="btn btn-primary" data-testid="download-all" disabled={!done.length} onClick={downloadAll}>
          <Icon name="download" size={18} /> Download all ({done.length}) as zip
        </button>
        <button className="btn" onClick={onStartOver}>Start over</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="card p-2" data-testid="batch-item">
            <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-lg">
              {item.thumbUrl ? (
                <img src={item.thumbUrl} alt="" className="max-h-full max-w-full" />
              ) : (
                <p className="p-3 text-center text-xs text-danger">{item.error}</p>
              )}
            </div>
            <p className="mt-2 truncate text-xs text-muted" title={item.file.name}>{item.file.name}</p>
            {item.cutout && (
              <div className="mt-2 flex gap-2">
                <button className="btn flex-1 py-1" data-testid="batch-edit" onClick={() => onEdit(item.id)}>Edit</button>
                <button
                  className="btn px-2 py-1"
                  aria-label={`Download ${item.file.name}`}
                  onClick={async () => download({ name: outputName(item.file.name, 'png'), blob: await renderItem(item, 'png') })}
                >
                  <Icon name="download" size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RemoveBackground() {
  const tool = imageTool('remove-background')
  const [files, setFiles] = useState<File[]>([])
  const [method, setMethod] = useState<Method>('auto')
  const [model, setModel] = useState<BgModel>('medium')
  const [items, setItems] = useState<Item[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const { state, run, reset } = useRun()

  const clear = () => {
    items.forEach((i) => i.thumbUrl && URL.revokeObjectURL(i.thumbUrl))
    setItems([])
    setEditing(null)
    setFiles([])
    reset()
  }

  const start = () =>
    run(async (setProgress) => {
      const results: Item[] = []
      for (let n = 0; n < files.length; n++) {
        const file = files[n]
        const which = files.length > 1 ? `Picture ${n + 1} of ${files.length}: ` : ''
        const base: Item = { id: `item${seq++}`, file, cutout: null, width: 0, height: 0, bg: DEFAULT_BG, thumbUrl: null }
        setProgress(n / files.length, `${which}removing the background…`)
        try {
          const r = await cutOut(file, method, model, (p) =>
            setProgress(
              (n + (p.stage === 'download' ? p.fraction * 0.6 : 0.6 + p.fraction * 0.4)) / files.length,
              p.stage === 'download' ? `${which}fetching the model (first time only)…` : `${which}removing the background…`,
            ),
          )
          results.push({ ...base, cutout: r.cutout, width: r.width, height: r.height, method: r.method, thumbUrl: URL.createObjectURL(r.cutout) })
        } catch (err) {
          console.error(err)
          const unreadable = err instanceof Error && /decod|source image/i.test(err.message)
          results.push({
            ...base,
            error: unreadable ? 'This file could not be read as an image. Try a JPG, PNG or WebP.' : 'Something went wrong with this picture.',
          })
        }
      }
      if (results.length === 1 && results[0].error) throw new ToolError(results[0].error)
      setItems(results)
      return { outputs: [] }
    })

  const single = items.length === 1
  const current = single ? items[0] : items.find((i) => i.id === editing)
  const result = !items.length ? undefined : current ? (
    <Editor
      key={current.id}
      item={current}
      multi={!single}
      onDone={(patch) => {
        setItems((all) => all.map((i) => (i.id === current.id ? { ...i, ...patch } : i)))
        setEditing(null)
      }}
      onStartOver={clear}
    />
  ) : (
    <Grid items={items} onEdit={setEditing} onStartOver={clear} />
  )

  return (
    <ToolShell
      moduleId="image"
      moduleName="Image tools"
      title={tool.name}
      description={tool.description}
      run={state}
      onReset={clear}
      wide={state.status === 'done'}
      result={result}
    >
      {!files.length ? (
        <Dropzone accept={IMAGE_ACCEPT} multiple noun="images" onFiles={setFiles} />
      ) : (
        <>
          <ul className="card mb-3 divide-y divide-border px-4">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  {formatSize(f.size)}
                  <button className="btn px-2 py-1" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <Icon name="trash" size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mb-4">
            <Dropzone accept={IMAGE_ACCEPT} multiple noun="images" compact onFiles={(more) => setFiles([...files, ...more])} />
          </div>
          <div className="card p-5">
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Choice label="Kind of picture" name="bg-method" value={method} options={METHODS} onChange={setMethod} />
                <p className="hint">{METHODS.find((m) => m.value === method)!.hint}</p>
              </div>
              {method !== 'graphic' && (
                <div>
                  <Choice
                    label="Photo quality"
                    name="bg-model"
                    value={model}
                    options={[{ value: 'medium', label: 'Best' }, { value: 'small', label: 'Fast' }]}
                    onChange={setModel}
                  />
                  <p className="hint">
                    {model === 'medium'
                      ? 'Cleaner edges. 88 MB one-time download.'
                      : 'About twice as quick, slightly rougher edges. 44 MB one-time download.'}
                  </p>
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-lg w-full sm:w-auto" onClick={start} data-testid="run">
              {files.length > 1 ? `Remove backgrounds (${files.length})` : 'Remove background'}
            </button>
          </div>
        </>
      )}
    </ToolShell>
  )
}
