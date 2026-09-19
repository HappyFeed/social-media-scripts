'use client'

import { useEffect, useState } from 'react'
import type { RunView } from '../lib/domain'
import { ResultsView } from './results-view'

const POLL_INTERVAL_MS = 2000

export function RunPolling({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunView | null>(null)

  useEffect(() => {
    let cancelled = false

    const timer = setInterval(async () => {
      const response = await fetch(`/api/runs/${runId}`)
      const data = (await response.json()) as RunView
      if (cancelled) return

      setRun(data)
      if (data.status !== 'running') {
        clearInterval(timer)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [runId])

  if (!run) return null
  return <ResultsView run={run} />
}
