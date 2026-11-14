import type { ComponentType, LazyExoticComponent } from 'react'
import type { IconName } from './Icon'

export interface ToolDef {
  /** URL segment, unique within the module: /<module>/<id>. */
  id: string
  name: string
  /** One line, shown on the tool card and under the tool title. */
  description: string
  icon: IconName
  /** Extra words the search box should match. */
  keywords?: string
  component: LazyExoticComponent<ComponentType>
}

export interface ModuleDef {
  /** URL segment: /<id>. */
  id: string
  name: string
  tagline: string
  icon: IconName
  /** Modules with no tools yet are shown as "coming soon". */
  tools: ToolDef[]
}
