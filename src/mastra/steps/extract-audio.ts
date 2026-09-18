import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AudioExtractor } from '../../lib/media'
import type { HydratedReelForDownload } from './download-video'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface DownloadedReelForAudio extends HydratedReelForDownload {
  videoPath: string
}

export async function extractAudio(
  input: DownloadedReelForAudio | FailedReel,
  media: Pick<AudioExtractor, 'extractAudio'>,
) {
  return runPipelineStep('extract-audio', input, async (reel) => {
    const audioDestPath = join(tmpdir(), `${reel.mediaId}.mp3`)
    const { path: audioPath, sizeBytes } = await media.extractAudio(reel.videoPath, audioDestPath)
    return { ...reel, audioPath, sizeBytes }
  })
}
