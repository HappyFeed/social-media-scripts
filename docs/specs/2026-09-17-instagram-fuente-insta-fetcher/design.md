# Design — Reel Script Generation (fuente insta-fetcher)

**Status:** Draft
**Date:** 2026-09-17
**Requirements:** ./requirements.md

## Overview

La feature es un workflow de Mastra que refleja el flujo de requirements uno a
uno: descubrir los reels de una cuenta, rankearlos, y correr cada reel
seleccionado por su propio sub-workflow (hidratar → descargar → extraer audio
→ transcribir → analizar → generar script). Una página mínima de Next.js
arranca un run y hace polling de su estado.

Tres decisiones moldean todo lo que sigue.

**Steps finos, adapters inyectados.** Ningún step le habla directo al mundo
exterior — cada step orquesta. Instagram, ffmpeg, OpenRouter y el filesystem
están detrás de una interfaz chica que se inyecta. Esto permite correr el
suite unitario sin red y sin API keys, y aísla el único módulo que entiende el
payload crudo de `insta-fetcher` del resto del sistema.

**Dos clases de error, una regla.** Un `FatalRunError` se propaga y aborta el
run (requirements 1.5, 4.5, 7.2, 7.3). Todo lo demás se **devuelve como
valor**, no se lanza: un reel que falla se convierte en un outcome `failed`
que los steps siguientes pasan sin tocar (requirement 6.1). La aislación no
depende entonces de cómo el motor de workflow trata una excepción lanzada
dentro de una rama paralela.

**Puro donde se pueda.** El ranking y el armado de prompts son funciones
puras sin I/O — las dos piezas de lógica con más chance de tener un bug
también son las más baratas de testear.

## Architecture

```
Next.js (app/)
  POST /api/runs ───────────► arranca el workflow, devuelve { runId }       (5.1)
  GET  /api/runs/[runId] ───► lee el snapshot del run → RunView             (5.3–5.7)
        │
        ▼
Mastra (src/mastra/)
  generateScriptsWorkflow
    ├─ preflight ──── assertPreconditions + loadActorProfile                (7.1, 7.2, 4.5)
    ├─ discover ───── instagram.discoverReels(account, scan)                (1.1, 1.5)
    ├─ rank ───────── rankReels(reels, top)              [pura]             (1.2–1.4, 1.6)
    ├─ foreach(concurrency: 3) → processReelWorkflow                        (6.3)
    │     ├─ hydrate ───────── instagram.hydrateReel                        (2.1, 6.5)
    │     ├─ downloadVideo ─── instagram.downloadVideo                      (2.2)
    │     ├─ extractAudio ──── media.extractAudio                           (2.3, 2.6)
    │     ├─ transcribe ────── openrouter.transcribe                        (2.4)
    │     ├─ analyze ───────── openrouter.complete(analysisSchema)          (3.1–3.4)
    │     ├─ generateScript ── openrouter.complete(scriptSchema)            (4.1–4.4, 4.6)
    │     └─ cleanup ───────── borra video + audio temporales               (2.5)
    └─ assemble ───── output final del run                                  (5.4, 6.2)
        │
        ▼
Adapters (src/lib/)
  instagram/  media/  openrouter/  ranking/  profiles/  prompts/  preflight/
```

Estructura de directorios:

```
src/
  lib/
    instagram/     adapter de insta-fetcher — el único módulo que entiende el payload de api/v1
    media/         adapter de ffmpeg
    openrouter/    transcripción + completion con schema
    ranking/       rankReels — pura
    prompts/       armado de prompts — pura
    profiles/      carga de actor profiles
    preflight/     chequeo de precondiciones de entorno/binarios
    models.ts       los model IDs de OpenRouter usados por step, en un solo lugar
  mastra/
    index.ts       instancia de Mastra + storage
    workflows/     generate-scripts.ts, process-reel.ts
    steps/         un archivo por step
  app/
    page.tsx       la única página
    api/runs/      route handlers
content/actors/     <actor>.md, escritos a mano
```

`src/lib/models.ts` centraliza qué modelo de OpenRouter respalda cada step
(transcripción, análisis, generación) para que los tres IDs sean
intercambiables en un solo lugar. Los IDs exactos se fijan durante la
implementación contra el listado vivo de modelos de OpenRouter.

## Components and interfaces

