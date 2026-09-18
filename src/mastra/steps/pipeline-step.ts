import type { PipelineStep, ReelBase } from '../../lib/domain'

export type FailedReel = ReelBase & { status: 'failed'; failedStep: PipelineStep; reason: string }

function isFailedReel(input: unknown): input is FailedReel {
  return (
    typeof input === 'object' &&
    input !== null &&
    'status' in input &&
    (input as { status?: unknown }).status === 'failed'
  )
}

export async function runPipelineStep<TIn extends ReelBase, TOut>(
  stepName: PipelineStep,
  input: TIn | FailedReel,
  fn: (input: TIn) => Promise<TOut>,
): Promise<TOut | FailedReel> {
  if (isFailedReel(input)) {
    return input
  }

  try {
    return await fn(input)
  } catch (error) {
    return {
      ...input,
      status: 'failed',
      failedStep: stepName,
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}
