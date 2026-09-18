import { reelAnalysisSchema } from '../../lib/domain'
import { ANALYSIS_MODEL } from '../../lib/models'
import type { CompletionClient } from '../../lib/openrouter/completion'
import { buildAnalysisPrompt } from '../../lib/prompts'
import type { ReelForTranscription } from './transcribe'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface ReelForAnalysis extends ReelForTranscription {
  transcript: string
}

export async function analyze(
  input: ReelForAnalysis | FailedReel,
  openrouter: Pick<CompletionClient, 'complete'>,
) {
  return runPipelineStep('analyze', input, async (reel) => {
    const prompt = buildAnalysisPrompt({ transcript: reel.transcript, caption: reel.caption })
    try {
      const analysis = await openrouter.complete({
        model: ANALYSIS_MODEL,
        prompt,
        schema: reelAnalysisSchema,
      })
      return { ...reel, analysis }
    } catch {
      throw new Error('invalid analysis response')
    }
  })
}
