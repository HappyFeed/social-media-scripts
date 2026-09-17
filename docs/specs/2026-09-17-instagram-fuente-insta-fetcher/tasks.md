# Tasks: Reel Script Generation (fuente insta-fetcher)

**Status:** Draft
**Date:** 2026-09-17
**Requirements:** ./requirements.md
**Design:** ./design.md

Implementa de punta a punta el pipeline de `design.md`: descubrir y rankear
reels de una North Star Account, transcribir/analizar/escribir un script por
reel con fallas aisladas por reel, y exponerlo vía una página Next.js con
polling. El repo está vacío (sin `package.json`, sin `src/`) al momento de
este plan, así que arranca con el bootstrap del proyecto.

## How to use this document

- Work tasks **one at a time, top to bottom**; don't start a task
  until its dependencies are `[x]`.
- Follow **TDD**: red → green → verify, per task.
- Append to the **Decision log** as you go — every non-obvious choice,
  discovery, or deviation from `design.md`. Don't draft it upfront.
- If `design.md` or `requirements.md` turn out to be wrong or
  incomplete, update them and note it in the task's Decision log.

## Status legend

| Marker | Meaning |
|---|---|
| `[ ]` | Pending — not started |
| `[~]` | In progress |
| `[x]` | Done — tests pass, verified |
| `[!]` | Blocked — see Decision log |

## Task overview

- [x] **T1** — Bootstrap del proyecto: tooling de TypeScript, Vitest y Next.js
- [x] **T2** — Tipos de dominio y schemas de salida del LLM
- [x] **T3** — `lib/ranking`: `rankReels`
- [x] **T4** — `lib/preflight`: `assertPreconditions` y `FatalRunError`
- [x] **T5** — `lib/profiles`: `listActors` y `loadActorProfile`
- [x] **T6** — `lib/prompts`: `buildAnalysisPrompt` y `buildScriptPrompt`
- [ ] **T7** — `lib/instagram`: `createInstagramClient` (discover/hydrate/download)
- [ ] **T8** — `lib/instagram`: `SessionExpiredError` y retry con backoff
- [ ] **T9** — `lib/instagram`: límite de concurrencia `hydrateConcurrency`
- [ ] **T10** — `lib/media`: `createFfmpegExtractor`
- [ ] **T11** — `lib/openrouter`: `TranscriptionClient`
- [ ] **T12** — `lib/openrouter`: `CompletionClient` con schema y retry
- [ ] **T13** — `mastra/index`: instancia de Mastra con storage
- [ ] **T14** — `mastra/steps`: helper de fallo-como-valor por step
- [ ] **T15** — `mastra/steps`: `hydrate`
- [ ] **T16** — `mastra/steps`: `downloadVideo`
- [ ] **T17** — `mastra/steps`: `extractAudio`
- [ ] **T18** — `mastra/steps`: `transcribe`
- [ ] **T19** — `mastra/steps`: `analyze`
- [ ] **T20** — `mastra/steps`: `generateScript`
- [ ] **T21** — `mastra/steps`: `cleanup`
- [ ] **T22** — `mastra/workflows`: `processReelWorkflow`
- [ ] **T23** — `mastra/steps`: `preflight`
- [ ] **T24** — `mastra/steps`: `discover+rank`
- [ ] **T25** — `mastra/workflows`: `generateScriptsWorkflow`
- [ ] **T26** — `app/api/runs`: `POST` arranca un run
- [ ] **T27** — Mapeo puro snapshot → `RunView`
- [ ] **T28** — `app/api/runs/[runId]`: `GET` estado de un run
- [ ] **T29** — `app/page.tsx`: formulario de arranque de run
- [ ] **T30** — `app/page.tsx`: vista de resultados de un run
- [ ] **T31** — `app/page.tsx`: polling de estado de un run
- [ ] **T32** — `app/page.tsx`: copiar script con un click
- [ ] **T33** — README: documentar el sessionid de una cuenta quemable

## Requirements coverage

| Requirement criterion | Task(s) |
|---|---|
| 1.1 | T7, T24 |
| 1.2 | T3, T24 |
| 1.3 | T3 |
| 1.4 | T3 |
| 1.5 | T24 |
| 1.6 | T3 |
| 2.1 | T7, T15 |
| 2.2 | T7, T16 |
| 2.3 | T10, T17 |
| 2.4 | T11, T18 |
| 2.5 | T21 |
| 2.6 | T11, T18 |
| 3.1 | T6, T19 |
| 3.2 | T12, T19 |
| 3.3 | T12, T19 |
| 3.4 | T12, T19 |
| 4.1 | T20 |
| 4.2 | T6, T20 |
| 4.3 | T12, T20 |
| 4.4 | T12, T20 |
| 4.5 | T5, T23 |
| 4.6 | T6, T20 |
| 5.1 | T26, T29 |
| 5.2 | T5, T29 |
| 5.3 | T27, T28, T30, T31 |
| 5.4 | T25, T27, T28, T30 |
| 5.5 | T32 |
| 5.6 | T27, T28, T30 |
| 5.7 | T28 |
| 6.1 | T14, T22 |
| 6.2 | T22, T25 |
| 6.3 | T25 |
| 6.4 | T8 |
| 6.5 | T9 |
| 7.1 | T4, T23 |
| 7.2 | T4, T23 |
| 7.3 | T8, T24 |
| 7.4 | T33 |

---

## Tasks

### T1 — Bootstrap del proyecto: tooling de TypeScript, Vitest y Next.js

