import { NextResponse } from 'next/server'
import type { RunView } from '../../../../lib/domain'
import { mastra } from '../../../../mastra'
import { toRunView, type RunSnapshotLike } from '../../../../mastra/run-view'

export function createGetHandler(loadRunView: (runId: string) => Promise<RunView | null>) {
  return async function GET(
    _request: Request,
    { params }: { params: Promise<{ runId: string }> },
  ): Promise<Response> {
    const { runId } = await params
    const runView = await loadRunView(runId)

    if (!runView) {
      return NextResponse.json({ error: 'run not found' }, { status: 404 })
    }

    return NextResponse.json(runView, { status: 200 })
  }
}

async function loadGenerateScriptsRunView(runId: string): Promise<RunView | null> {
  const storage = mastra.getStorage()
  if (!storage) return null

  const workflows = await storage.getStore('workflows')
  if (!workflows) return null

  const outer = await workflows.loadWorkflowSnapshot({
    workflowName: 'generateScriptsWorkflow',
    runId,
  })
  if (!outer) return null

  const { runs } = await workflows.listWorkflowRuns({
    workflowName: 'processReelWorkflow',
    resourceId: runId,
  })

  return toRunView({
    runId,
    outer: parseSnapshot(outer),
    reelRuns: runs.map((run) => parseSnapshot(run.snapshot)),
  })
}

function parseSnapshot(snapshot: unknown): RunSnapshotLike {
  const parsed = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot
  return parsed as RunSnapshotLike
}

export const GET = createGetHandler(loadGenerateScriptsRunView)
