import { RequestContext } from '@mastra/core/request-context'
import { describe, expect, test, vi } from 'vitest'
import type { ReelToHydrate } from '../steps/hydrate'
import { PROCESS_REEL_DEPS_KEY, processReelWorkflow, type ProcessReelDeps } from './process-reel'

const baseReel: ReelToHydrate = {
  rank: 1,
  shortcode: 'abc123',
  thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
  metrics: { views: 100, likes: 10, comments: 1 },
  mediaId: 'media-1',
}

function buildDeps(): ProcessReelDeps {
  return {
    instagram: {
      hydrateReel: vi.fn().mockResolvedValue({
        caption: 'una caption',
        videoUrl: 'https://cdn.example.com/video.mp4',
        durationSeconds: 30,
      }),
      downloadVideo: vi.fn().mockResolvedValue(undefined),
    },
    media: {
      extractAudio: vi.fn().mockResolvedValue({ path: '/tmp/media-1.mp3', sizeBytes: 12345 }),
    },
    transcription: {
      transcribe: vi.fn().mockResolvedValue('texto transcripto'),
    },
    completion: {
      complete: vi
        .fn()
        .mockResolvedValueOnce({ objective: 'o', highlights: ['h'], targetAudience: 't' })
        .mockResolvedValueOnce({ hook: 'h', body: 'b', closing: 'c' }),
    },
    fs: { unlink: vi.fn().mockResolvedValue(undefined) },
    profile: { name: 'juanse', markdown: '# Juanse' },
  }
}

async function runWorkflow(deps: ProcessReelDeps, inputData: ReelToHydrate = baseReel) {
  const requestContext = new RequestContext()
  requestContext.setRaw(PROCESS_REEL_DEPS_KEY, deps)
  const run = await processReelWorkflow.createRun()
  return run.start({ inputData, requestContext })
}

describe('mastra/workflows processReelWorkflow', () => {
  test('happy path con adapters fake exitosos produce status ok con análisis y script', async () => {
    const deps = buildDeps()

    const result = await runWorkflow(deps)

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('esperaba success')
    expect(result.result).toEqual({
      rank: 1,
      shortcode: 'abc123',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      metrics: { views: 100, likes: 10, comments: 1 },
      status: 'ok',
      analysis: { objective: 'o', highlights: ['h'], targetAudience: 't' },
      script: { hook: 'h', body: 'b', closing: 'c' },
    })
    expect(deps.fs.unlink).toHaveBeenCalledWith(expect.stringContaining('media-1.mp4'))
    expect(deps.fs.unlink).toHaveBeenCalledWith(expect.stringContaining('media-1.mp3'))
  })

  test.each([
    ['hydrate', (deps: ProcessReelDeps) => (deps.instagram.hydrateReel = vi.fn().mockRejectedValue(new Error('x')))],
    ['download', (deps: ProcessReelDeps) => (deps.instagram.downloadVideo = vi.fn().mockRejectedValue(new Error('x')))],
    ['extract-audio', (deps: ProcessReelDeps) => (deps.media.extractAudio = vi.fn().mockRejectedValue(new Error('x')))],
    ['transcribe', (deps: ProcessReelDeps) => (deps.transcription.transcribe = vi.fn().mockRejectedValue(new Error('x')))],
    ['analyze', (deps: ProcessReelDeps) => (deps.completion.complete = vi.fn().mockRejectedValue(new Error('x')))],
    [
      'generate-script',
      (deps: ProcessReelDeps) =>
        (deps.completion.complete = vi
          .fn()
          .mockResolvedValueOnce({ objective: 'o', highlights: ['h'], targetAudience: 't' })
          .mockRejectedValueOnce(new Error('x'))),
    ],
  ])('una falla en %s produce el ReelOutcome failed correspondiente y ningún step posterior corre trabajo real', async (stepName, breakStep) => {
    const deps = buildDeps()
    breakStep(deps)

    const result = await runWorkflow(deps)

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('esperaba success')
    expect(result.result).toMatchObject({ status: 'failed', failedStep: stepName })

    const stepsOrder = ['hydrate', 'download', 'extract-audio', 'transcribe', 'analyze', 'generate-script'] as const
    const brokenIndex = stepsOrder.indexOf(stepName as (typeof stepsOrder)[number])

    if (brokenIndex < 1) expect(deps.instagram.downloadVideo).not.toHaveBeenCalled()
    if (brokenIndex < 2) expect(deps.media.extractAudio).not.toHaveBeenCalled()
    if (brokenIndex < 3) expect(deps.transcription.transcribe).not.toHaveBeenCalled()
  })
})