- **Status:** `[x]`
- **Traces to:** design.md Architecture / estructura de directorios (habilita todo lo demás)
- **Depends on:** none

**Objective:** Existe un proyecto Node instalable con `npm install`, TypeScript
en modo estricto, Vitest y un esqueleto mínimo de Next.js, de forma que
`npm run typecheck` y `npm test` corren y pasan.

**TDD plan:**

1. **Test (red):** agregar `src/lib/__smoke__.test.ts` con `expect(1 + 1).toBe(2)`; falla porque no existe `package.json`/config de Vitest, `npm test` no resuelve.
2. **Implement (green):** crear `package.json` (scripts `typecheck`, `test`, `test:e2e`), `tsconfig.json` estricto, `vitest.config.ts`, dependencias mínimas (`typescript`, `vitest`, `next`, `react`, `react-dom`, `zod`) y un esqueleto de Next.js (`app/layout.tsx`, `app/page.tsx` placeholder) para que `typecheck` tenga un entrypoint válido. No instalar todavía `@mastra/core`, `insta-fetcher` ni el provider de OpenRouter — se agregan en las tareas que los necesitan (T7, T10–T13), para no sumar dependencias sin uso inmediato.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- El esqueleto de Next.js quedó en `src/app/` (no `app/` en la raíz), siguiendo la convención `src/` que usa el resto del árbol en design.md Architecture (`src/lib`, `src/mastra`, `src/app`).
- `npm audit` reporta 7 vulnerabilidades (moderate/high) en `vite`/`esbuild`/`postcss`, todas transitivas de `vitest`/`next` y solo relevantes al dev server/build, no a runtime de producción. El fix requiere bumps mayores (`vitest@4`, `next@16`) fuera del alcance de esta tarea; se deja para una tarea de mantenimiento aparte si se decide encarar.

**Outcome:** `npm run typecheck` y `npm test` corren y pasan sobre el esqueleto (`package.json`, `tsconfig.json` estricto, `vitest.config.ts`, `next.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/__smoke__.test.ts`).

### T2 — Tipos de dominio y schemas de salida del LLM

- **Status:** `[x]`
- **Traces to:** design.md Data models · `lib/preflight` (reutiliza `FatalCode`)
- **Depends on:** T1, T4

**Objective:** Existen los tipos y schemas Zod compartidos (`RunInput`,
`ReelMetrics`, `ReelBase`, `PipelineStep`, `ReelOutcome`, `RunResult`,
`ReelView`, `RunView`, `reelAnalysisSchema`, `reelScriptSchema`) para que el
resto de las tareas los importen en vez de redefinirlos. `RunView.error.code`
reutiliza el `FatalCode` que define `lib/preflight` (T4) en vez de
redefinirlo, para que exista una sola fuente de verdad de qué códigos puede
reportar un run abortado — de ahí que esta tarea dependa de T4 y no solo de
T1. Los criterios 3.2 y 4.3 (rechazo de una respuesta de LLM que no conforma
al schema) los cubren y los prueban T12/T19/T20, que son quienes ejecutan
esa validación en runtime; esta tarea solo pone a disposición los dos
schemas Zod que esas tareas consumen.

**TDD plan:**

1. **Test (red):** `src/lib/domain.test.ts` — `reelAnalysisSchema.safeParse(...)` acepta un análisis válido y rechaza uno sin `objective` o con `highlights: []`; `reelScriptSchema.safeParse(...)` acepta un script válido y rechaza uno con `body` vacío.
2. **Implement (green):** definir los schemas Zod y los tipos inferidos/interfaces en `src/lib/domain.ts`, importando `FatalCode` desde `lib/preflight` para tipar `RunView.error.code`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- Los criterios 3.2/4.3 (rechazo de LLM output que no conforma al schema) se prueban en T12/T19/T20 vía `safeParse` fallando sobre un payload malformado, no acá: esta tarea solo cubre que los schemas aceptan lo válido y rechazan violaciones obvias de sus propios campos (`objective`/`highlights` vacíos, `body` vacío).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/domain.ts` expone `RunInput`, `ReelMetrics`, `ReelBase`, `PipelineStep`, `ReelOutcome`, `RunResult`, `ReelView`, `RunView`, `reelAnalysisSchema`, `reelScriptSchema`.

### T3 — `lib/ranking`: `rankReels`

- **Status:** `[x]`
- **Traces to:** 1.2, 1.3, 1.4, 1.6 · design.md `lib/ranking`
- **Depends on:** T1

**Objective:** Existe una función pura que rankea reels por views y asigna
`rank` desde 1, respetando desempates y `top` mayor a la cantidad disponible.

**TDD plan:**

1. **Test (red):** `src/lib/ranking.test.ts` — orden descendente por views; empate en views preserva el orden de llegada (más reciente primero); `top` mayor que la cantidad de reels devuelve todos; `rank` arranca en 1; input vacío devuelve `[]`.
2. **Implement (green):** `rankReels` con sort estable.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- `rankReels` es genérica (`T extends { views: number }`) tal cual el design — no depende de `ReelMetrics`/`ReelBase` de T2, así que no tiene ninguna dependencia real más allá de T1 (el sort estable de JS/`Array.prototype.sort` alcanza, sin librería extra).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/ranking.ts` expone `rankReels`.

### T4 — `lib/preflight`: `assertPreconditions` y `FatalRunError`