### `lib/preflight`

- **Responsabilidad:** fallar un run mal configurado antes de descargar
  cualquier contenido.
- **Interface:**

```ts
export type FatalCode =
  | 'missing-ig-session'
  | 'missing-openrouter-key'
  | 'ffmpeg-unavailable'
  | 'unknown-actor'
  | 'account-not-found'
  | 'ig-session-expired';

export class FatalRunError extends Error {
  constructor(readonly code: FatalCode, message: string);
}

export interface BinaryProbe {
  isAvailable(binary: string): Promise<boolean>;
}

export async function assertPreconditions(
  env: { IG_SESSION_ID?: string; OPENROUTER_API_KEY?: string },
  probe: BinaryProbe,
): Promise<void>;
```

- **Depende de:** nada. `BinaryProbe` se inyecta para poder testear el chequeo
  sin tener ffmpeg instalado. Satisface 7.1, 7.2.

### `lib/instagram`

- **Responsabilidad:** toda interacción con Instagram, y el único lugar que
  entiende los payloads crudos de `api/v1` que devuelve `insta-fetcher`.
- **Interface:**

```ts
export class SessionExpiredError extends Error {}

export interface DiscoveredReel {
  shortcode: string;
  mediaId: string;
  views: number;
  likes: number;
  comments: number;
  thumbnailUrl: string;
  takenAt: string;         // ISO 8601
}

export interface HydratedReel {
  caption: string;
  videoUrl: string;
  durationSeconds: number;
}

export interface InstagramClient {
  /** Devuelve los reels más-reciente-primero. */
  discoverReels(account: string, scan: number): Promise<DiscoveredReel[]>;
  hydrateReel(mediaId: string): Promise<HydratedReel>;
  downloadVideo(videoUrl: string, destPath: string): Promise<void>;
}

export function createInstagramClient(opts: {
  sessionId: string;
  hydrateConcurrency?: number;   // default 5 (REEL_FETCH_CONCURRENCY)
  retry?: { attempts: number; baseDelayMs: number };
}): InstagramClient;
```

- **Depende de:** `insta-fetcher@1.4.0`, pineado exacto.
- **Notas:** un HTTP 403 en cualquier llamada lanza `SessionExpiredError`
  (satisface el "error distinguible" de 7.3 a nivel de este módulo); las
  demás fallas transitorias se reintentan con backoff exponencial antes de
  propagarse (6.4). `hydrateConcurrency` limita cuántas llamadas a
  `hydrateReel` corren en simultáneo *dentro del adapter* (6.5) — es un
  límite del propio módulo, independiente y más chico que la concurrencia de
  3 reels del workflow (6.3); en la práctica el workflow nunca pide más de 3
  a la vez, así que este límite es una red de seguridad del adapter, testeada
  por separado, no el mecanismo que hace cumplir 6.3. La política de retry
  vive acá en vez de en los steps porque `insta-fetcher` no trae ninguna.
- **En `mastra/workflows`:** los steps `discover` e `hydrate` capturan
  `SessionExpiredError` y la relanzan como
  `FatalRunError('ig-session-expired', ...)`, que es lo que efectivamente
  aborta el run (7.3); una cuenta vacía o inalcanzable en `discoverReels` se
  traduce ahí mismo a `FatalRunError('account-not-found')` (1.5).

### `lib/ranking`

- **Responsabilidad:** decidir qué reels vale la pena procesar. Pura.
- **Interface:**

```ts
export function rankReels<T extends { views: number }>(
  reels: readonly T[],
  top: number,
): Array<T & { rank: number }>;
```

- **Depende de:** nada.
- **Notas:** ordena por `views` descendente con un sort **estable**, así los
  reels empatados en views mantienen el orden más-reciente-primero en que
  llegaron (1.3). Toma los primeros `top`, o todos si hay menos (1.4), y
  asigna `rank` desde 1 (1.6).

### `lib/media`

- **Responsabilidad:** convertir un video descargado en un archivo de audio
  transcribible.
- **Interface:**

```ts
export interface AudioExtractor {
  extractAudio(videoPath: string, destPath: string): Promise<{ path: string; sizeBytes: number }>;
}

export function createFfmpegExtractor(ffmpegBin?: string): AudioExtractor;
```

