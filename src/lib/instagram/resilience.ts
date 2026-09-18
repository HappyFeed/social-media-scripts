export class SessionExpiredError extends Error {
  constructor(message = 'La sesión de Instagram expiró') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

export interface RetryOptions {
  attempts: number
  baseDelayMs: number
}

export const DEFAULT_RETRY: RetryOptions = { attempts: 3, baseDelayMs: 500 }

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isHttpForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  )
}

export async function withInstagramRetry<T>(
  fn: () => Promise<T>,
  retry: RetryOptions = DEFAULT_RETRY,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < retry.attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (isHttpForbidden(error)) {
        throw new SessionExpiredError()
      }
      lastError = error
      if (attempt < retry.attempts - 1) {
        await sleep(retry.baseDelayMs * 2 ** attempt)
      }
    }
  }

  throw lastError
}