- **Status:** `[x]`
- **Traces to:** 7.1, 7.2 · design.md `lib/preflight`
- **Depends on:** T1

**Objective:** Un run mal configurado (falta `IG_SESSION_ID`, falta la API
key de OpenRouter, o `ffmpeg` no disponible) aborta antes de descargar nada,
con un `FatalRunError` cuyo código identifica cuál precondición falló.

**TDD plan:**

1. **Test (red):** `src/lib/preflight.test.ts` — falta `IG_SESSION_ID` → rechaza con `FatalRunError` código `missing-ig-session`; falta la API key → `missing-openrouter-key`; `BinaryProbe.isAvailable('ffmpeg')` resuelve `false` → `ffmpeg-unavailable`; todo presente y probe `true` → resuelve.
2. **Implement (green):** `FatalRunError`, `FatalCode`, `BinaryProbe`, `assertPreconditions`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- `FatalCode` incluye los seis valores del design (`missing-ig-session`, `missing-openrouter-key`, `ffmpeg-unavailable`, `unknown-actor`, `account-not-found`, `ig-session-expired`) aunque `assertPreconditions` solo produce los primeros tres — los otros tres los lanzan T5 y T24, que reusan el mismo tipo.
- Orden de chequeo: `IG_SESSION_ID` → `OPENROUTER_API_KEY` → probe de `ffmpeg`, short-circuit en el primero que falla (no se prueban los siguientes).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/preflight.ts` expone `FatalCode`, `FatalRunError`, `BinaryProbe`, `assertPreconditions`.

### T5 — `lib/profiles`: `listActors` y `loadActorProfile`

- **Status:** `[x]`
- **Traces to:** 4.5, 5.2 · design.md `lib/profiles`
- **Depends on:** T4

**Objective:** Los actor profiles escritos a mano en `content/actors/` se
pueden listar y cargar como markdown crudo; pedir un actor sin perfil aborta
el run con `FatalRunError('unknown-actor')`.

**TDD plan:**

1. **Test (red):** `src/lib/profiles.test.ts` con un directorio fixture de actores — `listActors` devuelve los nombres sin extensión `.md`; `loadActorProfile` devuelve el markdown de un actor existente; `loadActorProfile` de un actor inexistente rechaza con `FatalRunError('unknown-actor')`.
2. **Implement (green):** `ActorProfile`, `listActors`, `loadActorProfile`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- Los fixtures del test usan un directorio temporal real (`fs.mkdtemp` en `os.tmpdir()`, limpiado en `afterEach`) en vez de un directorio fixture checkeado en el repo, para no depender de un `content/actors/` de prueba versionado y evitar que otro test lo pise.
- `loadActorProfile` distingue el "no existe" de cualquier otro error de filesystem colapsando todo a `unknown-actor` — es la única causa realista de fallo al leer `content/actors/<name>.md` en este flujo.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/profiles.ts` expone `ActorProfile`, `listActors`, `loadActorProfile`.

### T6 — `lib/prompts`: `buildAnalysisPrompt` y `buildScriptPrompt`

- **Status:** `[x]`
- **Traces to:** 3.1, 4.2, 4.6 · design.md `lib/prompts`
- **Depends on:** T2, T5

**Objective:** Existen las dos funciones puras de armado de prompt: la de
análisis incluye transcript y caption; la de script incrusta el actor
profile verbatim e instruye salida en español.

**TDD plan:**

