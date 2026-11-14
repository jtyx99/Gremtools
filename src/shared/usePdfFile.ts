import { useCallback, useEffect, useState } from 'react'
import { readBytes } from './files'
import { openPreview, type PreviewDoc } from './pdfPreview'

/** One chosen PDF, opened for previews. `error` is set if it cannot be opened. */
export function usePdfFile() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PreviewDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    let opened: PreviewDoc | null = null
    readBytes(file)
      .then(openPreview)
      .then((d) => {
        opened = d
        if (cancelled) void d.loadingTask.destroy()
        else setDoc(d)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
      void opened?.loadingTask.destroy()
    }
  }, [file])

  const choose = useCallback((f: File | null) => {
    setDoc(null)
    setError(null)
    setFile(f)
  }, [])

  return { file, doc, error, pageCount: doc?.numPages ?? 0, choose }
}
