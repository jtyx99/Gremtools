import { useRef, useState, type DragEvent } from 'react'
import { Icon } from './Icon'

interface Props {
  /** Value for the file input's accept attribute, e.g. "application/pdf". */
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  /** e.g. "PDF files" - used in the prompt text. */
  noun: string
  /** Compact style for "add more" once files are already chosen. */
  compact?: boolean
}

function matches(file: File, accept: string) {
  return accept.split(',').some((raw) => {
    const a = raw.trim()
    if (a.startsWith('.')) return file.name.toLowerCase().endsWith(a.toLowerCase())
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1))
    return file.type === a
  })
}

export function Dropzone({ accept, multiple, onFiles, noun, compact }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState(false)

  const take = (list: FileList | null) => {
    const all = Array.from(list ?? [])
    const ok = all.filter((f) => matches(f, accept))
    setRejected(ok.length < all.length)
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1))
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed text-center transition ${compact ? 'p-4' : 'px-6 py-12'} ${over ? 'border-primary bg-surface-2' : 'border-border bg-surface'}`}
      >
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          data-testid="file-input"
          onChange={(e) => { take(e.target.files); e.target.value = '' }}
        />
        <button type="button" className={`btn ${compact ? '' : 'btn-primary btn-lg'}`} onClick={() => input.current?.click()}>
          <Icon name={compact ? 'plus' : 'upload'} />
          {compact ? `Add more ${noun}` : `Choose ${noun}`}
        </button>
        {!compact && <p className="mt-3 text-sm text-muted">or drop {multiple ? 'them' : 'it'} here</p>}
      </div>
      {rejected && <p className="mt-2 text-sm text-danger">Some files were skipped because they are not {noun}.</p>}
    </div>
  )
}
