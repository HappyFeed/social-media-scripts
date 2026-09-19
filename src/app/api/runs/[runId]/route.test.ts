import { describe, expect, test, vi } from 'vitest'
import type { RunView } from '../../../../lib/domain'
import { createGetHandler } from './route'

function buildParams(runId: string) {
  return { params: Promise.resolve({ runId }) }
}

describe('GET /api/runs/[runId]', () => {
  test('un runId con snapshot persistido responde 200 con el RunView esperado', async () => {
    const runView: RunView = {
      runId: 'run-1',
      account: 'north.star',
      actor: 'juanse',
      status: 'completed',
      reels: [],
    }
    const loadRunView = vi.fn().mockResolvedValue(runView)
    const GET = createGetHandler(loadRunView)

    const response = await GET(new Request('http://localhost/api/runs/run-1'), buildParams('run-1'))

    expect(loadRunView).toHaveBeenCalledWith('run-1')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(runView)
  })

  test('un runId sin snapshot responde 404 { error: "run not found" }', async () => {
    const loadRunView = vi.fn().mockResolvedValue(null)
    const GET = createGetHandler(loadRunView)

    const response = await GET(new Request('http://localhost/api/runs/unknown'), buildParams('unknown'))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'run not found' })
  })
})
