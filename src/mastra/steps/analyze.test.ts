import { describe, expect, test, vi } from 'vitest'
import { ANALYSIS_MODEL } from '../../lib/models'
import { analyze, type ReelForAnalysis } from './analyze'

const reel: ReelForAnalysis = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
  caption: 'una caption con contexto',
  videoUrl: 'https://cdn.example.com/video.mp4',
  durationSeconds: 30,
  videoPath: '/tmp/media-1.mp4',
  audioPath: '/tmp/media-1.mp3',
  sizeBytes: 12345,
  transcript: 'texto transcripto del reel',
}

const analysis = {
  objective: 'entretener',
  highlights: ['punto 1'],
  targetAudience: 'creadores de contenido',
}

describe('mastra/steps analyze', () => {
  test('éxito adjunta un ReelAnalysis construido a partir de transcript+caption', async () => {
    const complete = vi.fn().mockResolvedValue(analysis)

    const result = await analyze(reel, { complete })

    expect(complete).toHaveBeenCalledTimes(1)
    const args = complete.mock.calls[0]?.[0]
    expect(args.model).toBe(ANALYSIS_MODEL)
    expect(args.prompt).toContain('texto transcripto del reel')
    expect(args.prompt).toContain('una caption con contexto')
    expect(result).toEqual({ ...reel, analysis })
  })

  test('un cliente que rechaza produce failed en analyze con motivo "invalid analysis response"', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('no cumple el schema'))

    const result = await analyze(reel, { complete })

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'analyze',
      reason: 'invalid analysis response',
    })
  })
})
