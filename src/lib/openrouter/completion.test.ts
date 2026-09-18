import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'
import { createCompletionClient } from './completion'

const schema = z.object({ ok: z.literal(true) })

describe('lib/openrouter createCompletionClient', () => {
  test('un provider fake que devuelve un payload inválido y luego uno válido resuelve tras exactamente un reintento', async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true })
    const client = createCompletionClient({ apiKey: 'key-123' }, { generate })

    const result = await client.complete({ model: 'test-model', prompt: 'prompt', schema })

    expect(result).toEqual({ ok: true })
    expect(generate).toHaveBeenCalledTimes(2)
  })

  test('un provider que devuelve inválido dos veces seguidas rechaza tras ese único reintento', async () => {
    const generate = vi.fn().mockResolvedValue({ ok: false })
    const client = createCompletionClient({ apiKey: 'key-123' }, { generate })

    await expect(
      client.complete({ model: 'test-model', prompt: 'prompt', schema }),
    ).rejects.toThrow()
    expect(generate).toHaveBeenCalledTimes(2)
  })

  test('un provider que devuelve válido de entrada resuelve sin reintentar', async () => {
    const generate = vi.fn().mockResolvedValue({ ok: true })
    const client = createCompletionClient({ apiKey: 'key-123' }, { generate })

    const result = await client.complete({ model: 'test-model', prompt: 'prompt', schema })

    expect(result).toEqual({ ok: true })
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
