export type FatalCode =
  | 'missing-ig-session'
  | 'missing-openrouter-key'
  | 'ffmpeg-unavailable'
  | 'unknown-actor'
  | 'account-not-found'
  | 'ig-session-expired'

export class FatalRunError extends Error {
  constructor(
    readonly code: FatalCode,
    message: string,
  ) {
    super(message)
    this.name = 'FatalRunError'
  }
}

export interface BinaryProbe {
  isAvailable(binary: string): Promise<boolean>
}

export async function assertPreconditions(
  env: { IG_SESSION_ID?: string; OPENROUTER_API_KEY?: string },
  probe: BinaryProbe,
): Promise<void> {
  if (!env.IG_SESSION_ID) {
    throw new FatalRunError('missing-ig-session', 'IG_SESSION_ID no está configurado')
  }
  if (!env.OPENROUTER_API_KEY) {
    throw new FatalRunError('missing-openrouter-key', 'OPENROUTER_API_KEY no está configurado')
  }
  if (!(await probe.isAvailable('ffmpeg'))) {
    throw new FatalRunError('ffmpeg-unavailable', 'ffmpeg no está disponible en el PATH')
  }
}
