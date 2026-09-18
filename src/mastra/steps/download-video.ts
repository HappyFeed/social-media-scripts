import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ReelBase } from '../../lib/domain'
import type { InstagramClient } from '../../lib/instagram/client'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface HydratedReelForDownload extends ReelBase {
  mediaId: string
  caption: string
  videoUrl: string
  durationSeconds: number
}

export async function downloadVideo(
  input: HydratedReelForDownload | FailedReel,
  instagram: Pick<InstagramClient, 'downloadVideo'>,
) {
  return runPipelineStep('download', input, async (reel) => {
    const videoPath = join(tmpdir(), `${reel.mediaId}.mp4`)
    await instagram.downloadVideo(reel.videoUrl, videoPath)
    return { ...reel, videoPath }
  })
}