- **Depende de:** el binario `ffmpeg` vía `child_process`.
- **Notas:** produce mp3 mono a 16 kHz (2.3). Devuelve `sizeBytes` para que
  quien la llama pueda validar el límite de 25 MB de transcripción sin
  releer el archivo (2.6).

### `lib/openrouter`

- **Responsabilidad:** las dos llamadas al LLM — transcripción y completion
  con schema.
- **Interface:**

```ts
export interface TranscriptionClient {
  /** Rechaza con AudioTooLargeError por encima de maxBytes, antes de pedir nada. */
  transcribe(audioPath: string, sizeBytes: number): Promise<string>;
}

export interface CompletionClient {
  complete<T>(args: {
    model: string;
    prompt: string;
    schema: z.ZodType<T>;
  }): Promise<T>;
}

export function createOpenRouterClients(opts: {
  apiKey: string;
  maxAudioBytes?: number;   // default 25 * 1024 * 1024
}): { transcription: TranscriptionClient; completion: CompletionClient };
```

- **Depende de:** `POST /api/v1/audio/transcriptions` de OpenRouter (audio en
  base64, `format: 'mp3'`) para transcripción, y el proveedor OpenRouter del
  AI SDK con generación restringida a schema para completion.
- **Notas:** `complete` reintenta **una vez** ante una falla de validación de
  schema y después desiste (3.3, 3.4, 4.4). El retry vive acá para que los
  dos steps de LLM lo obtengan sin repetir la lógica.

### `lib/profiles`

- **Responsabilidad:** cargar los actor profiles escritos a mano.
- **Interface:**

```ts
export interface ActorProfile { name: string; markdown: string; }

export function listActors(dir: string): Promise<string[]>;
export function loadActorProfile(dir: string, name: string): Promise<ActorProfile>;
```

- **Depende de:** el filesystem.
- **Notas:** el perfil se guarda como **markdown crudo** y se pasa al prompt
  tal cual. `listActors` respalda el selector de actor de la UI (5.2);
  `loadActorProfile` lanza `FatalRunError('unknown-actor')` para un perfil
  inexistente (4.5).

### `lib/prompts`

- **Responsabilidad:** armar los dos prompts de LLM. Pura.
- **Interface:**

```ts
export function buildAnalysisPrompt(input: { transcript: string; caption: string }): string;
export function buildScriptPrompt(input: { analysis: ReelAnalysis; profile: ActorProfile }): string;
```

- **Depende de:** nada.
- **Notas:** `buildAnalysisPrompt` incluye tanto transcript como caption
  (3.1). `buildScriptPrompt` incrusta el perfil del actor verbatim (4.2) e
  instruye salida en español sin importar el idioma del reel de origen
  (4.6). Ser pura hace que "¿el perfil del actor realmente llega al
  prompt?" sea una aserción de una línea.

### `mastra/workflows`

- **Responsabilidad:** orquestación y nada más.
- **Interface:**

```ts
export const processReelWorkflow;      // ReelInput -> ReelOutcome, nunca lanza por fallas aisladas
export const generateScriptsWorkflow;  // RunInput  -> RunResult
```

- **Depende de:** cada adapter de arriba, inyectado a través del contenedor
  de dependencias de la instancia de Mastra en vez de importado dentro de
  los steps.

### `app/api/runs`

- **Responsabilidad:** arrancar runs y exponer su estado.
- **Interface:**

```
POST /api/runs          { account, actor, top }  ->  201 { runId }
GET  /api/runs/:runId                            ->  200 RunView | 404 { error: 'run not found' }
```

- **Notas:** `POST` arranca el run y devuelve de inmediato sin esperarlo
  (5.1). `GET` lee el snapshot que Mastra persiste en su propio storage y lo
  mapea a `RunView` (5.3, 5.4, 5.6); un id desconocido es un 404 (5.7). El
  mapeo snapshot → `RunView` es una función pura, testeada por separado.

## Data models

