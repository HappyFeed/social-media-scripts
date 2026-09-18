import { AudioTooLargeError, type TranscriptionClient } from '../../lib/openrouter/transcription'
import type { DownloadedReelForAudio } from './extract-audio'
import { runPipelineStep, type FailedReel } from './pipeline-step'

export interface ReelForTranscription extends DownloadedReelForAudio {
  audioPath: string
  sizeBytes: number
}

interface AudioTooLargeMarker extends ReelForTranscription {
  audioTooLarge: true
}

function isAudioTooLargeMarker(value: unknown): value is AudioTooLargeMarker {
  return typeof value === 'object' && value !== null && 'audioTooLarge' in value
}

export async function transcribe(
  input: ReelForTranscription | FailedReel,
  openrouter: Pick<TranscriptionClient, 'transcribe'>,
) {
  const result = await runPipelineStep('transcribe', input, async (reel) => {
    try {
      const transcript = await openrouter.transcribe(reel.audioPath, reel.sizeBytes)
      return { ...reel, transcript }
    } catch (error) {
      if (error instanceof AudioTooLargeError) {
        return { ...reel, audioTooLarge: true as const }
      }
      throw error
    }
  })

  if (isAudioTooLargeMarker(result)) {
    const { audioTooLarge: _marker, ...reel } = result
    return {
      ...reel,
      status: 'failed' as const,
      failedStep: 'extract-audio' as const,
      reason: 'audio too large',
    }
  }

  return result
}
