import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../shared/Icon'
import { LingMark } from '../shared/Mascot'
import { MODULES, SOURCE_URL } from './config'

function currentTheme(): 'light' | 'dark' {
  const set = document.documentElement.dataset.theme
  if (set === 'light' || set === 'dark') return set
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function Layout() {
  const [theme, setTheme] = useState(currentTheme)
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('gremtools-theme', next) } catch { /* private mode: the choice just won't persist */ }
    setTheme(next)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            <LingMark size={40} />
            <span>Grem<span className="text-accent">tools</span></span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm" aria-label="Modules">
            {MODULES.map((m) => (
              <NavLink
                key={m.id}
                to={`/${m.id}`}
                className={({ isActive }) => `rounded-lg px-2 py-1.5 font-medium sm:px-3 ${isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'}`}
              >
                {m.name.replace(' tools', '')}
              </NavLink>
            ))}
          </nav>
          <button className="btn px-2" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
        <p>Gremtools runs entirely in your browser. Your files are never uploaded.</p>
        <p className="mt-1">
          Free and open source under AGPL-3.0 ·{' '}
          <a className="underline hover:text-text" href={SOURCE_URL} target="_blank" rel="noreferrer">Source code</a> ·{' '}
          <a className="underline hover:text-text" href={`${SOURCE_URL}/blob/main/THIRD_PARTY_LICENSES.md`} target="_blank" rel="noreferrer">Third-party licences</a>
        </p>
      </footer>
    </div>
  )
}