1. **Test (red):** `src/lib/prompts.test.ts` — `buildAnalysisPrompt({transcript, caption})` contiene ambos textos; `buildScriptPrompt({analysis, profile})` contiene el markdown del profile verbatim y una instrucción explícita de responder en español, sin importar el idioma del análisis de entrada.
2. **Implement (green):** `buildAnalysisPrompt`, `buildScriptPrompt`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- El test de `buildScriptPrompt` usa un `analysis` en inglés a propósito, para probar que la instrucción de responder en español no depende del idioma del análisis de entrada (4.6) — matchea el criterio literal, no solo el caso feliz en español.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/prompts.ts` expone `buildAnalysisPrompt`, `buildScriptPrompt`.

### T7 — `lib/instagram`: `createInstagramClient` (discover/hydrate/download)

- **Status:** `[ ]`
- **Traces to:** 1.1, 2.1, 2.2 · design.md `lib/instagram`
- **Depends on:** T1

**Objective:** Existe un cliente de Instagram, respaldado por
`insta-fetcher@1.4.0` pineado exacto, cuyo happy path mapea los payloads
crudos de `api/v1` a `DiscoveredReel[]` (más-reciente-primero, con
views/likes/comments), `HydratedReel` (caption/videoUrl/duration) y descarga
un video a un path local.

**TDD plan:**

1. **Test (red):** `src/lib/instagram/client.test.ts` con fixtures de payload de `api/v1` (a mano, siguiendo la forma documentada de `insta-fetcher`) — `discoverReels` mapea el fixture a `DiscoveredReel[]` en el orden correcto con las tres métricas; `hydrateReel` mapea un fixture de detalle de post a `HydratedReel`; `downloadVideo` escribe los bytes recibidos (transporte HTTP mockeado) en `destPath`.
2. **Implement (green):** `createInstagramClient` con los tres métodos, agregando `insta-fetcher` (`1.4.0` exacto) a `package.json`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T8 — `lib/instagram`: `SessionExpiredError` y retry con backoff

- **Status:** `[ ]`
- **Traces to:** 6.4, 7.3 (nivel de módulo) · design.md `lib/instagram` Notas
- **Depends on:** T7

**Objective:** Un HTTP 403 en cualquier llamada del cliente lanza
`SessionExpiredError` de inmediato sin reintentar; cualquier otra falla
transitoria se reintenta con backoff exponencial antes de propagarse.

**TDD plan:**

1. **Test (red):** `src/lib/instagram/resilience.test.ts` — un transporte fake que devuelve 403 rechaza con `SessionExpiredError` sin reintentar; un transporte que falla dos veces (p.ej. 500) y luego resuelve, resuelve tras reintentar con delays crecientes; uno que siempre falla rechaza tras agotar los intentos configurados.
2. **Implement (green):** wrapper de retry/backoff + `SessionExpiredError`, aplicado dentro de `createInstagramClient` (T7).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T9 — `lib/instagram`: límite de concurrencia `hydrateConcurrency`

- **Status:** `[ ]`
- **Traces to:** 6.5 · design.md `lib/instagram` Notas
- **Depends on:** T7

**Objective:** El cliente nunca deja más de `hydrateConcurrency` llamadas a
`hydrateReel` en vuelo a la vez, como red de seguridad independiente del
límite de concurrencia de 3 reels del workflow.

**TDD plan:**

1. **Test (red):** `src/lib/instagram/concurrency.test.ts` — al pedir `hydrateReel` para 10 `mediaId` en simultáneo con `hydrateConcurrency: 2`, un contador de llamadas en vuelo (vía transporte fake) nunca supera 2; al omitir `hydrateConcurrency` y pedir `hydrateReel` para 10 `mediaId` en simultáneo, ese mismo contador nunca supera el default de 5 (`REEL_FETCH_CONCURRENCY`).
2. **Implement (green):** limitador de concurrencia (semáforo simple) aplicado a `hydrateReel` en `createInstagramClient`, con default 5 vía `REEL_FETCH_CONCURRENCY`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T10 — `lib/media`: `createFfmpegExtractor`

- **Status:** `[ ]`
- **Traces to:** 2.3 · design.md `lib/media`
- **Depends on:** T1

**Objective:** Existe un adapter que invoca `ffmpeg` vía `child_process` para
convertir un video en mp3 mono a 16 kHz y devuelve el path y tamaño en bytes
del archivo resultante.

**TDD plan:**

1. **Test (red):** `src/lib/media.test.ts` — con `child_process` inyectado/mockeado, `extractAudio` invoca `ffmpeg` con argumentos que producen mp3 mono 16 kHz y resuelve `{ path, sizeBytes }` a partir del archivo producido; un spawn con exit code distinto de 0 rechaza.
2. **Implement (green):** `createFfmpegExtractor`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T11 — `lib/openrouter`: `TranscriptionClient`

- **Status:** `[ ]`
- **Traces to:** 2.4, 2.6 · design.md `lib/openrouter`
- **Depends on:** T1

**Objective:** `transcribe(audioPath, sizeBytes)` rechaza con
`AudioTooLargeError` sin emitir ningún pedido cuando `sizeBytes` supera el
límite (default 25 MB), y por debajo del límite llama al endpoint de
transcripción y devuelve el texto.

**TDD plan:**

1. **Test (red):** `src/lib/openrouter/transcription.test.ts` — `sizeBytes` por encima de `maxAudioBytes` rechaza con `AudioTooLargeError` sin invocar el cliente HTTP inyectado; por debajo del límite, invoca el endpoint y devuelve el texto de la respuesta.
2. **Implement (green):** `TranscriptionClient`, `AudioTooLargeError`, entrada del modelo de transcripción en `src/lib/models.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T12 — `lib/openrouter`: `CompletionClient` con schema y retry

- **Status:** `[ ]`
- **Traces to:** 3.2, 3.3, 3.4, 4.3, 4.4 · design.md `lib/openrouter`
- **Depends on:** T1

**Objective:** `complete({model, prompt, schema})` valida la respuesta contra
el schema Zod dado, reintenta exactamente una vez ante una respuesta
inválida, y desiste tras el segundo fallo.

**TDD plan:**

