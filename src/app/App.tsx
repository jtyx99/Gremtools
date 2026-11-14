import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Mascot } from '../shared/Mascot'
import { MODULES } from './config'
import { Home, NotFound } from './Home'
import { Layout } from './Layout'

function Loading() {
  return (
    <div className="flex flex-col items-center py-16 text-muted" role="status">
      <Mascot pose="working" size={100} />
      Loading…
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {/* One route per registered tool; each tool's code is loaded on demand. */}
          {MODULES.flatMap((m) =>
            m.tools.map((t) => (
              <Route
                key={`${m.id}/${t.id}`}
                path={`${m.id}/${t.id}`}
                element={<Suspense fallback={<Loading />}><t.component /></Suspense>}
              />
            )),
          )}
          <Route path=":module" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
