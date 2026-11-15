/**
 * Serves the background-removal model files from our own site.
 *
 * The files come from the @imgly/background-removal-data npm package: a
 * resources.json index plus content-hashed chunks of about 4 MB. They are
 * not committed. In development they are served straight from node_modules;
 * a production build copies them into dist/bg-removal/.
 */
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

export const BG_REMOVAL_DIR = 'bg-removal'

const DATA = resolve('node_modules/@imgly/background-removal-data/dist')

/** Only what the tool can use: both models and the CPU engine builds. */
const KEEP = [
  '/models/small',
  '/models/medium',
  '/onnxruntime-web/ort-wasm.wasm',
  '/onnxruntime-web/ort-wasm-simd.wasm',
  '/onnxruntime-web/ort-wasm-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
]

interface Entry { chunks: { hash: string }[] }

function index(): Record<string, Entry> {
  const all = JSON.parse(readFileSync(join(DATA, 'resources.json'), 'utf8')) as Record<string, Entry>
  return Object.fromEntries(KEEP.map((key) => [key, all[key]]))
}

export function bgRemovalAssets(): Plugin {
  let outDir = 'dist'
  let base = '/'
  return {
    name: 'gremtools-bg-removal-assets',
    configResolved(config) {
      outDir = config.build.outDir
      base = config.base
    },
    configureServer(server) {
      const prefix = `${base}${BG_REMOVAL_DIR}/`
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (!path.startsWith(prefix)) return next()
        const name = path.slice(prefix.length)
        if (name === 'resources.json') {
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(index()))
        }
        const file = join(DATA, name)
        if (!/^[0-9a-f]{64}$/.test(name) || !existsSync(file)) {
          res.statusCode = 404
          return res.end()
        }
        res.setHeader('Content-Type', 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      if (this.environment && this.environment.name !== 'client') return
      const target = resolve(outDir, BG_REMOVAL_DIR)
      mkdirSync(target, { recursive: true })
      const entries = index()
      writeFileSync(join(target, 'resources.json'), JSON.stringify(entries))
      for (const entry of Object.values(entries)) {
        for (const chunk of entry.chunks) copyFileSync(join(DATA, chunk.hash), join(target, chunk.hash))
      }
    },
  }
}
