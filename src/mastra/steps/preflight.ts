import { assertPreconditions, type BinaryProbe } from '../../lib/preflight'
import { loadActorProfile, type ActorProfile } from '../../lib/profiles'

export async function preflight(
  env: { IG_SESSION_ID?: string; OPENROUTER_API_KEY?: string },
  probe: BinaryProbe,
  actorsDir: string,
  actor: string,
): Promise<ActorProfile> {
  await assertPreconditions(env, probe)
  return loadActorProfile(actorsDir, actor)
}
