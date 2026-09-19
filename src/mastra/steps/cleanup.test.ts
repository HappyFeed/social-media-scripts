import { describe, expect, test, vi } from 'vitest'
import { cleanup } from './cleanup'

describe('mastra/steps cleanup', () => {
  test('un reel con videoPath/audioPath seteados termina con ambos archivos borrados y el mismo outcome devuelto', async () => {
    const unlink = vi.fn().mockResolvedValue(undefined)
    const outcome = {
      status: 'ok' as const,
      videoPath: '/tmp/media-1.mp4',
      audioPath: '/tmp/media-1.mp3',
      script: { hook: 'h', body: 'b', closing: 'c' },
    }

    const result = await cleanup(outcome, { unlink })

    expect(unlink).toHaveBeenCalledWith('/tmp/media-1.mp4')
    expect(unlink).toHaveBeenCalledWith('/tmp/media-1.mp3')
    expect(unlink).toHaveBeenCalledTimes(2)
    expect(result).toBe(outcome)
  })

  test('un reel al que le falta uno de los dos paths no intenta borrar el que no existe', async () => {
    const unlink = vi.fn().mockResolvedValue(undefined)
    const outcome = {
      status: 'failed' as const,
      failedStep: 'download' as const,
      reason: '404',
      videoPath: undefined,
      audioPath: undefined,
    }

    const result = await cleanup(outcome, { unlink })

    expect(unlink).not.toHaveBeenCalled()
    expect(result).toBe(outcome)
  })
})
