import { describe, expect, test, vi } from 'vitest'
import { SCRIPT_MODEL } from '../../lib/models'
import { generateScript, type ReelForScript } from './generate-script'

const reel: ReelForScript = {
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
  analysis: {
    objective: 'entretener',
    highlights: ['punto 1'],
    targetAudience: 'creadores de contenido',
  },
}

const profile = { name: 'juanse', markdown: '# Juanse\n\nTono directo, sin vueltas.' }

const script = { hook: 'un hook', body: 'un body', closing: 'un closing' }

describe('mastra/steps generateScript', () => {
  test('éxito adjunta un ReelScript válido', async () => {
    const complete = vi.fn().mockResolvedValue(script)

    const result = await generateScript(reel, { complete }, profile)

    expect(complete).toHaveBeenCalledTimes(1)
    const args = complete.mock.calls[0]?.[0]
    expect(args.model).toBe(SCRIPT_MODEL)
    expect(args.prompt).toContain('Tono directo, sin vueltas.')
    expect(result).toEqual({ ...reel, script })
  })

  test('un cliente que rechaza produce failed en generate-script con motivo "invalid script response"', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('no cumple el schema'))

    const result = await generateScript(reel, { complete }, profile)

    expect(result).toEqual({
      ...reel,
      status: 'failed',
      failedStep: 'generate-script',
      reason: 'invalid script response',
    })
  })
})
