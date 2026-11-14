import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../shared/Icon'
import { Mascot } from '../shared/Mascot'
import type { ModuleDef, ToolDef } from '../shared/registry'
import { MODULES } from './config'

function ToolCard({ module, tool }: { module: ModuleDef; tool: ToolDef }) {
  return (
    <Link to={`/${module.id}/${tool.id}`} className="card group flex gap-3 p-4 transition hover:-translate-y-0.5 hover:border-primary" data-testid="tool-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-ink">
        <Icon name={tool.icon} size={24} />
      </span>
      <span>
        <span className="block font-semibold">{tool.name}</span>
        <span className="block text-sm text-muted">{tool.description}</span>
      </span>
    </Link>
  )
}

function ModuleSection({ module, query }: { module: ModuleDef; query: string }) {
  const tools = module.tools.filter((t) => `${t.name} ${t.description} ${t.keywords ?? ''}`.toLowerCase().includes(query))
  if (query && !tools.length) return null
  return (
    <section className="mb-10" aria-labelledby={`m-${module.id}`}>
      <h2 id={`m-${module.id}`} className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Icon name={module.icon} /> {module.name}
        {!module.tools.length && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">Coming soon</span>}
      </h2>
      <p className="mb-4 text-sm text-muted">{module.tagline}</p>
      {module.tools.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => <ToolCard key={t.id} module={module} tool={t} />)}
        </div>
      ) : (
        <div className="card border-dashed p-4 text-sm text-muted">Ling is still building these.</div>
      )}
    </section>
  )
}

/** Home page (all modules), or one module's page when the route has :module. */
export function Home() {
  const { module: moduleId } = useParams()
  const [search, setSearch] = useState('')
  const modules = useMemo(() => (moduleId ? MODULES.filter((m) => m.id === moduleId) : MODULES), [moduleId])
  const query = search.trim().toLowerCase()
  const anyMatch = modules.some((m) => m.tools.some((t) => `${t.name} ${t.description} ${t.keywords ?? ''}`.toLowerCase().includes(query)))

  useEffect(() => {
    document.title = moduleId && modules[0] ? `${modules[0].name} · Gremtools` : 'Gremtools'
  }, [moduleId, modules])

  if (moduleId && !modules.length) return <NotFound />

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {!moduleId && (
        <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Mascot pose="idle" size={150} className="shrink-0" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Handy tools, with a <span className="text-accent">gremlin</span> on the job.
            </h1>
            <p className="mt-3 max-w-xl text-lg text-muted">
              Free tools for your files that run right here in your browser. No uploads, no sign-up, no limits.
            </p>
          </div>
        </div>
      )}
      <div className="relative mb-8 max-w-md">
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="field py-2.5 pl-10"
          style={{ background: 'var(--surface)' }}
          placeholder="Find a tool"
          aria-label="Find a tool"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {modules.map((m) => <ModuleSection key={m.id} module={m} query={query} />)}
      {query && !anyMatch && <p className="text-muted">No tool matches "{search}".</p>}
    </div>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <Mascot pose="oops" size={150} />
      <h1 className="mt-2 text-2xl font-bold">Ling can't find that page</h1>
      <Link to="/" className="btn btn-primary mt-4">Back to all tools</Link>
    </div>
  )
}
