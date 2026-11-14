import { useCallback, useState } from 'react'
import type { OutputFile } from './files'

export type RunStatus = 'idle' | 'working' | 'done' | 'error'

export interface RunState {
  status: RunStatus
  /** 0 to 1 when known. */
  progress?: number
  error?: string
  outputs: OutputFile[]
  /** Short line shown above the downloads, e.g. the size saved. */
  note?: string
}

export interface RunResult {
  outputs: OutputFile[]
  note?: string
}

/** Holds the state of one tool run: working, then downloads or an error. */
export function useRun() {
  const [state, setState] = useState<RunState>({ status: 'idle', outputs: [] })

  const run = useCallback(async (job: (setProgress: (p: number) => void) => Promise<RunResult>) => {
    setState({ status: 'working', outputs: [] })
    try {
      const result = await job((progress) => setState((s) => (s.status === 'working' ? { ...s, progress } : s)))
      setState({ status: 'done', ...result })
    } catch (err) {
      console.error(err)
      const known = err instanceof Error && err.name === 'PdfToolError'
      setState({
        status: 'error',
        outputs: [],
        error: known ? (err as Error).message : 'Something went wrong while processing this file. Nothing was changed. Try again, or try a different file.',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle', outputs: [] }), [])
  return { state, run, reset }
}