1. **Test (red):** `src/lib/openrouter/completion.test.ts` — un provider fake que devuelve un payload inválido y luego uno válido resuelve tras exactamente un reintento; uno que devuelve inválido dos veces seguidas rechaza tras ese único reintento; uno que devuelve válido de entrada resuelve sin reintentar.
2. **Implement (green):** `CompletionClient` con retry-once, entradas de modelo de análisis/script en `src/lib/models.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T13 — `mastra/index`: instancia de Mastra con storage

- **Status:** `[ ]`
- **Traces to:** design.md Architecture ("Mastra (src/mastra/) — instancia de Mastra + storage"), habilita 5.3/5.4
- **Depends on:** T1

**Objective:** Existe una instancia de Mastra exportada con un storage
backend cuyos snapshots de workflow run se pueden persistir y releer por id,
base para que `GET /api/runs/:runId` pueda hacer polling. Cualquier adapter
de storage compatible con `@mastra/core` alcanza para esta vertical slice
(p.ej. uno en memoria) — el diseño explícitamente deja fuera de alcance
persistir runs entre reinicios del proceso, así que no hay que resolver acá
un backend durable; alcanza con que el snapshot sobreviva mientras el
proceso Node vive.

**TDD plan:**

1. **Test (red):** `src/mastra/index.test.ts` — persistir un snapshot de run fake vía el storage de la instancia y releerlo por id devuelve el mismo contenido (round-trip).
2. **Implement (green):** `src/mastra/index.ts` instanciando Mastra con storage, agregando `@mastra/core` a `package.json`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T14 — `mastra/steps`: helper de fallo-como-valor por step

- **Status:** `[ ]`
- **Traces to:** 6.1 · design.md "Dos clases de error, una regla"
- **Depends on:** T2

**Objective:** Existe un helper genérico que envuelve la función de un step:
si la función lanza sobre un reel sano, el resultado se convierte en
`{status:'failed', failedStep, reason}`; si el input ya llegó `failed`, el
step lo pasa sin tocarlo ni ejecutar la función.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/pipeline-step.test.ts` — envolver una función que lanza, dado un input sano, produce `failed` con el `failedStep` y `reason` esperados; envolver la misma función, dado un input ya `failed`, devuelve ese input sin invocar la función.
2. **Implement (green):** `runPipelineStep(stepName, input, fn)` en `src/mastra/steps/pipeline-step.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T15 — `mastra/steps`: `hydrate`

- **Status:** `[ ]`
- **Traces to:** 2.1 · design.md Architecture (`hydrate`)
- **Depends on:** T7, T14

**Objective:** El step `hydrate` adjunta caption/videoUrl/duration a un reel
sano vía `instagram.hydrateReel`; si la llamada falla, el reel queda `failed`
en el step `hydrate`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/hydrate.test.ts` — con un `InstagramClient` fake, un reel sano termina con caption/videoUrl/durationSeconds adjuntos; un `hydrateReel` que rechaza produce `{status:'failed', failedStep:'hydrate'}`.
2. **Implement (green):** `src/mastra/steps/hydrate.ts` usando `runPipelineStep` (T14) + `instagram.hydrateReel` (T7).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T16 — `mastra/steps`: `downloadVideo`

- **Status:** `[ ]`
- **Traces to:** 2.2 · design.md Architecture (`downloadVideo`)
- **Depends on:** T7, T14

**Objective:** El step `downloadVideo` descarga el video de un reel hidratado
a un path local vía `instagram.downloadVideo`; una descarga fallida deja el
reel `failed` en `download`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/download-video.test.ts` — con un `InstagramClient` fake, éxito adjunta un path local de video; un rechazo produce `failed('download')`.
2. **Implement (green):** `src/mastra/steps/download-video.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T17 — `mastra/steps`: `extractAudio`

- **Status:** `[ ]`
- **Traces to:** 2.3 · design.md Architecture (`extractAudio`)
- **Depends on:** T10, T14

**Objective:** El step `extractAudio` produce el mp3 mono 16 kHz de un reel
descargado vía `media.extractAudio`; una falla de ffmpeg deja el reel
`failed` en `extract-audio`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/extract-audio.test.ts` — con un `AudioExtractor` fake, éxito adjunta `audioPath` y `sizeBytes`; un rechazo produce `failed('extract-audio')`.
2. **Implement (green):** `src/mastra/steps/extract-audio.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T18 — `mastra/steps`: `transcribe`

- **Status:** `[ ]`
- **Traces to:** 2.4, 2.6 · design.md Architecture (`transcribe`), Error handling table
- **Depends on:** T11, T14

**Objective:** El step `transcribe` obtiene el texto transcripto vía
`openrouter.transcribe`; un `AudioTooLargeError` se mapea a
`failed('extract-audio', 'audio too large')` (según la tabla de Error
handling del design), y cualquier otra falla de transcripción se mapea a
`failed('transcribe')`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/transcribe.test.ts` — con un `TranscriptionClient` fake, éxito adjunta el transcript; `AudioTooLargeError` produce `{status:'failed', failedStep:'extract-audio', reason:'audio too large'}`; otro rechazo produce `failed('transcribe')`.
2. **Implement (green):** `src/mastra/steps/transcribe.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T19 — `mastra/steps`: `analyze`

- **Status:** `[ ]`
- **Traces to:** 3.1, 3.2, 3.3, 3.4 · design.md Architecture (`analyze`)
- **Depends on:** T6, T12, T14

**Objective:** El step `analyze` produce un `ReelAnalysis` usando
`buildAnalysisPrompt` + `CompletionClient.complete(reelAnalysisSchema)`; si
la respuesta sigue siendo inválida tras el retry interno del cliente, el
reel queda `failed` en `analyze` con motivo "invalid analysis response".

**TDD plan:**

1. **Test (red):** `src/mastra/steps/analyze.test.ts` — con un `CompletionClient` fake, éxito adjunta un `ReelAnalysis` válido construido a partir de transcript+caption; un cliente que rechaza produce `failed('analyze', 'invalid analysis response')`.
2. **Implement (green):** `src/mastra/steps/analyze.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T20 — `mastra/steps`: `generateScript`

- **Status:** `[ ]`
- **Traces to:** 4.1, 4.2, 4.3, 4.4, 4.6 · design.md Architecture (`generateScript`)
- **Depends on:** T6, T12, T14

**Objective:** El step `generateScript` produce un `ReelScript` usando
`buildScriptPrompt` (análisis + actor profile) +
`CompletionClient.complete(reelScriptSchema)`; una respuesta inválida tras el
retry interno deja el reel `failed` en `generate-script` con motivo "invalid
script response".

**TDD plan:**

1. **Test (red):** `src/mastra/steps/generate-script.test.ts` — con un `CompletionClient` fake, éxito adjunta un `ReelScript` válido; un cliente que rechaza produce `failed('generate-script', 'invalid script response')`.
2. **Implement (green):** `src/mastra/steps/generate-script.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T21 — `mastra/steps`: `cleanup`

