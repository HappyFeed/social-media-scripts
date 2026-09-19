import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { FatalRunError } from '../../lib/preflight'
import { preflight } from './preflight'

describe('mastra/steps preflight', () => {
  let dir: string
  const okEnv = { IG_SESSION_ID: 'session', OPENROUTER_API_KEY: 'key' }
  const okProbe = { isAvailable: async () => true }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'preflight-actors-'))
    await writeFile(join(dir, 'juanse.md'), '# Juanse\n\nTono directo.')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('con env/probe satisfechos y un actor conocido, resuelve el ActorProfile cargado', async () => {
    const profile = await preflight(okEnv, okProbe, dir, 'juanse')

    expect(profile).toEqual({ name: 'juanse', markdown: '# Juanse\n\nTono directo.' })
  })

  test('una precondición faltante lanza el FatalRunError correspondiente', async () => {
    await expect(preflight({}, okProbe, dir, 'juanse')).rejects.toMatchObject({
      code: 'missing-ig-session',
    })
    await expect(preflight({}, okProbe, dir, 'juanse')).rejects.toBeInstanceOf(FatalRunError)
  })

  test('un actor desconocido lanza FatalRunError(unknown-actor)', async () => {
    await expect(preflight(okEnv, okProbe, dir, 'nadie')).rejects.toMatchObject({
      code: 'unknown-actor',
    })
  })
})