```ts
// ---- input / output del run ---------------------------------------------

export interface RunInput {
  account: string;
  actor: string;
  scan: number;   // default 20
  top: number;    // default 3
}

export interface ReelMetrics {
  views: number;
  likes: number;
  comments: number;
}

// ---- outputs del LLM (los schemas contra los que se validan las respuestas)

export const reelAnalysisSchema = z.object({
  objective: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(1),
  targetAudience: z.string().min(1),
});
export type ReelAnalysis = z.infer<typeof reelAnalysisSchema>;

export const reelScriptSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  closing: z.string().min(1),
});
export type ReelScript = z.infer<typeof reelScriptSchema>;

// ---- outcome por reel: las fallas son valores, no excepciones -----------

export type PipelineStep =
  | 'hydrate' | 'download' | 'extract-audio'
  | 'transcribe' | 'analyze' | 'generate-script';

export interface ReelBase {
  rank: number;
  shortcode: string;
  thumbnailUrl: string;
  metrics: ReelMetrics;
}

export type ReelOutcome =
  | (ReelBase & { status: 'ok'; analysis: ReelAnalysis; script: ReelScript })
  | (ReelBase & { status: 'failed'; failedStep: PipelineStep; reason: string });

export interface RunResult {
  account: string;
  actor: string;
  generatedAt: string;   // ISO 8601
  reels: ReelOutcome[];  // ordenado por rank
}

// ---- lo que lee la UI -----------------------------------------------------

export type ReelView =
  | (ReelBase & { status: 'pending'; currentStep: PipelineStep })
  | ReelOutcome;

export interface RunView {
  runId: string;
  account: string;
  actor: string;
  status: 'running' | 'completed' | 'aborted';
  error?: { code: FatalCode; message: string };  // solo presente si aborted
  reels: ReelView[];
}
```

Invariantes: `reels` siempre está ordenado ascendente por `rank`; un reel
`failed` siempre trae `failedStep` y un `reason` legible (6.1); `error` está
presente si y solo si `status` es `aborted`.

## Data flow

### Escenario A — happy path

1. El usuario envía `{ account: "morningbrew", actor: "juanse", top: 3 }`. El
   route handler arranca el workflow y devuelve `{ runId }` sin esperarlo
   (5.1). La página arranca el polling de `GET /api/runs/:runId` cada ~2 s.
2. **preflight** verifica `IG_SESSION_ID`, `OPENROUTER_API_KEY` y `ffmpeg`, y
   carga `content/actors/juanse.md`. Todavía no se descargó nada (7.1, 4.5).
3. **discover** llama `discoverReels("morningbrew", 20)` y obtiene 20 reels
   más-reciente-primero con views, likes y comments (1.1).
4. **rank** ordena de forma estable por views descendente, se queda con los
   primeros 3, y estampa `rank: 1..3` (1.2, 1.3, 1.6).
5. **foreach**, de a tres (6.3, 6.5), cada reel corre `processReelWorkflow`:
   hydrate obtiene caption/videoUrl/duration (2.1); se descarga el video
   (2.2); ffmpeg produce mp3 mono 16 kHz (2.3); se transcribe el audio (2.4);
   el transcript **y el caption** se analizan en objective/highlights/audience,
   validado contra `reelAnalysisSchema` (3.1, 3.2); el análisis más el actor
   profile producen un hook/body/closing en español validado contra
   `reelScriptSchema` (4.1–4.3, 4.6); se borran el video y el audio
   temporales (2.5).
6. **assemble** emite `RunResult` ordenado por rank. El siguiente poll ve
   `status: 'completed'` y renderiza rank, métricas, análisis y un script
   copiable por reel (5.4, 5.5).

### Escenario B — un reel falla, el run no

Igual que arriba hasta el paso 5. El `videoUrl` del reel de rank 2 devuelve
404. El step `downloadVideo` lo captura y devuelve
`{ status: 'failed', failedStep: 'download', reason: 'video not available (404)' }`.
Todo step posterior de ese sub-workflow ve un input `failed` y lo pasa sin
hacer trabajo. Los ranks 1 y 3 terminan normal. `assemble` emite los tres
outcomes; la página muestra dos scripts y, para el rank 2, su motivo de falla
en el lugar donde iría el script (6.1, 6.2, 5.6).

### Escenario C — cookie vencida

En el paso 3, `discoverReels` recibe HTTP 403. El adapter lanza
`SessionExpiredError`, que el step `discover` traduce a
`FatalRunError('ig-session-expired')` — **no** se convierte en una falla de
reel, se propaga, el run termina `aborted`, y la página muestra "el
sessionid de Instagram venció y debe rotarse" (7.3).

## Error handling

