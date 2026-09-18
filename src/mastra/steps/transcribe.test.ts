import { describe, expect, test, vi } from 'vitest'
import { AudioTooLargeError } from '../../lib/openrouter/transcription'
import { transcribe, type ReelForTranscription } from './transcribe'

const reel: ReelForTranscription = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
  caption: 'una caption',
  videoUrl: 'https://cdn.example.com/video.mp4',
  durationSeconds: 30,
  videoPath: '/tmp/media-1.mp4',
  audioPath: '/tmp/media-1.mp3',
  sizeBytes: 12345,
}

describe('mastra/steps transcribe', () => {
  test('éxito adjunta el transcript', async () => {
    const doTranscribe = vi.fn().mockResolvedValue('texto transcripto')

    const result = await transcribe(reel, { transcribe: doTranscribe })

    expect(doTranscribe).toHaveBeenCalledWith('/tmp/media-1.mp3', 12345)
    expect(result).toEqual({ ...reel, transcript: 'texto transcripto' })
  })

  test('AudioTooLargeError produce failed en extract-audio con motivo "audio too large"', async () => {
    const doTranscribe = vi.fn().mockRejectedValue(new AudioTooLargeError(999, 100))

    const result = await transcribe(reel, { transcribe: doTranscribe })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'extract-audio',
      reason: 'audio too large',
    })
  })

  test('otro rechazo produce failed en el step transcribe', async () => {
    const doTranscribe = vi.fn().mockRejectedValue(new Error('endpoint caído'))

    const result = await transcribe(reel, { transcribe: doTranscribe })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'transcribe',
      reason: 'endpoint caído',
    })
  })
})
