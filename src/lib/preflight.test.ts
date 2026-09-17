import { describe, expect, test } from 'vitest'
import { assertPreconditions, FatalRunError, type BinaryProbe } from './preflight'

function fakeProbe(available: boolean): BinaryProbe {
  return { isAvailable: async () => available }
}

describe('assertPreconditions', () => {
  test('falta IG_SESSION_ID rechaza con missing-ig-session', async () => {
    await expect(
      assertPreconditions({ OPENROUTER_API_KEY: 'key' }, fakeProbe(true)),
    ).rejects.toMatchObject({ code: 'missing-ig-session' } satisfies Partial<FatalRunError>)
  })

  test('falta OPENROUTER_API_KEY rechaza con missing-openrouter-key', async () => {
    await expect(
      assertPreconditions({ IG_SESSION_ID: 'session' }, fakeProbe(true)),
    ).rejects.toMatchObject({ code: 'missing-openrouter-key' })
  })

  test('ffmpeg no disponible rechaza con ffmpeg-unavailable', async () => {
    await expect(
      assertPreconditions(
        { IG_SESSION_ID: 'session', OPENROUTER_API_KEY: 'key' },
        fakeProbe(false),
      ),
    ).rejects.toMatchObject({ code: 'ffmpeg-unavailable' })
  })

  test('todo presente y probe disponible resuelve', async () => {
    await expect(
      assertPreconditions(
        { IG_SESSION_ID: 'session', OPENROUTER_API_KEY: 'key' },
        fakeProbe(true),
      ),
    ).resolves.toBeUndefined()
  })

  test('el rechazo es una instancia de FatalRunError', async () => {
    await expect(
      assertPreconditions({}, fakeProbe(true)),
    ).rejects.toBeInstanceOf(FatalRunError)
  })
})
