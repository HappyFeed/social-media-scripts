import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { FatalRunError } from './preflight'

export interface ActorProfile {
  name: string
  markdown: string
}

export async function listActors(dir: string): Promise<string[]> {
  const entries = await readdir(dir)
  return entries.filter((entry) => entry.endsWith('.md')).map((entry) => entry.slice(0, -3))
}

export async function loadActorProfile(dir: string, name: string): Promise<ActorProfile> {
  try {
    const markdown = await readFile(join(dir, `${name}.md`), 'utf-8')
    return { name, markdown }
  } catch {
    throw new FatalRunError('unknown-actor', `No existe un perfil para el actor "${name}"`)
  }
}
