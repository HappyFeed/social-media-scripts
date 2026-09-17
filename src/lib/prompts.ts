import type { ActorProfile } from './profiles'
import type { ReelAnalysis } from './domain'

export function buildAnalysisPrompt(input: { transcript: string; caption: string }): string {
  return `Analizá el siguiente reel a partir de su transcript y su caption.

Transcript:
${input.transcript}

Caption:
${input.caption}`
}

export function buildScriptPrompt(input: { analysis: ReelAnalysis; profile: ActorProfile }): string {
  return `Escribí un script para grabar, siguiendo el estilo del actor descripto abajo.

Perfil del actor:
${input.profile.markdown}

Análisis del reel de referencia:
Objetivo: ${input.analysis.objective}
Highlights: ${input.analysis.highlights.join(', ')}
Audiencia objetivo: ${input.analysis.targetAudience}

Respondé siempre en español, sin importar el idioma del análisis de arriba.`
}
