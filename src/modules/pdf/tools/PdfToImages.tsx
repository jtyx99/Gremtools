import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, readBytes, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import { Choice, OptionsCard, PDF_ACCEPT, PdfToolShell } from './shared'

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'png' | 'jpg'>('jpg')
  const [dpi, setDpi] = useState('150')
  const { state, run, reset } = useRun()

  const convert = () =>
    run(async (setProgress) => {
      const pages = await runPdf('pdfToImages', { bytes: await readBytes(file!), options: { format, dpi: Number(dpi), quality: 88 } }, setProgress)
      const base = baseName(file!.name)
      const pad = String(pages.length).length
      return {
        outputs: pages.map((bytes, i) => ({
          name: `${base}-${String(i + 1).padStart(pad, '0')}.${format}`,
          blob: toBlob(bytes, format === 'png' ? 'image/png' : 'image/jpeg'),
        })),
      }
    })

  return (
    <PdfToolShell id="pdf-to-images" run={state} zipName={file ? `${baseName(file.name)}-images.zip` : undefined} onReset={() => { setFile(null); reset() }}>
      {!file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => setFile(f[0])} />
      ) : (
        <>
          <ChosenFile file={file} onClear={() => setFile(null)} />
          <OptionsCard action="Convert to images" onRun={convert}>
            <div>
              <Choice label="Format" value={format} onChange={setFormat} options={[{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }]} />
              <p className="hint">{format === 'jpg' ? 'Smaller files. Best for photos and scans.' : 'Sharper text and lines. Larger files.'}</p>
            </div>
            <div>
              <Choice
                label="Quality"
                value={dpi}
                onChange={setDpi}
                options={[{ value: '72', label: 'Screen' }, { value: '150', label: 'Sharing' }, { value: '300', label: 'Print' }]}
              />
              <p className="hint">{dpi} dots per inch. Higher takes longer and makes larger images.</p>
            </div>
          </OptionsCard>
        </>
      )}
    </PdfToolShell>
  )
}