- **Status:** `[ ]`
- **Traces to:** 2.5 · design.md Architecture (`cleanup`)
- **Depends on:** T16, T17

**Objective:** El step `cleanup` borra el video descargado y el audio
extraído de un reel del almacenamiento local, sin importar si el reel
terminó `ok` o `failed`, y devuelve el outcome sin modificarlo. A
diferencia del resto de los steps del pipeline por reel, `cleanup` no se
implementa con `runPipelineStep` (T14): ese helper pasa el input sin
ejecutar la función cuando el reel ya llegó `failed` (para no seguir
haciendo trabajo real sobre un reel roto), pero `cleanup` necesita el
comportamiento inverso — ejecutar su side-effect de borrado *siempre*,
tanto si el reel terminó `ok` como `failed`, precisamente para liberar los
archivos temporales que un step anterior sí llegó a crear antes de que el
reel fallara más adelante. Por eso esta tarea no depende de T14.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/cleanup.test.ts` — con un filesystem fake inyectado, un reel con `videoPath`/`audioPath` seteados termina con ambos archivos borrados y el mismo outcome devuelto; un reel al que le falta uno de los dos paths (falló antes de generarlo) no intenta borrar el que no existe.
2. **Implement (green):** `src/mastra/steps/cleanup.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T22 — `mastra/workflows`: `processReelWorkflow`

- **Status:** `[ ]`
- **Traces to:** 6.1 (integración) · design.md `mastra/workflows` (`processReelWorkflow`)
- **Depends on:** T13, T15, T16, T17, T18, T19, T20, T21

**Objective:** `processReelWorkflow` corre hydrate→download→extractAudio→
transcribe→analyze→generateScript→cleanup en orden; con adapters fake que
siempre tienen éxito produce `status:'ok'` con análisis y script; una falla
inyectada en cualquiera de los seis steps del pipeline produce el
`ReelOutcome failed` correspondiente y ningún step posterior ejecuta trabajo
real sobre ese reel. Esta tarea depende también de T13, no solo de los steps
T15–T21: `processReelWorkflow` se construye con `createWorkflow` de
`@mastra/core`, paquete que recién T13 agrega a `package.json`, y design.md
nota que la inyección de los adapters en los workflows ocurre "a través del
contenedor de dependencias de la instancia de Mastra" — esa instancia es
justamente lo que T13 produce, así que la composición del workflow no puede
existir antes.

**TDD plan:**

1. **Test (red):** `src/mastra/workflows/process-reel.test.ts` — happy path con adapters fake exitosos produce `status:'ok'`; test parametrizado con una falla en cada uno de los seis steps verifica el `failedStep`/`reason` esperado y que los adapters fake de los steps posteriores no son invocados.
2. **Implement (green):** `src/mastra/workflows/process-reel.ts` encadenando T15–T21.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T23 — `mastra/steps`: `preflight`

- **Status:** `[ ]`
- **Traces to:** 7.1, 7.2, 4.5 · design.md Architecture (`preflight`)
- **Depends on:** T4, T5

**Objective:** El step `preflight` verifica precondiciones de entorno/binario
y carga el actor profile del actor pedido antes de que el run descargue
nada; cualquier precondición no cumplida, o un actor sin perfil, aborta el
run con el `FatalRunError` correspondiente.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/preflight.test.ts` — con env/probe satisfechos y un actor conocido, el step resuelve el `ActorProfile` cargado sin ninguna llamada de descarga; una precondición faltante o un actor desconocido lanza el `FatalRunError` correspondiente.
2. **Implement (green):** `src/mastra/steps/preflight.ts` usando `assertPreconditions` (T4) + `loadActorProfile` (T5).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T24 — `mastra/steps`: `discover+rank`

- **Status:** `[ ]`
- **Traces to:** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.3 (nivel de workflow) · design.md Architecture (`discover`, `rank`)
- **Depends on:** T3, T4, T7, T8

**Objective:** El step obtiene los reels de la cuenta vía
`instagram.discoverReels` y los rankea/selecciona con `rankReels`; una
`SessionExpiredError` se traduce a `FatalRunError('ig-session-expired')` y una
cuenta inexistente/inalcanzable/sin reels se traduce a
`FatalRunError('account-not-found')`. `FatalRunError` y sus dos `FatalCode`
usados acá (`ig-session-expired`, `account-not-found`) son los que define
`lib/preflight` (T4), de ahí la dependencia directa con T4 y no solo con T8
(de donde viene `SessionExpiredError`). No depende de la instancia de Mastra
con storage (T13): el step se testea inyectando un `InstagramClient` fake
directo, igual que el resto de los steps de `mastra/steps` (T15–T23), sin
pasar por el contenedor de DI de la instancia — T13 solo hace falta para que
`GET /api/runs/:runId` (T27, T28) pueda leer snapshots persistidos.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/discover-rank.test.ts` — con un `InstagramClient` fake, el step devuelve exactamente `rankReels(reels, top)`; una `SessionExpiredError` de `discoverReels` se propaga como `FatalRunError('ig-session-expired')`; un resultado vacío/cuenta inalcanzable se propaga como `FatalRunError('account-not-found')`.
2. **Implement (green):** `src/mastra/steps/discover-rank.ts` usando `lib/instagram` (T7, T8) + `rankReels` (T3) + `FatalRunError` de `lib/preflight` (T4).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T25 — `mastra/workflows`: `generateScriptsWorkflow`

