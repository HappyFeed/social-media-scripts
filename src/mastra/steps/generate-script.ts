import { reelScriptSchema, type ReelAnalysis } from '../../lib/domain'
import { SCRIPT_MODEL } from '../../lib/models'
import type { CompletionClient } from '../../lib/openrouter/completion'
import type { ActorProfile } from '../../lib/profiles'
import { buildScriptPrompt } from '../../lib/prompts'
import type { ReelForAnalysis } from './analyze'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface ReelForScript extends ReelForAnalysis {
  analysis: ReelAnalysis
}

export async function generateScript(
  input: ReelForScript | FailedReel,
  openrouter: Pick<CompletionClient, 'complete'>,
  profile: ActorProfile,
) {
  return runPipelineStep('generate-script', input, async (reel) => {
    const prompt = buildScriptPrompt({ analysis: reel.analysis, profile })
    try {
      const script = await openrouter.complete({
        model: SCRIPT_MODEL,
        prompt,
        schema: reelScriptSchema,
      })
      return { ...reel, script }
    } catch {
      throw new Error('invalid script response')
    }
  })
}
