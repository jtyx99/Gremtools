import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { Mascot } from './Mascot'
import { download, formatSize, zipFiles } from './files'
import type { RunState } from './useRun'

interface Props {
  moduleId: string
  moduleName: string
  title: string
  description: string
  run: RunState
  /** Called by "Start over": clear chosen files and reset the run. */
  onReset: () => void
  /** Name for the zip when there are several outputs. */
  zipName?: string
  /** Shown instead of the standard download card when the run is done (for tools with their own result view). */
  result?: ReactNode
  /** Wider layout for tools with an editor. */
  wide?: boolean
  children: ReactNode
}

/**
 * Frame shared by every tool page. Children are the tool's own file picker and
 * options; this component swaps them for the working, done or error view.
 */
export function ToolShell({ moduleId, moduleName, title, description, run, onReset, zipName = 'gremtools.zip', result, wide, children }: Props) {
  useEffect(() => {
    document.title = `${title} · Gremtools`
    return () => { document.title = 'Gremtools' }
  }, [title])

  return (
    <div className={`mx-auto w-full px-4 py-8 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
      <Link to={`/${moduleId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <Icon name="back" size={16} /> {moduleName}
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 mb-6 text-muted">{description}</p>

      {run.status === 'idle' && children}

      {run.status === 'working' && (
        <div className="card flex flex-col items-center px-6 py-10 text-center" role="status">
          <Mascot pose="working" size={140} />
          <p className="mt-2 text-lg font-semibold" data-testid="stage">{run.stage ?? 'Tinkering…'}</p>
          <p className="text-sm text-muted">Everything is happening on your device.</p>
          {run.progress !== undefined && (
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(run.progress * 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {run.status === 'done' && result}

      {run.status === 'done' && !result && (
        <div className="card flex flex-col items-center px-6 py-10 text-center" data-testid="result">
          <Mascot pose="happy" size={140} />
          <p className="mt-2 text-lg font-semibold">Done!</p>
          {run.note && <p className="text-sm text-muted" data-testid="result-note">{run.note}</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {run.outputs.length > 1 && (
              <button
                className="btn btn-primary btn-lg"
                data-testid="download-all"
                onClick={async () => download(await zipFiles(run.outputs, zipName))}
              >
                <Icon name="download" /> Download all ({run.outputs.length}) as zip
              </button>
            )}
            {run.outputs.length === 1 && (
              <button className="btn btn-primary btn-lg" data-testid="download" onClick={() => download(run.outputs[0])}>
                <Icon name="download" /> Download {run.outputs[0].name}
              </button>
            )}
            <button className="btn btn-lg" onClick={onReset}>Start over</button>
          </div>
          {run.outputs.length > 1 && (
            <ul className="mt-6 w-full max-w-md divide-y divide-border text-left text-sm">
              {run.outputs.map((f) => (
                <li key={f.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{f.name}</span>
                  <span className="flex shrink-0 items-center gap-3 text-muted">
                    {formatSize(f.blob.size)}
                    <button className="btn px-2 py-1" aria-label={`Download ${f.name}`} onClick={() => download(f)}>
                      <Icon name="download" size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {run.status === 'error' && (
        <div className="card flex flex-col items-center px-6 py-10 text-center" role="alert">
          <Mascot pose="oops" size={140} />
          <p className="mt-2 text-lg font-semibold">That didn't work</p>
          <p className="max-w-md text-sm text-muted" data-testid="error">{run.error}</p>
          <button className="btn btn-lg mt-5" onClick={onReset}>Start over</button>
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
        <Icon name="lock" size={14} /> Your files stay on this device. Nothing is uploaded.
      </p>
    </div>
  )
}

/** Row showing the one chosen file, with a way to pick a different one. */
export function ChosenFile({ file, onClear, extra }: { file: File; onClear: () => void; extra?: ReactNode }) {
  return (
    <div className="card mb-4 flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-xs text-muted">{formatSize(file.size)}{extra}</p>
      </div>
      <button className="btn shrink-0" onClick={onClear}>Change file</button>
    </div>
  )
}
