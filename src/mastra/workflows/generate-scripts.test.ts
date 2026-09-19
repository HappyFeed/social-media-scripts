import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RequestContext } from '@mastra/core/request-context'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { RunInput } from '../../lib/domain'
import { GENERATE_SCRIPTS_DEPS_KEY, generateScriptsWorkflow, type GenerateScriptsDeps } from './generate-scripts'

function discoveredReel(shortcode: string, views: number) {
  return {
    shortcode,
    mediaId: `media-${shortcode}`,
    views,
    likes: 10,
    comments: 1,
    thumbnailUrl: `https://cdn.example.com/${shortcode}.jpg`,
    takenAt: '2026-01-01T00:00:00.000Z',
  }
}

interface InFlightTracker {
  count: number
  max: number
}

function trackedHydrateReel(tracker: InFlightTracker) {
  return vi.fn().mockImplementation(async (mediaId: string) => {
    tracker.count++
    tracker.max = Math.max(tracker.max, tracker.count)
    await new Promise((resolve) => setTimeout(resolve, 10))
    tracker.count--
    return {
      caption: 'una caption',
      videoUrl: `https://cdn.example.com/${mediaId}.mp4`,
      durationSeconds: 10,
    }
  })
}

function buildDeps(actorsDir: string, overrides: Partial<GenerateScriptsDeps> = {}): GenerateScriptsDeps {
  return {
    env: { IG_SESSION_ID: 'session', OPENROUTER_API_KEY: 'key' },
    probe: { isAvailable: async () => true },
    actorsDir,
    instagram: {
      discoverReels: vi.fn().mockResolvedValue([
        discoveredReel('r1', 100),
        discoveredReel('r2', 200),
        discoveredReel('r3', 300),
        discoveredReel('r4', 400),
        discoveredReel('r5', 500),
      ]),
      hydrateReel: vi.fn().mockResolvedValue({
        caption: 'una caption',
        videoUrl: 'https://cdn.example.com/video.mp4',
        durationSeconds: 10,
      }),
      downloadVideo: vi.fn().mockResolvedValue(undefined),
    },
    media: { extractAudio: vi.fn().mockResolvedValue({ path: '/tmp/audio.mp3', sizeBytes: 100 }) },
    transcription: { transcribe: vi.fn().mockResolvedValue('transcript') },
    completion: {
      complete: vi
        .fn()
        .mockResolvedValue({ objective: 'o', highlights: ['h'], targetAudience: 't' })
        .mockResolvedValue({ hook: 'h', body: 'b', closing: 'c' }),
    },
    fs: { unlink: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  }
}

// El schema de análisis/script se sirve alternando llamadas: primero
// analyze (reelAnalysisSchema), después generateScript (reelScriptSchema).
function withAlternatingCompletion(deps: GenerateScriptsDeps): GenerateScriptsDeps {
  deps.completion = {
    complete: vi.fn().mockImplementation(async ({ schema }) => {
      const asAnalysis = schema.safeParse({ objective: 'o', highlights: ['h'], targetAudience: 't' })
      if (asAnalysis.success) return asAnalysis.data
      return { hook: 'h', body: 'b', closing: 'c' }
    }),
  }
  return deps
}

async function runWorkflow(deps: GenerateScriptsDeps, input: RunInput) {
  const requestContext = new RequestContext()
  requestContext.setRaw(GENERATE_SCRIPTS_DEPS_KEY, deps)
  const run = await generateScriptsWorkflow.createRun()
  return run.start({ inputData: input, requestContext })
}

describe('mastra/workflows generateScriptsWorkflow', () => {
  let actorsDir: string

  beforeEach(async () => {
    actorsDir = await mkdtemp(join(tmpdir(), 'generate-scripts-actors-'))
    await writeFile(join(actorsDir, 'juanse.md'), '# Juanse\n\nTono directo.')
  })

  afterEach(async () => {
    await rm(actorsDir, { recursive: true, force: true })
  })

  test('procesa como máximo `concurrency` reels en simultáneo y produce un RunResult ordenado por rank', async () => {
    const tracker: InFlightTracker = { count: 0, max: 0 }
    const deps = withAlternatingCompletion(buildDeps(actorsDir))
    deps.instagram.hydrateReel = trackedHydrateReel(tracker)

    const result = await runWorkflow(deps, { account: 'north.star', actor: 'juanse', scan: 20, top: 5 })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('esperaba success')
    expect(tracker.max).toBeLessThanOrEqual(3)
    expect(tracker.max).toBe(3)
    expect(result.result.account).toBe('north.star')
    expect(result.result.actor).toBe('juanse')
    expect(result.result.reels.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
    expect(result.result.reels.map((r) => r.shortcode)).toEqual(['r5', 'r4', 'r3', 'r2', 'r1'])
  })

  test('si uno de los reels falla, los otros igual aparecen ok en el RunResult', async () => {
    const deps = withAlternatingCompletion(buildDeps(actorsDir))
    deps.instagram.hydrateReel = vi.fn().mockImplementation(async (mediaId: string) => {
      if (mediaId === 'media-r4') throw new Error('sesión inválida')
      return { caption: 'c', videoUrl: `https://cdn.example.com/${mediaId}.mp4`, durationSeconds: 10 }
    })

    // top: 3 selecciona r5/r4/r3 (los de más views)
    const result = await runWorkflow(deps, { account: 'north.star', actor: 'juanse', scan: 20, top: 3 })

    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('esperaba success')
    const byShortcode = Object.fromEntries(result.result.reels.map((r) => [r.shortcode, r]))
    expect(byShortcode.r5?.status).toBe('ok')
    expect(byShortcode.r4?.status).toBe('failed')
    expect(byShortcode.r3?.status).toBe('ok')
  })

  test('un FatalRunError lanzado desde discover+rank aborta el workflow entero', async () => {
    const deps = buildDeps(actorsDir)
    deps.instagram.discoverReels = vi.fn().mockResolvedValue([])

    const result = await runWorkflow(deps, { account: 'north.star', actor: 'juanse', scan: 20, top: 3 })

    expect(result.status).toBe('failed')
    if (result.status !== 'failed') throw new Error('esperaba failed')
    // Mastra serializa el error del workflow con .toJSON() antes de exponerlo
    // en WorkflowResult.error, así que no llega como instancia de FatalRunError
    // — se verifica su forma serializada (name/code) en su lugar.
    expect(result.error).toMatchObject({ name: 'FatalRunError', code: 'account-not-found' })
  })
})
