// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RunView } from '../lib/domain'
import { RunPolling } from './run-polling'

function runView(overrides: Partial<RunView> = {}): RunView {
  return {
    runId: 'run-1',
    account: 'north.star',
    actor: 'juanse',
    status: 'running',
    reels: [],
    ...overrides,
  }
}

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('app/run-polling RunPolling', () => {
  test('cada avance de ~2s dispara exactamente un pedido más a GET /api/runs/:runId mientras el run está running', async () => {
    fetchMock.mockResolvedValue({ json: async () => runView({ status: 'running' }) })

    render(<RunPolling runId="run-1" />)

    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/runs/run-1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test('en cuanto el RunView deja de ser running, ningún avance de tiempo posterior dispara un nuevo pedido', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => runView({ status: 'running' }) })
      .mockResolvedValueOnce({ json: async () => runView({ status: 'completed' }) })

    render(<RunPolling runId="run-1" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('re-renderiza ResultsView con la respuesta más reciente', async () => {
    fetchMock.mockResolvedValue({
      json: async () =>
        runView({
          status: 'completed',
          reels: [
            {
              rank: 1,
              shortcode: 'r1',
              thumbnailUrl: 'https://cdn.example.com/r1.jpg',
              metrics: { views: 1, likes: 1, comments: 1 },
              status: 'ok',
              analysis: { objective: 'obj', highlights: ['h'], targetAudience: 'aud' },
              script: { hook: 'un hook único', body: 'b', closing: 'c' },
            },
          ],
        }),
    })

    render(<RunPolling runId="run-1" />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(screen.getByText('un hook único')).toBeTruthy()
  })
})
