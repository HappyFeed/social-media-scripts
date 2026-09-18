import type { ReelBase } from '../../lib/domain'
import type { InstagramClient } from '../../lib/instagram/client'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface ReelToHydrate extends ReelBase {
  mediaId: string
}

export async function hydrate(
  input: ReelToHydrate | FailedReel,
  instagram: Pick<InstagramClient, 'hydrateReel'>,
) {
  return runPipelineStep('hydrate', input, async (reel) => {
    const hydrated = await instagram.hydrateReel(reel.mediaId)
    return { ...reel, ...hydrated }
  })
}
