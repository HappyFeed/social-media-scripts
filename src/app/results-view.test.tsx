// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import type { RunView } from '../lib/domain'
import { ResultsView } from './results-view'

afterEach(() => {
  cleanup()
})

describe('app/results-view ResultsView', () => {
  test('cada reel pending muestra su currentStep', () => {
    const run: RunView = {
      runId: 'run-1',
      account: 'north.star',
      actor: 'juanse',
      status: 'running',
      reels: [
        {
          rank: 1,
          shortcode: 'r1',
          thumbnailUrl: 'https://cdn.example.com/r1.jpg',
          metrics: { views: 100, likes: 10, comments: 1 },
          status: 'pending',
          currentStep: 'transcribe',
        },
        {
          rank: 2,
          shortcode: 'r2',
          thumbnailUrl: 'https://cdn.example.com/r2.jpg',
          metrics: { views: 200, likes: 20, comments: 2 },
          status: 'pending',
          currentStep: 'hydrate',
        },
      ],
    }

    render(<ResultsView run={run} />)

    expect(screen.getByText('transcribe')).toBeTruthy()
    expect(screen.getByText('hydrate')).toBeTruthy()
  })

  test('un reel ok muestra rank/métricas/análisis/script, y un reel failed muestra su motivo sin análisis ni script', () => {
    const run: RunView = {
      runId: 'run-1',
      account: 'north.star',
      actor: 'juanse',
      status: 'completed',
      reels: [
        {
          rank: 1,
          shortcode: 'r1',
          thumbnailUrl: 'https://cdn.example.com/r1.jpg',
          metrics: { views: 100, likes: 10, comments: 1 },
          status: 'ok',
          analysis: { objective: 'entretener', highlights: ['punto 1'], targetAudience: 'creadores' },
          script: { hook: 'un hook', body: 'un body', closing: 'un closing' },
        },
        {
          rank: 2,
          shortcode: 'r2',
          thumbnailUrl: 'https://cdn.example.com/r2.jpg',
          metrics: { views: 200, likes: 20, comments: 2 },
          status: 'failed',
          failedStep: 'download',
          reason: 'video not available (404)',
        },
      ],
    }

    render(<ResultsView run={run} />)

    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('un hook')).toBeTruthy()
    expect(screen.getByText('un body')).toBeTruthy()
    expect(screen.getByText('un closing')).toBeTruthy()
    expect(screen.getByText('entretener')).toBeTruthy()

    expect(screen.getByText('video not available (404)')).toBeTruthy()
    expect(screen.queryByText('un hook', { selector: '[data-reel="r2"] *' })).toBeNull()
  })
})