- **Status:** `[ ]`
- **Traces to:** 5.4, 6.2, 6.3 · design.md Architecture (`generateScriptsWorkflow`)
- **Depends on:** T13, T22, T23, T24

**Objective:** `generateScriptsWorkflow` encadena preflight→discover+rank→
foreach(concurrency 3)→`processReelWorkflow`→assemble; procesa como máximo 3
reels en simultáneo; produce un `RunResult` ordenado por rank que incluye
tanto los reels exitosos como los fallidos; un `FatalRunError` lanzado en
cualquier punto aborta el run entero en vez de convertirse en una falla de
reel. Esta tarea depende también de T13, no solo de T22–T24: al igual que
`processReelWorkflow` (T22), `generateScriptsWorkflow` se construye con
`createWorkflow` de `@mastra/core`, paquete que recién T13 agrega a
`package.json`, y design.md nota que la inyección de los adapters en los
workflows ocurre "a través del contenedor de dependencias de la instancia de
Mastra" — esa instancia es justamente lo que T13 produce. Aunque esa
dependencia ya llega de forma transitiva vía T22, se deja explícita acá por
la misma razón de trazabilidad directa que motivó agregarla en T22, en vez
de confiar en que quien ejecute esta tarea la infiera.

**TDD plan:**

1. **Test (red):** `src/mastra/workflows/generate-scripts.test.ts` — con 5 reels fake y `top: 3`, un contador de "en vuelo" instrumentado en `processReelWorkflow` nunca supera 3, y `RunResult.reels` sale ordenado 1..3; si uno de los reels falla, los otros dos igual aparecen `ok` en el `RunResult`; un `FatalRunError` lanzado desde `discover+rank` hace que el workflow termine abortado en vez de producir un `RunResult` parcial.
2. **Implement (green):** `src/mastra/workflows/generate-scripts.ts` encadenando T22–T24.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T26 — `app/api/runs`: `POST` arranca un run

- **Status:** `[ ]`
- **Traces to:** 5.1 · design.md `app/api/runs` (Interface, Notas) · design.md Data models (`RunInput.scan`)
- **Depends on:** T25

**Objective:** `POST /api/runs` recibe `{account, actor, top}`, valida que
los tres campos estén presentes y con el tipo esperado sin arrancar nada si
no lo son, completa el `RunInput` con `scan: 20` — el Interface de
`app/api/runs` en design.md solo expone `account`/`actor`/`top` en el body,
así que el scan window no es configurable desde esta API y el handler tiene
que agregarlo él mismo antes de invocar el workflow — y arranca
`generateScriptsWorkflow` sin esperar a que termine, respondiendo `201
{runId}` de inmediato.

**TDD plan:**

1. **Test (red):** `src/app/api/runs/route.test.ts` — con el arranque del workflow inyectado/stubbeado (resolviendo después de que termine la request): un body válido `{account, actor, top}` responde `201` con un `runId` antes de que el workflow stub resuelva, y el workflow stub recibe un `RunInput` con `scan: 20` agregado; un body inválido (falta `account` o `actor`, o `top` no es un entero positivo) responde con un status de error sin invocar el arranque del workflow.
2. **Implement (green):** `src/app/api/runs/route.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T27 — Mapeo puro snapshot → `RunView`

- **Status:** `[ ]`
- **Traces to:** 5.3, 5.4, 5.6 · design.md `app/api/runs` ("el mapeo snapshot → RunView es una función pura")
- **Depends on:** T2, T13

**Objective:** Existe una función pura que mapea el snapshot persistido por
Mastra a `RunView`: reels pendientes exponen `currentStep`, reels fallidos
exponen su `reason`, y `error` está presente si y solo si `status` es
`aborted`.

**TDD plan:**

1. **Test (red):** `src/mastra/run-view.test.ts` — un snapshot con un reel a mitad de pipeline mapea a un `ReelView` `pending` con `currentStep`; un snapshot con un reel fallido mapea su `reason`; un snapshot de run abortado mapea `status:'aborted'` con `error.code`/`error.message`, y `error` está ausente en cualquier otro caso.
2. **Implement (green):** `toRunView(snapshot)` en `src/mastra/run-view.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T28 — `app/api/runs/[runId]`: `GET` estado de un run

- **Status:** `[ ]`
- **Traces to:** 5.7 (y expone 5.3–5.6 vía T27) · design.md `app/api/runs`
- **Depends on:** T27, T13

**Objective:** `GET /api/runs/:runId` lee el snapshot del storage de Mastra
para un `runId` conocido y responde `200` con el `RunView` mapeado; un
`runId` desconocido responde `404 {error: 'run not found'}`.

**TDD plan:**

