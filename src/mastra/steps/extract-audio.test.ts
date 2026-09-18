import { describe, expect, test, vi } from 'vitest'
import { extractAudio, type DownloadedReelForAudio } from './extract-audio'

const reel: DownloadedReelForAudio = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
  caption: 'una caption',
  videoUrl: 'https://cdn.example.com/video.mp4',
  durationSeconds: 30,
  videoPath: '/tmp/media-1.mp4',
}

describe('mastra/steps extractAudio', () => {
  test('éxito adjunta audioPath y sizeBytes', async () => {
    const extract = vi.fn().mockResolvedValue({ path: '/tmp/media-1.mp3', sizeBytes: 12345 })

    const result = await extractAudio(reel, { extractAudio: extract })

    expect(extract).toHaveBeenCalledWith('/tmp/media-1.mp4', expect.stringContaining('media-1'))
    expect(result).toEqual({ ...reel, audioPath: '/tmp/media-1.mp3', sizeBytes: 12345 })
  })

  test('un rechazo produce failed en el step extract-audio', async () => {
    const extract = vi.fn().mockRejectedValue(new Error('ffmpeg terminó con código 1'))

    const result = await extractAudio(reel, { extractAudio: extract })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'extract-audio',
      reason: 'ffmpeg terminó con código 1',
    })
  })
})
