import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ModuleDef } from '../../shared/registry'
import { PDF_TOOLS } from './meta'

/** One lazy import per tool, so a tool's code loads only when its page opens. */
const COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  merge: lazy(() => import('./tools/Merge')),
  split: lazy(() => import('./tools/Split')),
  organise: lazy(() => import('./tools/Organise')),
  compress: lazy(() => import('./tools/Compress')),
  'images-to-pdf': lazy(() => import('./tools/ImagesToPdf')),
  'pdf-to-images': lazy(() => import('./tools/PdfToImages')),
  watermark: lazy(() => import('./tools/Watermark')),
  'page-numbers': lazy(() => import('./tools/PageNumbers')),
}

export const pdfModule: ModuleDef = {
  id: 'pdf',
  name: 'PDF tools',
  tagline: 'Merge, split, squeeze and stamp PDFs.',
  icon: 'pdf',
  tools: PDF_TOOLS.map((t) => ({ ...t, component: COMPONENTS[t.id] })),
}
