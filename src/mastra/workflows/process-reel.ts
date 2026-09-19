import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import type { ReelOutcome, ReelScript } from '../../lib/domain'
import type { InstagramClient } from '../../lib/instagram/client'
import type { AudioExtractor } from '../../lib/media'
import type { CompletionClient } from '../../lib/openrouter/completion'
import type { TranscriptionClient } from '../../lib/openrouter/transcription'
import type { ActorProfile } from '../../lib/profiles'
import { analyze, type ReelForAnalysis } from '../steps/analyze'
import { cleanup, type FilesystemForCleanup } from '../steps/cleanup'
import { downloadVideo, type HydratedReelForDownload } from '../steps/download-video'
import { extractAudio, type DownloadedReelForAudio } from '../steps/extract-audio'
import { generateScript, type ReelForScript } from '../steps/generate-script'
import { hydrate, type ReelToHydrate } from '../steps/hydrate'
import { isFailedReel, type FailedReel } from '../steps/pipeline-step'
import { transcribe, type ReelForTranscription } from '../steps/transcribe'

export interface ProcessReelDeps {
  instagram: Pick<InstagramClient, 'hydrateReel' | 'downloadVideo'>
  media: Pick<AudioExtractor, 'extractAudio'>
  transcription: Pick<TranscriptionClient, 'transcribe'>
  completion: Pick<CompletionClient, 'complete'>
  fs: FilesystemForCleanup
  profile: ActorProfile
}

export const PROCESS_REEL_DEPS_KEY = 'processReelWorkflow.deps'

function getDeps(requestContext: { getRaw(key: string): unknown }): ProcessReelDeps {
  return requestContext.getRaw(PROCESS_REEL_DEPS_KEY) as ProcessReelDeps
}

const hydrateStep = createStep({
  id: 'hydrate',
  inputSchema: z.custom<ReelToHydrate | FailedReel>(),
  outputSchema: z.custom<HydratedReelForDownload | FailedReel>(),
  execute: async ({ inputData, requestContext }) => hydrate(inputData, getDeps(requestContext).instagram),
})

const downloadVideoStep = createStep({
  id: 'download',
  inputSchema: z.custom<HydratedReelForDownload | FailedReel>(),
  outputSchema: z.custom<DownloadedReelForAudio | FailedReel>(),
  execute: async ({ inputData, requestContext }) =>
    downloadVideo(inputData, getDeps(requestContext).instagram),
})

const extractAudioStep = createStep({
  id: 'extract-audio',
  inputSchema: z.custom<DownloadedReelForAudio | FailedReel>(),
  outputSchema: z.custom<ReelForTranscription | FailedReel>(),
  execute: async ({ inputData, requestContext }) => extractAudio(inputData, getDeps(requestContext).media),
})

const transcribeStep = createStep({
  id: 'transcribe',
  inputSchema: z.custom<ReelForTranscription | FailedReel>(),
  outputSchema: z.custom<ReelForAnalysis | FailedReel>(),
  execute: async ({ inputData, requestContext }) =>
    transcribe(inputData, getDeps(requestContext).transcription),
})

const analyzeStep = createStep({
  id: 'analyze',
  inputSchema: z.custom<ReelForAnalysis | FailedReel>(),
  outputSchema: z.custom<ReelForScript | FailedReel>(),
  execute: async ({ inputData, requestContext }) => analyze(inputData, getDeps(requestContext).completion),
})

const generateScriptStep = createStep({
  id: 'generate-script',
  inputSchema: z.custom<ReelForScript | FailedReel>(),
  outputSchema: z.custom<(ReelForScript & { script: ReelScript }) | FailedReel>(),
  execute: async ({ inputData, requestContext }) => {
    const deps = getDeps(requestContext)
    return generateScript(inputData, deps.completion, deps.profile)
  },
})

const cleanupStep = createStep({
  id: 'cleanup',
  inputSchema: z.custom<(ReelForScript & { script: ReelScript }) | FailedReel>(),
  outputSchema: z.custom<ReelOutcome>(),
  execute: async ({ inputData, requestContext }) => {
    // FailedReel no declara videoPath/audioPath, pero un reel que falló en
    // cualquier step posterior a downloadVideo/extractAudio sí los trae
    // acumulados (runPipelineStep los preserva vía spread al armar el
    // FailedReel) — se ensancha el tipo localmente para que cleanup() vea
    // esos campos, sin tocar el tipo compartido de pipeline-step.ts (T14).
    const cleaned = await cleanup<
      (ReelForScript & { script: ReelScript }) | (FailedReel & { videoPath?: string; audioPath?: string })
    >(inputData, getDeps(requestContext).fs)
    if (isFailedReel(cleaned)) {
      return cleaned
    }
    return {
      rank: cleaned.rank,
      shortcode: cleaned.shortcode,
      thumbnailUrl: cleaned.thumbnailUrl,
      metrics: cleaned.metrics,
      status: 'ok' as const,
      analysis: cleaned.analysis,
      script: cleaned.script,
    }
  },
})

export const processReelWorkflow = createWorkflow({
  id: 'processReelWorkflow',
  inputSchema: z.custom<ReelToHydrate>(),
  outputSchema: z.custom<ReelOutcome>(),
})
  .then(hydrateStep)
  .then(downloadVideoStep)
  .then(extractAudioStep)
  .then(transcribeStep)
  .then(analyzeStep)
  .then(generateScriptStep)
  .then(cleanupStep)
  .commit()