1. **Test (red):** `src/app/api/runs/[runId]/route.test.ts` — un `runId` con snapshot persistido responde `200` con el `RunView` esperado (usando T27); un `runId` sin snapshot responde `404 {error: 'run not found'}`.
2. **Implement (green):** `src/app/api/runs/[runId]/route.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T29 — `app/page.tsx`: formulario de arranque de run

- **Status:** `[ ]`
- **Traces to:** 5.1, 5.2 · design.md `app/page.tsx`
- **Depends on:** T5, T26

**Objective:** La página ofrece exactamente los actores con actor profile
como opciones seleccionables, y enviar cuenta+actor+cantidad de reels
arranca un run vía `POST /api/runs` y transiciona la página a un estado "en
progreso" con el `runId` recibido.

**TDD plan:**

1. **Test (red):** `src/app/page.test.tsx` (React Testing Library) — el select de actor se puebla con exactamente los nombres devueltos por `listActors` sobre un directorio fixture; enviar el formulario llama a `POST /api/runs` y la página pasa a mostrar el `runId` devuelto.
2. **Implement (green):** `src/app/page.tsx` (parte servidor que lista actores + formulario cliente que llama a T26).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T30 — `app/page.tsx`: vista de resultados de un run

- **Status:** `[ ]`
- **Traces to:** 5.3, 5.4, 5.6 · design.md Data models (`RunView`/`ReelView`), Data flow Escenario A/B
- **Depends on:** T2

**Objective:** Existe un componente puro (sin fetch ni timers) que, dado un
`RunView`, renderiza: para cada reel `pending` su `currentStep`; para cada
reel `ok` su rank, métricas, análisis y script; para cada reel `failed` su
motivo en el lugar donde iría el análisis/script. Se separa de la mecánica
de polling (T31) por la misma razón por la que design.md separa el mapeo
`snapshot → RunView` (T27) del route handler que lo usa (T28): es la pieza
más barata de testear aislada, sin timers ni `fetch` mockeados de por medio,
y evita que un test de renderizado tenga que lidiar también con temporizado
asíncrono.

**TDD plan:**

1. **Test (red):** `src/app/results-view.test.tsx` (React Testing Library) — dado un `RunView` con `status: 'running'` y reels mixtos, cada reel `pending` muestra su `currentStep`; dado un `RunView` con `status: 'completed'`, un reel `ok` muestra rank/métricas/análisis/script y un reel `failed` muestra su motivo sin análisis ni script.
2. **Implement (green):** componente `ResultsView({ run: RunView })` (p.ej. `src/app/results-view.tsx`), usando los tipos de `lib/domain` (T2).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T31 — `app/page.tsx`: polling de estado de un run

- **Status:** `[ ]`
- **Traces to:** 5.3 (el mecanismo que mantiene el progreso al día) · design.md `app/page.tsx`, Data flow Escenario A ("La página arranca el polling de `GET /api/runs/:runId` cada ~2 s")
- **Depends on:** T28, T29, T30

**Objective:** Mientras el run arrancado por el formulario (T29) tiene
`status: 'running'`, la página llama `GET /api/runs/:runId` (T28) cada ~2 s,
actualiza su estado con la respuesta y delega el render a `ResultsView`
(T30); deja de pedir en cuanto el `RunView` recibido ya no es `'running'`.

**TDD plan:**

1. **Test (red):** `src/app/run-polling.test.tsx` (React Testing Library + fake timers) — con `fetch` mockeado devolviendo un `RunView` `running`, cada avance de ~2 s dispara exactamente un pedido más a `GET /api/runs/:runId` y re-renderiza `ResultsView` con la respuesta más reciente; en cuanto `fetch` devuelve un `RunView` `completed` (o `aborted`), ningún avance de tiempo posterior dispara un nuevo pedido.
2. **Implement (green):** hook/efecto de polling en `src/app/page.tsx` que arranca tras el submit de T29 y renderiza `ResultsView` (T30) con el `RunView` más reciente.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T32 — `app/page.tsx`: copiar script con un click

- **Status:** `[ ]`
- **Traces to:** 5.5 · design.md `app/page.tsx`
- **Depends on:** T30

**Objective:** Cada script generado tiene un botón que lo copia al
portapapeles en una sola acción.

**TDD plan:**

1. **Test (red):** `src/app/copy-script-button.test.tsx` — clickear el botón de copiar de un reel llama a la API de clipboard con exactamente el texto del script de ese reel.
2. **Implement (green):** componente `CopyScriptButton` integrado en la vista de resultados (T30).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

### T33 — README: documentar el sessionid de una cuenta quemable

- **Status:** `[ ]`
- **Traces to:** 7.4 · design.md (ninguna sección de código; requisito operativo)
- **Depends on:** none

**Objective:** El README documenta que `IG_SESSION_ID` debe salir de una
cuenta de Instagram quemable dedicada, nunca de la cuenta real de Syntex.

**TDD plan:**

1. **Test (red):** revisar `README.md` — hoy no menciona el origen del `sessionid`, así que el criterio 7.4 no está cumplido.
2. **Implement (green):** agregar al README una sección de configuración que indique explícitamente que `IG_SESSION_ID` debe provenir de una cuenta quemable, no de la cuenta real de Syntex.
3. **Verify:** revisión manual del párrafo agregado (no aplica test automatizado — es contenido de documentación).

**Decision log:** *(empty until this task is worked on)*

**Outcome:** *(fill in when Done)*

---

## Open items

- `requirements.md` cita `docs/research/ig-tools-bench/REPORT.md` como base
  de la elección de `insta-fetcher`, pero ese archivo no existe en el repo
  actual. No bloquea el plan, pero T7 va a necesitar fixtures de payload de
  `api/v1` armados a mano (o capturados de nuevo) en ausencia de ese
  research doc.
- `design.md` no fija el paquete exacto del provider de OpenRouter para el
  AI SDK (solo dice "el proveedor OpenRouter del AI SDK"); queda para
  resolverse durante T11/T12, agregando la dependencia elegida recién ahí.
