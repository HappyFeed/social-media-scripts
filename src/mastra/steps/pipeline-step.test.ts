import { describe, expect, test, vi } from 'vitest'
import type { ReelBase } from '../../lib/domain'
import { runPipelineStep } from './pipeline-step'

const baseReel: ReelBase = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
}

describe('mastra/steps runPipelineStep', () => {
  test('una función que lanza, dado un input sano, produce failed con el failedStep y reason esperados', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('algo salió mal'))

    const result = await runPipelineStep('hydrate', baseReel, fn)

    expect(result).toEqual({
      ...baseReel,
      status: 'failed',
      failedStep: 'hydrate',
      reason: 'algo salió mal',
    })
    expect(fn).toHaveBeenCalledWith(baseReel)
  })

  test('la misma función, dado un input ya failed, devuelve ese input sin invocar la función', async () => {
    const failedInput = {
      ...baseReel,
      status: 'failed' as const,
      failedStep: 'download' as const,
      reason: 'fallo previo',
    }
    const fn = vi.fn()

    const result = await runPipelineStep('hydrate', failedInput, fn)

    expect(result).toBe(failedInput)
    expect(fn).not.toHaveBeenCalled()
  })

  test('una función que resuelve, dado un input sano, devuelve el resultado tal cual', async () => {
    const fn = vi.fn().mockResolvedValue({ ...baseReel, caption: 'hola' })

    const result = await runPipelineStep('hydrate', baseReel, fn)

    expect(result).toEqual({ ...baseReel, caption: 'hola' })
  })
})
