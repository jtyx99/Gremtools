import { useState } from 'react'
import { Dropzone } from '../../../shared/Dropzone'
import { ChosenFile } from '../../../shared/ToolShell'
import { baseName, formatSize, readBytes, toBlob } from '../../../shared/files'
import { useRun } from '../../../shared/useRun'
import { runPdf } from '../client'
import type { CompressLevel } from '../engines/mupdf'
import { Choice, OptionsCard, PDF_ACCEPT, PDF_TYPE, PdfToolShell } from './shared'

const HINTS: Record<CompressLevel, string> = {
  light: 'Images stay sharp enough for printing. Smallest saving.',
  balanced: 'Good for email and screens. Images look fine at normal zoom.',
  strong: 'Smallest file. Images get visibly softer when zoomed in.',
}

export default function Compress() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressLevel>('balanced')
  const { state, run, reset } = useRun()

  const compress = () =>
    run(async () => {
      const src = await readBytes(file!)
      const { bytes } = await runPdf('compress', { bytes: src, level })
      // Never hand back a bigger file than the one we were given.
      if (bytes.length >= src.length) {
        return {
          outputs: [{ name: file!.name, blob: toBlob(src, PDF_TYPE) }],
          note: `This PDF is already as small as Ling can make it (${formatSize(src.length)}). Here is the original, unchanged.`,
        }
      }
      const saved = Math.round((1 - bytes.length / src.length) * 100)
      return {
        outputs: [{ name: `${baseName(file!.name)}-compressed.pdf`, blob: toBlob(bytes, PDF_TYPE) }],
        note: `${formatSize(src.length)} → ${formatSize(bytes.length)} (${saved}% smaller)`,
      }
    })

  return (
    <PdfToolShell id="compress" run={state} onReset={() => { setFile(null); reset() }}>
      {!file ? (
        <Dropzone accept={PDF_ACCEPT} noun="a PDF file" onFiles={(f) => setFile(f[0])} />
      ) : (
        <>
          <ChosenFile file={file} onClear={() => setFile(null)} />
          <OptionsCard action="Compress PDF" onRun={compress}>
            <div className="sm:col-span-2">
              <Choice
                label="Compression"
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'strong', label: 'Strong' },
                ]}
              />
              <p className="hint">{HINTS[level]} Text is never blurred; PDFs with few images shrink less.</p>
            </div>
          </OptionsCard>
        </>
      )}
    </PdfToolShell>
  )
}
