import { describe, expect, test, vi } from 'vitest'
import type { ReelBase } from '../../lib/domain'
import { hydrate } from './hydrate'

const reel: ReelBase & { mediaId: string } = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
}

describe('mastra/steps hydrate', () => {
  test('un reel sano termina con caption/videoUrl/durationSeconds adjuntos', async () => {
    const hydrateReel = vi.fn().mockResolvedValue({
      caption: 'una caption',
      videoUrl: 'https://cdn.example.com/video.mp4',
      durationSeconds: 30,
    })

    const result = await hydrate(reel, { hydrateReel })

    expect(hydrateReel).toHaveBeenCalledWith('media-1')
    expect(result).toEqual({
      ...reel,
      caption: 'una caption',
      videoUrl: 'https://cdn.example.com/video.mp4',
      durationSeconds: 30,
    })
  })

  test('un hydrateReel que rechaza produce failed en el step hydrate', async () => {
    const hydrateReel = vi.fn().mockRejectedValue(new Error('sesión inválida'))

    const result = await hydrate(reel, { hydrateReel })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'hydrate',
      reason: 'sesión inválida',
    })
  })
})
