import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import type { ReelOutcome, RunInput, RunResult } from '../../lib/domain'
import type { DiscoveredReel, InstagramClient } from '../../lib/instagram/client'
import type { AudioExtractor } from '../../lib/media'
import type { CompletionClient } from '../../lib/openrouter/completion'
import type { TranscriptionClient } from '../../lib/openrouter/transcription'
import type { BinaryProbe } from '../../lib/preflight'
import { discoverAndRank } from '../steps/discover-rank'
import type { FilesystemForCleanup } from '../steps/cleanup'
import { preflight } from '../steps/preflight'
import { type ReelToHydrate } from '../steps/hydrate'
import { PROCESS_REEL_DEPS_KEY, processReelWorkflow } from './process-reel'

export interface GenerateScriptsDeps {
  env: { IG_SESSION_ID?: string; OPENROUTER_API_KEY?: string }
  probe: BinaryProbe
  actorsDir: string
  instagram: Pick<InstagramClient, 'discoverReels' | 'hydrateReel' | 'downloadVideo'>
  media: Pick<AudioExtractor, 'extractAudio'>
  transcription: Pick<TranscriptionClient, 'transcribe'>
  completion: Pick<CompletionClient, 'complete'>
  fs: FilesystemForCleanup
}

export const GENERATE_SCRIPTS_DEPS_KEY = 'generateScriptsWorkflow.deps'

function getDeps(requestContext: { getRaw(key: string): unknown }): GenerateScriptsDeps {
  return requestContext.getRaw(GENERATE_SCRIPTS_DEPS_KEY) as GenerateScriptsDeps
}

const preflightStep = createStep({
  id: 'preflight',
  inputSchema: z.custom<RunInput>(),
  outputSchema: z.custom<RunInput>(),
  execute: async ({ inputData, requestContext }) => {
    const deps = getDeps(requestContext)
    const profile = await preflight(deps.env, deps.probe, deps.actorsDir, inputData.actor)
    requestContext.setRaw(PROCESS_REEL_DEPS_KEY, {
      instagram: deps.instagram,
      media: deps.media,
      transcription: deps.transcription,
      completion: deps.completion,
      fs: deps.fs,
      profile,
    })
    return inputData
  },
})

const discoverAndRankStep = createStep({
  id: 'discover-rank',
  inputSchema: z.custom<RunInput>(),
  outputSchema: z.custom<Array<DiscoveredReel & { rank: number }>>(),
  execute: async ({ inputData, requestContext }) => {
    const deps = getDeps(requestContext)
    return discoverAndRank(inputData.account, inputData.scan, inputData.top, deps.instagram)
  },
})

const toReelToHydrateStep = createStep({
  id: 'to-reel-to-hydrate',
  inputSchema: z.custom<Array<DiscoveredReel & { rank: number }>>(),
  outputSchema: z.custom<ReelToHydrate[]>(),
  execute: async ({ inputData }) =>
    inputData.map((reel) => ({
      rank: reel.rank,
      shortcode: reel.shortcode,
      thumbnailUrl: reel.thumbnailUrl,
      metrics: { views: reel.views, likes: reel.likes, comments: reel.comments },
      mediaId: reel.mediaId,
    })),
})

const assembleStep = createStep({
  id: 'assemble',
  inputSchema: z.custom<ReelOutcome[]>(),
  outputSchema: z.custom<RunResult>(),
  execute: async ({ inputData, getInitData }) => {
    const runInput = getInitData<RunInput>()
    return {
      account: runInput.account,
      actor: runInput.actor,
      generatedAt: new Date().toISOString(),
      reels: inputData,
    }
  },
})

export const generateScriptsWorkflow = createWorkflow({
  id: 'generateScriptsWorkflow',
  inputSchema: z.custom<RunInput>(),
  outputSchema: z.custom<RunResult>(),
})
  .then(preflightStep)
  .then(discoverAndRankStep)
  .then(toReelToHydrateStep)
  .foreach(processReelWorkflow, { concurrency: 3 })
  .then(assembleStep)
  .commit()
