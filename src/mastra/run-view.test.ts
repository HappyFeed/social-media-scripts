import { describe, expect, test } from 'vitest'
import { toRunView, type RunSnapshotLike } from './run-view'

const runInput = { account: 'north.star', actor: 'juanse', scan: 20, top: 3 }

function reelInput(rank: number) {
  return {
    rank,
    shortcode: `r${rank}`,
    thumbnailUrl: `https://cdn.example.com/r${rank}.jpg`,
    metrics: { views: 100, likes: 10, comments: 1 },
    mediaId: `media-${rank}`,
  }
}

describe('mastra/run-view toRunView', () => {
  test('un reel a mitad de pipeline mapea a un ReelView pending con currentStep', () => {
    const outer: RunSnapshotLike = { status: 'running', context: { input: runInput } }
    const reelRuns: RunSnapshotLike[] = [
      {
        status: 'running',
        context: {
          input: reelInput(1),
          hydrate: { status: 'success' },
          download: { status: 'success' },
          'extract-audio': { status: 'running' },
        },
      },
    ]

    const view = toRunView({ runId: 'run-1', outer, reelRuns })

    expect(view.reels).toEqual([
      {
        rank: 1,
        shortcode: 'r1',
        thumbnailUrl: 'https://cdn.example.com/r1.jpg',
        metrics: { views: 100, likes: 10, comments: 1 },
        status: 'pending',
        currentStep: 'extract-audio',
      },
    ])
  })

  test('un reel fallido mapea su reason', () => {
    const outer: RunSnapshotLike = { status: 'running', context: { input: runInput } }
    const reelRuns: RunSnapshotLike[] = [
      {
        status: 'success',
        context: { input: reelInput(1) },
        result: {
          rank: 1,
          shortcode: 'r1',
          thumbnailUrl: 'https://cdn.example.com/r1.jpg',
          metrics: { views: 100, likes: 10, comments: 1 },
          status: 'failed',
          failedStep: 'transcribe',
          reason: 'audio too large',
        },
      },
    ]

    const view = toRunView({ runId: 'run-1', outer, reelRuns })

    expect(view.reels).toEqual([
      {
        rank: 1,
        shortcode: 'r1',
        thumbnailUrl: 'https://cdn.example.com/r1.jpg',
        metrics: { views: 100, likes: 10, comments: 1 },
        status: 'failed',
        failedStep: 'transcribe',
        reason: 'audio too large',
      },
    ])
  })

  test('un run abortado mapea status aborted con error.code/message; error está ausente en cualquier otro caso', () => {
    const abortedOuter: RunSnapshotLike = {
      status: 'failed',
      context: { input: runInput },
      error: { code: 'account-not-found', message: 'La cuenta no tiene reels' },
    }
    const abortedView = toRunView({ runId: 'run-1', outer: abortedOuter, reelRuns: [] })
    expect(abortedView.status).toBe('aborted')
    expect(abortedView.error).toEqual({ code: 'account-not-found', message: 'La cuenta no tiene reels' })

    const runningOuter: RunSnapshotLike = { status: 'running', context: { input: runInput } }
    const runningView = toRunView({ runId: 'run-1', outer: runningOuter, reelRuns: [] })
    expect(runningView.status).toBe('running')
    expect(runningView.error).toBeUndefined()

    const completedOuter: RunSnapshotLike = {
      status: 'success',
      context: { input: runInput },
      result: {},
    }
    const completedView = toRunView({ runId: 'run-1', outer: completedOuter, reelRuns: [] })
    expect(completedView.status).toBe('completed')
    expect(completedView.error).toBeUndefined()
  })
})
