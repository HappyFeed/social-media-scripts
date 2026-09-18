import { generateObject } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { z } from 'zod'

export interface CompletionClient {
  complete<T>(args: { model: string; prompt: string; schema: z.ZodType<T> }): Promise<T>
}

export interface CompletionProvider {
  generate<T>(args: { model: string; prompt: string; schema: z.ZodType<T> }): Promise<unknown>
}

function createDefaultProvider(apiKey: string): CompletionProvider {
  const openrouter = createOpenRouter({ apiKey })

  return {
    async generate({ model, prompt, schema }) {
      const { object } = await generateObject({ model: openrouter(model), prompt, schema })
      return object
    },
  }
}

export function createCompletionClient(
  opts: { apiKey: string },
  provider: CompletionProvider = createDefaultProvider(opts.apiKey),
): CompletionClient {
  return {
    async complete(args) {
      const first = args.schema.safeParse(await provider.generate(args))
      if (first.success) {
        return first.data
      }

      const second = args.schema.safeParse(await provider.generate(args))
      if (second.success) {
        return second.data
      }

      throw new Error('La respuesta del modelo no cumple el schema esperado tras reintentar')
    },
  }
}
