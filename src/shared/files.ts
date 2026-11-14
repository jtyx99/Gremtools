import { zipSync } from 'fflate'

export interface OutputFile {
  name: string
  blob: Blob
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}

export function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type })
}

export function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') || 'file'
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 2 : 1)} MB`
}

export function download(file: OutputFile) {
  const url = URL.createObjectURL(file.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Bundle outputs into one zip. Stored without compression: PDFs and images are already compressed. */
export async function zipFiles(files: OutputFile[], zipName: string): Promise<OutputFile> {
  const entries: Record<string, Uint8Array> = {}
  for (const f of files) entries[f.name] = await readBytes(f.blob)
  return { name: zipName, blob: toBlob(zipSync(entries, { level: 0 }), 'application/zip') }
}

/** Decode any browser-readable image (WebP, GIF, AVIF, BMP...) and re-encode it as PNG. */
export async function imageToPng(file: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Could not convert image')
  return readBytes(blob)
}

/** Bytes plus the type pdf-lib needs, converting anything that is not JPG or PNG to PNG. */
export async function imageForPdf(file: File): Promise<{ bytes: Uint8Array; type: 'jpg' | 'png' }> {
  if (file.type === 'image/jpeg') return { bytes: await readBytes(file), type: 'jpg' }
  if (file.type === 'image/png') return { bytes: await readBytes(file), type: 'png' }
  return { bytes: await imageToPng(file), type: 'png' }
}
