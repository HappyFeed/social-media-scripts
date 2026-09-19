import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { RequestContext } from '@mastra/core/request-context'
import { NextResponse } from 'next/server'
import type { RunInput } from '../../../lib/domain'
import { createInstagramClient } from '../../../lib/instagram/client'
import { createFfmpegExtractor } from '../../../lib/media'
import { createCompletionClient } from '../../../lib/openrouter/completion'
import { createTranscriptionClient } from '../../../lib/openrouter/transcription'
import type { BinaryProbe } from '../../../lib/preflight'
import { mastra } from '../../../mastra'
import { GENERATE_SCRIPTS_DEPS_KEY, type GenerateScriptsDeps } from '../../../mastra/workflows/generate-scripts'

const DEFAULT_SCAN = 20

interface CreateRunResult {
  runId: string
}

export function createPostHandler(startRun: (input: RunInput) => Promise<CreateRunResult>) {
  return async function POST(request: Request): Promise<Response> {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
    }

    if (!isValidRunRequestBody(body)) {
      return NextResponse.json(
        { error: 'account, actor y top (entero positivo) son requeridos' },
        { status: 400 },
      )
    }

    const { runId } = await startRun({
      account: body.account,
      actor: body.actor,
      top: body.top,
      scan: DEFAULT_SCAN,
    })

    return NextResponse.json({ runId }, { status: 201 })
  }
}

function isValidRunRequestBody(
  body: unknown,
): body is { account: string; actor: string; top: number } {
  if (typeof body !== 'object' || body === null) return false
  const candidate = body as Record<string, unknown>
  return (
    typeof candidate.account === 'string' &&
    candidate.account.length > 0 &&
    typeof candidate.actor === 'string' &&
    candidate.actor.length > 0 &&
    typeof candidate.top === 'number' &&
    Number.isInteger(candidate.top) &&
    candidate.top > 0
  )
}

function createBinaryProbe(): BinaryProbe {
  return {
    isAvailable(binary) {
      return new Promise((resolve) => {
        const proc = spawn(binary, ['-version'])
        proc.on('error', () => resolve(false))
        proc.on('close', (code) => resolve(code === 0))
      })
    },
  }
}

function buildDeps(): GenerateScriptsDeps {
  const instagram = createInstagramClient({ sessionId: process.env.IG_SESSION_ID ?? '' })
  const apiKey = process.env.OPENROUTER_API_KEY ?? ''

  return {
    env: {
      IG_SESSION_ID: process.env.IG_SESSION_ID,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    },
    probe: createBinaryProbe(),
    actorsDir: 'content/actors',
    instagram,
    media: createFfmpegExtractor(),
    transcription: createTranscriptionClient({ apiKey }),
    completion: createCompletionClient({ apiKey }),
    fs: { unlink: (path) => import('node:fs/promises').then((fs) => fs.unlink(path)) },
  }
}

async function startGenerateScriptsRun(input: RunInput): Promise<CreateRunResult> {
  // El runId se genera acá (no lo asigna Mastra) y se reutiliza como
  // resourceId: eso hace que cada sub-run de processReelWorkflow que
  // dispara el foreach de generateScriptsWorkflow quede correlacionado a
  // este run — es lo que T27/T28 usan para reconstruir el progreso por
  // reel vía `listWorkflowRuns({ workflowName, resourceId })`.
  const runId = randomUUID()
  const workflow = mastra.getWorkflow('generateScriptsWorkflow')
  const run = await workflow.createRun({ runId, resourceId: runId })
  const requestContext = new RequestContext()
  requestContext.setRaw(GENERATE_SCRIPTS_DEPS_KEY, buildDeps())
  void run.startAsync({ inputData: input, requestContext })
  return { runId: run.runId }
}

export const POST = createPostHandler(startGenerateScriptsRun)
