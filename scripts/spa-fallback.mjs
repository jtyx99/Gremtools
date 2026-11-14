// GitHub Pages serves 404.html for any path it has no file for. Copying the app
// shell there makes reloading a tool page (/pdf/merge) load the app instead of an error.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
