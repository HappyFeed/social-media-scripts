import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { listActors, loadActorProfile } from './profiles'
import { FatalRunError } from './preflight'

describe('lib/profiles', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'actors-'))
    await writeFile(join(dir, 'juanse.md'), '# Juanse\n\nTono directo, sin vueltas.')
    await writeFile(join(dir, 'maria.md'), '# Maria\n\nTono cercano.')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('listActors devuelve los nombres sin extensión .md', async () => {
    const actors = await listActors(dir)
    expect(actors.sort()).toEqual(['juanse', 'maria'])
  })

  test('loadActorProfile devuelve el markdown de un actor existente', async () => {
    const profile = await loadActorProfile(dir, 'juanse')
    expect(profile).toEqual({ name: 'juanse', markdown: '# Juanse\n\nTono directo, sin vueltas.' })
  })

  test('loadActorProfile de un actor inexistente rechaza con unknown-actor', async () => {
    await expect(loadActorProfile(dir, 'nadie')).rejects.toMatchObject({
      code: 'unknown-actor',
    })
    await expect(loadActorProfile(dir, 'nadie')).rejects.toBeInstanceOf(FatalRunError)
  })
})
