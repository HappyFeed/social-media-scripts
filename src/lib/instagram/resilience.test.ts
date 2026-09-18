import { describe, expect, test, vi } from 'vitest'
import { SessionExpiredError, withInstagramRetry } from './resilience'

function httpError(status: number) {
  const error = new Error(`request failed with status ${status}`)
  ;(error as any).response = { status }
  return error
}

describe('lib/instagram withInstagramRetry', () => {
  test('un transporte que devuelve 403 rechaza con SessionExpiredError sin reintentar', async () => {
    const transport = vi.fn().mockRejectedValue(httpError(403))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(
      withInstagramRetry(transport, { attempts: 3, baseDelayMs: 100 }, sleep),
    ).rejects.toBeInstanceOf(SessionExpiredError)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  test('un transporte que falla dos veces (500) y luego resuelve, resuelve tras reintentar con delays crecientes', async () => {
    const transport = vi
      .fn()
      .mockRejectedValueOnce(httpError(500))
      .mockRejectedValueOnce(httpError(500))
      .mockResolvedValueOnce('ok')
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await withInstagramRetry(transport, { attempts: 3, baseDelayMs: 100 }, sleep)

    expect(result).toBe('ok')
    expect(transport).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([100, 200])
  })

  test('un transporte que siempre falla rechaza tras agotar los intentos configurados', async () => {
    const failure = httpError(500)
    const transport = vi.fn().mockRejectedValue(failure)
    const sleep = vi.fn().mockResolvedValue(undefined)

    await expect(withInstagramRetry(transport, { attempts: 3, baseDelayMs: 100 }, sleep)).rejects.toBe(
      failure,
    )
    expect(transport).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([100, 200])
  })
})
