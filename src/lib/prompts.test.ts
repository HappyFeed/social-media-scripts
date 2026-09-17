import { describe, expect, test } from 'vitest'
import { buildAnalysisPrompt, buildScriptPrompt } from './prompts'

describe('buildAnalysisPrompt', () => {
  test('contiene transcript y caption', () => {
    const prompt = buildAnalysisPrompt({
      transcript: 'esto es lo que se dijo en el video',
      caption: 'este es el caption del post',
    })
    expect(prompt).toContain('esto es lo que se dijo en el video')
    expect(prompt).toContain('este es el caption del post')
  })
})

describe('buildScriptPrompt', () => {
  test('incrusta el markdown del profile verbatim y pide responder en español', () => {
    const prompt = buildScriptPrompt({
      analysis: {
        objective: 'Explain a productivity tip',
        highlights: ['Strong visual hook'],
        targetAudience: 'Early-stage founders',
      },
      profile: {
        name: 'juanse',
        markdown: '# Juanse\n\nTono directo, sin vueltas.',
      },
    })
    expect(prompt).toContain('# Juanse\n\nTono directo, sin vueltas.')
    expect(prompt.toLowerCase()).toContain('español')
  })
})