| Condición | Manejo | Requirement relacionado |
|---|---|---|
| `IG_SESSION_ID` u `OPENROUTER_API_KEY` sin configurar | `FatalRunError` en preflight, antes de cualquier descarga | 7.1, 7.2 |
| `ffmpeg` no está en el PATH | `FatalRunError('ffmpeg-unavailable')` en preflight | 7.1, 7.2 |
| El actor pedido no tiene perfil | `FatalRunError('unknown-actor')` en preflight | 4.5 |
| Instagram devuelve HTTP 403 | `lib/instagram` lanza `SessionExpiredError`; el step lo traduce a `FatalRunError('ig-session-expired')`, run abortado con mensaje de rotar la cookie | 7.3 |
| Cuenta inexistente / inalcanzable / sin reels | `FatalRunError('account-not-found')`, run abortado | 1.5 |
| Cuenta con menos reels que `top` | No es un error — se sigue con los disponibles | 1.4 |
| Falla transitoria de Instagram (5xx, red) | Reintentada con backoff exponencial dentro del adapter, respetando `hydrateConcurrency`; solo una falla final se propaga | 6.4, 6.5 |
| URL de video 404 / falla la descarga | Reel `failed` en `download`, el run sigue | 6.1, 6.2 |
| ffmpeg falla sobre un mp4 corrupto | Reel `failed` en `extract-audio`, el run sigue | 6.1, 6.2 |
| Audio extraído > 25 MB | Reel `failed` en `extract-audio`, motivo "audio too large", no se envía ningún pedido | 2.6 |
| La transcripción hace timeout | Reel `failed` en `transcribe`, el run sigue | 6.1, 6.2 |
| La respuesta de análisis no pasa el schema | Se reintenta una vez; segunda falla → reel `failed` en `analyze`, motivo "invalid analysis response" | 3.2, 3.3, 3.4 |
| La respuesta de script no pasa el schema | Se reintenta una vez; segunda falla → reel `failed` en `generate-script`, motivo "invalid script response" | 4.3, 4.4 |
| Se pide un `runId` desconocido | 404 `{ error: 'run not found' }` | 5.7 |

## Testing strategy

El suite unitario y el de workflow deben correr **sin acceso a red y sin API
keys** — cada adapter se inyecta, así que ningún test llega a Instagram ni a
OpenRouter.

**Unit**

- `rankReels` — orden descendente por views; desempate estable que preserva
  el orden de llegada (1.3); menos reels que `top` (1.4); `rank` arranca en
  1 (1.6); input vacío.
- `lib/instagram` — mapeo del payload crudo de `api/v1` a `DiscoveredReel` y
  `HydratedReel`, con fixtures capturados del benchmark; 403 →
  `SessionExpiredError`; listado vacío → se puede distinguir para que el
  workflow arme `account-not-found`; el backoff reintenta una falla
  transitoria y desiste tras los intentos configurados; `hydrateConcurrency`
  nunca deja más de N `hydrateReel` en vuelo a la vez (6.5).
- `lib/prompts` — `buildScriptPrompt` contiene el texto del actor profile
  verbatim (4.2) y la instrucción de español (4.6); `buildAnalysisPrompt`
  contiene tanto transcript como caption (3.1).
- `lib/openrouter` — `transcribe` rechaza un archivo demasiado grande antes
  de emitir un pedido (2.6); `complete` reintenta exactamente una vez ante
  una falla de schema y después lanza (3.3, 3.4, 4.4).
- `lib/preflight` — cada precondición faltante produce su propio `FatalCode`
  (7.2).
- `lib/profiles` — `listActors` refleja el directorio (5.2); un perfil
  faltante lanza `unknown-actor` (4.5).
- Mapeo snapshot → `RunView` — los reels pendientes exponen `currentStep`
  (5.3), los fallidos exponen su motivo (5.6).

**Casos límite**

- Un reel que falla en cada uno de los seis steps del pipeline, verificando
  que todo step posterior pasa la falla sin tocarla.
- Un run donde *todos* los reels fallan: el run igual termina en vez de
  abortar (6.2).
- Un `FatalRunError` lanzado en medio del `foreach` aborta el run en vez de
  convertirse en una falla de reel.

**Workflow (Vitest, adapters falsos)**

