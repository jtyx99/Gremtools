import type { ModuleDef } from '../shared/registry'
import { pdfModule } from '../modules/pdf/registry'
import { imageModule } from '../modules/image/registry'
import { colourModule } from '../modules/colour/registry'

/** Every module on the platform, in display order. Add new modules here. */
export const MODULES: ModuleDef[] = [pdfModule, imageModule, colourModule]

/** Public source repository. AGPL-3.0 requires the running site to link to its source. */
export const SOURCE_URL = 'https://github.com/jtyx99/Gremtools'
