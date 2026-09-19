import type { PipelineStep, ReelBase, ReelOutcome, ReelView, RunView } from '../lib/domain'
import type { FatalCode } from '../lib/preflight'

const PIPELINE_STEPS: PipelineStep[] = [
  'hydrate',
  'download',
  'extract-audio',
  'transcribe',
  'analyze',
  'generate-script',
]

interface StepEntry {
  status: string
}

/**
 * Forma mínima de un `WorkflowRunState` de Mastra que `toRunView` necesita
 * leer, tanto del run principal (`generateScriptsWorkflow`) como de cada
 * sub-run por reel (`processReelWorkflow`, correlacionados por `resourceId`).
 */
export interface RunSnapshotLike {
  status: string
  context: Record<string, unknown>
  result?: unknown
  error?: { code: FatalCode; message: string }
}

export interface RunViewBundle {
  runId: string
  outer: RunSnapshotLike
  reelRuns: RunSnapshotLike[]
}

export function toRunView({ runId, outer, reelRuns }: RunViewBundle): RunView {
  const input = outer.context.input as { account: string; actor: string }
  const reels = reelRuns.map(toReelView)

  if (outer.status === 'failed') {
    const error = outer.error as { code: FatalCode; message: string }
    return {
      runId,
      account: input.account,
      actor: input.actor,
      status: 'aborted',
      error: { code: error.code, message: error.message },
      reels,
    }
  }

  return {
    runId,
    account: input.account,
    actor: input.actor,
    status: outer.status === 'success' ? 'completed' : 'running',
    reels,
  }
}

function toReelView(reelRun: RunSnapshotLike): ReelView {
  if (reelRun.status === 'success') {
    return reelRun.result as ReelOutcome
  }

  const base = reelRun.context.input as ReelBase
  return {
    rank: base.rank,
    shortcode: base.shortcode,
    thumbnailUrl: base.thumbnailUrl,
    metrics: base.metrics,
    status: 'pending',
    currentStep: findCurrentStep(reelRun),
  }
}

function findCurrentStep(reelRun: RunSnapshotLike): PipelineStep {
  for (const step of PIPELINE_STEPS) {
    const entry = reelRun.context[step] as StepEntry | undefined
    if (!entry || entry.status !== 'success') {
      return step
    }
  }
  return PIPELINE_STEPS[PIPELINE_STEPS.length - 1] as PipelineStep
}