- `processReelWorkflow` corre sus steps en orden y produce `status: 'ok'`.
- `generateScriptsWorkflow` nunca procesa más de 3 reels a la vez (6.3) y
  entrega los reels exitosos cuando uno falla (6.1, 6.2).

**End to end (Playwright)**

Se corre al final vía el loop `verify-implementation`: un happy path y dos
failure paths contra la app real.

## Design decisions and trade-offs

- **Decisión:** dentro del pipeline por reel, las fallas se devuelven como
  valor (`ReelOutcome`), no se lanzan — **Razón:** el requirement 6.1 tiene
  que cumplirse sin importar cómo el motor de workflow trate una excepción
  lanzada dentro de una rama paralela; devolver un valor también hace que
  cada step sea testeable con aserciones simples — **Alternativa
  considerada:** lanzar y capturar por rama, descartada porque acopla la
  garantía de aislación a la semántica interna de Mastra.
- **Decisión:** `FatalRunError` es el único tipo de excepción que puede
  escapar de un step — **Razón:** da una regla única e inequívoca para
  "abortar el run" vs "fallar este reel", en vez de dispersar ese juicio
  entre steps — **Alternativa considerada:** una política de error por
  step, descartada por ser más difícil de razonar y testear.
- **Decisión:** `lib/instagram` lanza `SessionExpiredError` a nivel de
  módulo, y el step lo traduce a `FatalRunError('ig-session-expired')` a
  nivel de workflow — **Razón:** satisface el requirement 7.3 (que pide un
  error distinguible en la fuente de datos) sin duplicar la regla de "qué
  aborta el run" fuera de `FatalRunError` — **Alternativa considerada:**
  que el adapter lance directamente `FatalRunError`, descartada porque
  acoplaría `lib/instagram` al motor de orquestación.
- **Decisión:** ranking es una función pura separada del adapter de
  Instagram — **Razón:** es la pieza de lógica con más chance de tener un
  bug y la más barata de testear aislada — **Alternativa considerada:**
  ranking dentro del adapter, descartada porque forzaría un fixture de red
  en cada test de ranking.
- **Decisión:** el actor profile se mantiene como markdown crudo y se
  inyecta verbatim — **Razón:** quienes lo editan no son ingenieros, y un
  schema estructurado los haría pelear con un formato en vez de describir
  cómo hablan — **Alternativa considerada:** YAML frontmatter estructurado,
  descartado por prematuro para esta primera vertical slice.
- **Decisión:** la UI hace polling a un endpoint de estado en vez de
  streaming — **Razón:** un run tarda minutos, y hacer polling sobre un
  snapshot persistido sobrevive gratis a un reload de página; streaming
  necesitaría manejo de reconexión sin ganancia real a esta escala —
  **Alternativa considerada:** SSE sobre el stream de run de Mastra,
  diferida.
- **Decisión:** el estado de un run vive solo en el storage propio de
  Mastra; nada se escribe a disco — **Razón:** es lo mínimo que satisface
  5.3–5.6, y los artefactos durables están explícitamente fuera de alcance
  — **Trade-off:** limpiar el storage pierde los runs pasados.
- **Decisión:** `insta-fetcher` pineado exacto a `1.4.0`, con retry y
  límites de concurrencia implementados de nuestro lado — **Razón:** la
  librería es chica, poco mantenida y no trae rate limiting propio; un bump
  automático de minor es una forma realista de romper la ingesta en
  silencio — **Alternativa considerada:** un rango caret, descartado por
  esa razón.
- **Decisión:** `hydrateConcurrency` (default 5, `REEL_FETCH_CONCURRENCY`)
  vive en el adapter como límite independiente del `foreach(concurrency: 3)`
  del workflow — **Razón:** cumple 6.5 literalmente y deja el adapter
  testeable y seguro por sí solo, sin depender de que el caller siempre
  respete el límite del workflow — **Trade-off:** con el `top` default de 3
  este límite nunca se alcanza en la práctica; queda como red de seguridad
  para si `top` crece en el futuro.
- **Decisión:** la app asume correr como un proceso Node de larga vida
  (`next dev` / `next start`) — **Razón:** `POST /api/runs` devuelve antes
  de que el workflow termine, lo que requiere que el proceso sobreviva a la
  request; un deploy serverless cortaría el run — **Consecuencia:** si esto
  se despliega serverless algún día, el run tiene que moverse a un worker.
