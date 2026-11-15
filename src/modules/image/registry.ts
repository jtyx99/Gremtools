import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ModuleDef } from '../../shared/registry'
import { IMAGE_TOOLS } from './meta'

/** One lazy import per tool, so a tool's code loads only when its page opens. */
const COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  'remove-background': lazy(() => import('./tools/RemoveBackground')),
}

/** See docs/ROADMAP.md for the planned tools. */
export const imageModule: ModuleDef = {
  id: 'image',
  name: 'Image tools',
  tagline: 'Remove backgrounds now; compress, resize and convert are on the way.',
  icon: 'image',
  tools: IMAGE_TOOLS.map((t) => ({ ...t, component: COMPONENTS[t.id] })),
}
