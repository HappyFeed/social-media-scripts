import { describe, expect, test, vi } from 'vitest'
import type { RunInput } from '../../../lib/domain'
import { createPostHandler } from './route'

describe('POST /api/runs', () => {
  test('un body válido responde 201 con un runId antes de que el trabajo en background termine, con scan:20 agregado', async () => {
    let resolveBackground: () => void = () => {}
    const background = new Promise<void>((resolve) => {
      resolveBackground = resolve
    })
    let backgroundSettled = false
    void background.then(() => {
      backgroundSettled = true
    })

    const startRun = vi.fn().mockImplementation(async (_input: RunInput) => {
      // simula generateScriptsWorkflow.createRun() + startAsync() fire-and-forget:
      // el runId está disponible ya, pero el procesamiento real sigue en background.
      return { runId: 'run-123' }
    })

    const POST = createPostHandler(startRun)
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      body: JSON.stringify({ account: 'north.star', actor: 'juanse', top: 3 }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ runId: 'run-123' })
    expect(startRun).toHaveBeenCalledWith({ account: 'north.star', actor: 'juanse', top: 3, scan: 20 })
    expect(backgroundSettled).toBe(false)
    resolveBackground()
  })

  test.each([
    ['sin account', { actor: 'juanse', top: 3 }],
    ['sin actor', { account: 'north.star', top: 3 }],
    ['con top no entero', { account: 'north.star', actor: 'juanse', top: 1.5 }],
    ['con top negativo', { account: 'north.star', actor: 'juanse', top: -1 }],
    ['con top no numérico', { account: 'north.star', actor: 'juanse', top: '3' }],
  ])('un body inválido (%s) responde con un status de error sin invocar el arranque del workflow', async (_case, body) => {
    const startRun = vi.fn()
    const POST = createPostHandler(startRun)
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(startRun).not.toHaveBeenCalled()
  })
})
