import { z } from 'zod'
import type { FatalCode } from './preflight'

// ---- input / output del run -----------------------------------------------

export interface RunInput {
  account: string
  actor: string
  scan: number // default 20
  top: number // default 3
}

export interface ReelMetrics {
  views: number
  likes: number
  comments: number
}

// ---- outputs del LLM (los schemas contra los que se validan las respuestas)

export const reelAnalysisSchema = z.object({
  objective: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(1),
  targetAudience: z.string().min(1),
})
export type ReelAnalysis = z.infer<typeof reelAnalysisSchema>

export const reelScriptSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  closing: z.string().min(1),
})
export type ReelScript = z.infer<typeof reelScriptSchema>

// ---- outcome por reel: las fallas son valores, no excepciones -------------

export type PipelineStep =
  | 'hydrate'
  | 'download'
  | 'extract-audio'
  | 'transcribe'
  | 'analyze'
  | 'generate-script'

export interface ReelBase {
  rank: number
  shortcode: string
  thumbnailUrl: string
  metrics: ReelMetrics
}

export type ReelOutcome =
  | (ReelBase & { status: 'ok'; analysis: ReelAnalysis; script: ReelScript })
  | (ReelBase & { status: 'failed'; failedStep: PipelineStep; reason: string })

export interface RunResult {
  account: string
  actor: string
  generatedAt: string // ISO 8601
  reels: ReelOutcome[] // ordenado por rank
}

// ---- lo que lee la UI -------------------------------------------------------

export type ReelView = (ReelBase & { status: 'pending'; currentStep: PipelineStep }) | ReelOutcome

export interface RunView {
  runId: string
  account: string
  actor: string
  status: 'running' | 'completed' | 'aborted'
  error?: { code: FatalCode; message: string } // solo presente si aborted
  reels: ReelView[]
}
