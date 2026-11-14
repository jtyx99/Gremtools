import type { ReactNode } from 'react'
import { ToolShell } from '../../../shared/ToolShell'
import type { RunState } from '../../../shared/useRun'
import { pdfTool } from '../meta'

export const PDF_ACCEPT = 'application/pdf,.pdf'
export const IMAGE_ACCEPT = 'image/*'
export const PDF_TYPE = 'application/pdf'

/** ToolShell pre-filled with the PDF module and the tool's registry text. */
export function PdfToolShell({ id, run, onReset, zipName, children }: { id: string; run: RunState; onReset: () => void; zipName?: string; children: ReactNode }) {
  const tool = pdfTool(id)
  return (
    <ToolShell moduleId="pdf" moduleName="PDF tools" title={tool.name} description={tool.description} run={run} onReset={onReset} zipName={zipName}>
      {children}
    </ToolShell>
  )
}

export function OpenError({ message }: { message: string | null }) {
  return message ? <p className="mb-4 text-sm text-danger" role="alert" data-testid="open-error">{message}</p> : null
}

/** Options card with the action button at the bottom. */
export function OptionsCard({ children, action, disabled, onRun }: { children?: ReactNode; action: string; disabled?: boolean; onRun: () => void }) {
  return (
    <div className="card p-5">
      {children && <div className="mb-5 grid gap-4 sm:grid-cols-2">{children}</div>}
      <button className="btn btn-primary btn-lg w-full sm:w-auto" disabled={disabled} onClick={onRun} data-testid="run">
        {action}
      </button>
    </div>
  )
}

export function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={`btn ${value === o.value ? 'border-primary! bg-surface-2' : ''}`}>
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
