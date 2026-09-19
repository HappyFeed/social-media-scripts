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
- [x] **T7** — `lib/instagram`: `createInstagramClient` (discover/hydrate/download)
- [x] **T8** — `lib/instagram`: `SessionExpiredError` y retry con backoff
- [x] **T9** — `lib/instagram`: límite de concurrencia `hydrateConcurrency`
- [x] **T10** — `lib/media`: `createFfmpegExtractor`
- [x] **T11** — `lib/openrouter`: `TranscriptionClient`
- [x] **T12** — `lib/openrouter`: `CompletionClient` con schema y retry
- [x] **T13** — `mastra/index`: instancia de Mastra con storage
- [x] **T14** — `mastra/steps`: helper de fallo-como-valor por step
- [x] **T15** — `mastra/steps`: `hydrate`
- [x] **T16** — `mastra/steps`: `downloadVideo`
- [x] **T17** — `mastra/steps`: `extractAudio`
- [x] **T18** — `mastra/steps`: `transcribe`
- [x] **T19** — `mastra/steps`: `analyze`
- [x] **T20** — `mastra/steps`: `generateScript`
- [x] **T21** — `mastra/steps`: `cleanup`
- [x] **T22** — `mastra/workflows`: `processReelWorkflow`
- [x] **T23** — `mastra/steps`: `preflight`
- [x] **T24** — `mastra/steps`: `discover+rank`
- [x] **T25** — `mastra/workflows`: `generateScriptsWorkflow`
- [x] **T26** — `app/api/runs`: `POST` arranca un run
- [x] **T27** — Mapeo puro snapshot → `RunView`
- [x] **T28** — `app/api/runs/[runId]`: `GET` estado de un run
- [x] **T29** — `app/page.tsx`: formulario de arranque de run
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

- **Status:** `[x]`
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

**Decision log:**

- El paquete `insta-fetcher@1.4.0` no trae tipos completos del payload
  crudo de `api/v1` (p.ej. `ReelMedia` no declara `taken_at`, y `IRawBody`
  tipa un `Item` gigante con decenas de campos irrelevantes). En vez de
  castear a `any` o depender de esos tipos incompletos/ruidosos, el
  adapter define sus propios tipos `RawUserReelResponse`/
  `RawPostByMediaIdResponse` con solo los campos que efectivamente lee, y
  castea la respuesta de `insta-fetcher` a esos tipos (`as unknown as
  Raw...`). Los fixtures de los tests se armaron a mano siguiendo la forma
  documentada de la API v1 privada de Instagram (confirmada contra el
  `.d.ts` empaquetado de `insta-fetcher@1.4.0`), ya que
  `docs/research/ig-tools-bench/REPORT.md` (citado en `requirements.md`)
  no existe en el repo — ver Open items.
- `downloadVideo` pide el video con `axios` en modo `arraybuffer` (no
  streaming) y lo escribe entero con `fs/promises.writeFile`: los reels
  son clips cortos, y bufferear en memoria simplifica tanto la
  implementación como el test (sin fakes de stream) sin costo real dado
  el tamaño esperado del archivo.
- `createInstagramClient` acepta `hydrateConcurrency` y `retry` en su
  firma (tal cual el Interface completo de design.md) pero todavía no los
  usa — arrancan sin comportamiento hasta T8 (retry/backoff +
  `SessionExpiredError`) y T9 (límite de concurrencia), mismo patrón que
  T4 dejó los seis `FatalCode` definidos aunque solo produjera tres.
- `SessionExpiredError` no se define en esta tarea: el Interface de
  design.md la incluye a nivel de módulo, pero la tarea que la traza y
  prueba es T8, así que queda para ahí.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/instagram/client.ts`
expone `createInstagramClient`, `InstagramClient`, `DiscoveredReel`,
`HydratedReel`, respaldado por `insta-fetcher@1.4.0` (pineado exacto) y
`axios` para la descarga de video.

### T8 — `lib/instagram`: `SessionExpiredError` y retry con backoff

- **Status:** `[x]`
- **Traces to:** 6.4, 7.3 (nivel de módulo) · design.md `lib/instagram` Notas
- **Depends on:** T7

**Objective:** Un HTTP 403 en cualquier llamada del cliente lanza
`SessionExpiredError` de inmediato sin reintentar; cualquier otra falla
transitoria se reintenta con backoff exponencial antes de propagarse.

**TDD plan:**

1. **Test (red):** `src/lib/instagram/resilience.test.ts` — un transporte fake que devuelve 403 rechaza con `SessionExpiredError` sin reintentar; un transporte que falla dos veces (p.ej. 500) y luego resuelve, resuelve tras reintentar con delays crecientes; uno que siempre falla rechaza tras agotar los intentos configurados.
2. **Implement (green):** wrapper de retry/backoff + `SessionExpiredError`, aplicado dentro de `createInstagramClient` (T7).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- `withInstagramRetry(fn, retry, sleep)` vive en un archivo nuevo,
  `src/lib/instagram/resilience.ts`, en vez de agregarse dentro de
  `client.ts` — es una pieza independiente y genéricamente testeable
  (no depende de `insta-fetcher` ni de Axios), y `client.ts` la importa y
  re-exporta `SessionExpiredError` para que el resto del código siga
  pudiendo hacer `import { SessionExpiredError } from
  'lib/instagram/client'` como un único punto de entrada del módulo, tal
  cual lo agrupa design.md.
- El wrapper acepta un tercer parámetro opcional `sleep` (default
  `setTimeout` real) para poder testear los delays crecientes sin
  esperarlos de verdad ni depender de fake timers de vitest — los tests
  inyectan un `sleep` espía y verifican los milisegundos exactos con los
  que se lo llamó.
- Detección de sesión expirada: se decidió duck-typear
  `error.response.status === 403` (la forma de un `AxiosError`) en vez de
  importar el tipo de error de Axios, porque tanto `insta-fetcher` (que
  usa Axios internamente) como el `axios.get` directo de `downloadVideo`
  producen errores con esa forma, y así el wrapper no acopla su firma a
  un tipo de librería externa.
- Backoff: `baseDelayMs * 2 ** intentoIndex` (intentoIndex arrancando en
  0 para el primer reintento), sin jitter — design.md solo pide "backoff
  exponencial" sin fijar la fórmula exacta, y esto alcanza para que el
  test de "delays crecientes" sea determinístico.
- Default de `retry` cuando `createInstagramClient` no lo recibe:
  `{ attempts: 3, baseDelayMs: 500 }` (`DEFAULT_RETRY`) — design.md no fija
  un default explícito para este campo (a diferencia de
  `hydrateConcurrency`, que sí trae 5 documentado), así que se eligió un
  valor conservador consistente con el resto del sistema.
- Los tres métodos de `createInstagramClient` (`discoverReels`,
  `hydrateReel`, `downloadVideo`) quedan envueltos en
  `withInstagramRetry`, tal cual pide design.md ("un HTTP 403 en
  cualquier llamada del cliente"), no solo los dos que después consumen
  los steps `discover`/`hydrate` de T24.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/instagram/resilience.ts`
expone `SessionExpiredError`, `RetryOptions`, `DEFAULT_RETRY`,
`withInstagramRetry`; `client.ts` envuelve sus tres llamadas HTTP con el
wrapper y re-exporta `SessionExpiredError`.

### T9 — `lib/instagram`: límite de concurrencia `hydrateConcurrency`

- **Status:** `[x]`
- **Traces to:** 6.5 · design.md `lib/instagram` Notas
- **Depends on:** T7

**Objective:** El cliente nunca deja más de `hydrateConcurrency` llamadas a
`hydrateReel` en vuelo a la vez, como red de seguridad independiente del
límite de concurrencia de 3 reels del workflow.

**TDD plan:**

1. **Test (red):** `src/lib/instagram/concurrency.test.ts` — al pedir `hydrateReel` para 10 `mediaId` en simultáneo con `hydrateConcurrency: 2`, un contador de llamadas en vuelo (vía transporte fake) nunca supera 2; al omitir `hydrateConcurrency` y pedir `hydrateReel` para 10 `mediaId` en simultáneo, ese mismo contador nunca supera el default de 5 (`REEL_FETCH_CONCURRENCY`).
2. **Implement (green):** limitador de concurrencia (semáforo simple) aplicado a `hydrateReel` en `createInstagramClient`, con default 5 vía `REEL_FETCH_CONCURRENCY`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- El semáforo vive en `src/lib/instagram/concurrency.ts`
  (`createSemaphore(limit)` con un único método `run(fn)`), separado de
  `client.ts`, siguiendo el mismo criterio que T8: es una pieza genérica
  y testeable de forma aislada de `insta-fetcher`/Axios, aunque acá el
  test la ejercita a través de `createInstagramClient` en vez de en
  aislamiento — con un semáforo genérico alcanza con probar que
  `hydrateReel` respeta el límite, no hace falta un test unitario
  aparte del semáforo mismo.
- El límite solo envuelve `hydrateReel`, no `discoverReels` ni
  `downloadVideo`: el Objective y el design.md de esta tarea son
  explícitos en que `hydrateConcurrency` es una red de seguridad
  específica de las llamadas a `hydrateReel` (6.5), independiente del
  límite de 3 reels en simultáneo que impone el workflow (6.3) sobre el
  pipeline completo por reel — no un límite global del cliente.
- `REEL_FETCH_CONCURRENCY` se implementó como una constante exportada
  (`export const REEL_FETCH_CONCURRENCY = 5`) en `client.ts`, no como una
  variable de entorno: el nombre aparece así en el comentario del
  Interface de design.md, pero a diferencia de `IG_SESSION_ID`/
  `OPENROUTER_API_KEY` (que sí son env vars reales, consumidas por
  `lib/preflight`), acá nombra el default del parámetro
  `hydrateConcurrency`, no una fuente de configuración por entorno.
- El test de "cuenta en vuelo" usa un mock de `fetchPostByMediaId` que
  incrementa/decrementa un contador alrededor de un `setTimeout` real de
  10 ms (sin fake timers) y dispara 10 llamadas en simultáneo vía
  `Promise.all`; se resetea el mock en `beforeEach` porque ambos tests
  del archivo comparten el mismo mock a nivel de módulo (`vi.mock`
  arriba del `describe`), y sin el reset los conteos de llamadas del
  primer test se arrastraban al segundo.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/instagram/concurrency.ts`
expone `createSemaphore`; `client.ts` exporta `REEL_FETCH_CONCURRENCY` y
usa un semáforo para limitar `hydrateReel` a `opts.hydrateConcurrency ??
REEL_FETCH_CONCURRENCY` llamadas en simultáneo.

### T10 — `lib/media`: `createFfmpegExtractor`

- **Status:** `[x]`
- **Traces to:** 2.3 · design.md `lib/media`
- **Depends on:** T1

**Objective:** Existe un adapter que invoca `ffmpeg` vía `child_process` para
convertir un video en mp3 mono a 16 kHz y devuelve el path y tamaño en bytes
del archivo resultante.

**TDD plan:**

1. **Test (red):** `src/lib/media.test.ts` — con `child_process` inyectado/mockeado, `extractAudio` invoca `ffmpeg` con argumentos que producen mp3 mono 16 kHz y resuelve `{ path, sizeBytes }` a partir del archivo producido; un spawn con exit code distinto de 0 rechaza.
2. **Implement (green):** `createFfmpegExtractor`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- El test mockea `node:child_process` (`spawn`) y `node:fs/promises`
  (`stat`) completos vía `vi.mock`, en vez de inyectar esas dependencias
  por parámetro — el Interface de design.md solo expone
  `createFfmpegExtractor(ffmpegBin?: string)`, sin punto de inyección
  para el transporte, así que se testea al mismo nivel que T7/T8/T9
  mockearon `insta-fetcher`/`axios`: el módulo de Node, no un adapter
  propio.
- El proceso fake del spawn es un `EventEmitter` real de Node
  (`node:events`) en vez de un objeto a mano con `.on`/`.emit`
  reimplementados — cubre la forma real de `ChildProcess` (que también
  es un `EventEmitter`) sin duplicar esa lógica en el test.
- Argumentos de ffmpeg fijados exactamente:
  `-y -i <videoPath> -vn -ac 1 -ar 16000 -acodec libmp3lame <destPath>`
  — `-vn` descarta el video, `-ac 1`/`-ar 16000` fuerzan mono a 16 kHz
  (2.3), `-acodec libmp3lame` fija el encoder de mp3 en vez de confiar
  en que ffmpeg lo infiera de la extensión de `destPath`, y `-y`
  sobreescribe sin preguntar si `destPath` ya existiera de un intento
  previo.
- Un `exit code` distinto de 0 rechaza con un `Error` genérico (mensaje
  incluye "ffmpeg" y el código) sin necesidad de un tipo de error
  dedicado — a diferencia de `SessionExpiredError`/`FatalRunError`, nada
  en requirements.md distingue este fallo por código, así que no hay
  necesidad de una clase de error específica: el step `extractAudio`
  (T17) solo necesita que la promesa rechace para marcar el reel
  `failed`.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/media.ts` expone
`AudioExtractor`, `createFfmpegExtractor`.

### T11 — `lib/openrouter`: `TranscriptionClient`

- **Status:** `[x]`
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

**Decision log:**

- design.md agrupa `TranscriptionClient` y `CompletionClient` bajo una
  única factory pública, `createOpenRouterClients(opts): {transcription,
  completion}`. Ni el TDD plan de esta tarea ni el de T12 piden esa
  factory combinada — ambos apuntan a archivos separados
  (`transcription.ts`/`completion.ts`) y a construir cada cliente por su
  cuenta (`TranscriptionClient`, `AudioTooLargeError` acá;
  `CompletionClient` en T12) — y ningún step downstream (T18-T20) la
  invoca: reciben `TranscriptionClient`/`CompletionClient` inyectados
  directo como fakes en sus tests. Se decidió entonces exportar
  `createTranscriptionClient(opts)` en vez de construir de una la factory
  combinada del design; queda como open item (ver Open items) armar
  `createOpenRouterClients` como wrapper delgado sobre
  `createTranscriptionClient` + `createCompletionClient` si en algún
  punto hace falta un único punto de wiring para el contenedor de DI real
  de Mastra — no bloquea nada de lo que sí cubre este `tasks.md`.
- `createTranscriptionClient(opts, httpClient?)` toma un segundo
  parámetro opcional para el cliente HTTP (con default `axios`), a
  diferencia de T7-T10 que mockearon el módulo completo (`insta-fetcher`/
  `axios`/`node:child_process` vía `vi.mock`). El propio TDD plan de esta
  tarea habla de "el cliente HTTP inyectado", así que acá sí se optó por
  inyección explícita por parámetro en vez de mockear el módulo — más
  simple de testear sin `vi.mock`, y no rompe el Interface público de
  design.md porque el parámetro es opcional con un default funcional.
- `TRANSCRIPTION_MODEL` en `src/lib/models.ts` se fijó en
  `'openai/whisper-1'` como identificador de modelo plausible para el
  endpoint de OpenRouter — el valor exacto no afecta ningún test (la
  petición HTTP está mockeada) y queda centralizado en un solo archivo
  para poder ajustarlo sin tocar `transcription.ts` si el nombre real del
  modelo en OpenRouter difiere.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/openrouter/transcription.ts`
expone `TranscriptionClient`, `AudioTooLargeError`,
`createTranscriptionClient`; `src/lib/models.ts` expone
`TRANSCRIPTION_MODEL`.

### T12 — `lib/openrouter`: `CompletionClient` con schema y retry

- **Status:** `[x]`
- **Traces to:** 3.2, 3.3, 3.4, 4.3, 4.4 · design.md `lib/openrouter`
- **Depends on:** T1

**Objective:** `complete({model, prompt, schema})` valida la respuesta contra
el schema Zod dado, reintenta exactamente una vez ante una respuesta
inválida, y desiste tras el segundo fallo.

**TDD plan:**

1. **Test (red):** `src/lib/openrouter/completion.test.ts` — un provider fake que devuelve un payload inválido y luego uno válido resuelve tras exactamente un reintento; uno que devuelve inválido dos veces seguidas rechaza tras ese único reintento; uno que devuelve válido de entrada resuelve sin reintentar.
2. **Implement (green):** `CompletionClient` con retry-once, entradas de modelo de análisis/script en `src/lib/models.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- Se agregaron `ai` (Vercel AI SDK, `generateObject`) y
  `@openrouter/ai-sdk-provider` (`createOpenRouter`) como las
  dependencias reales que resuelven el punto pendiente de Open items
  ("el proveedor OpenRouter del AI SDK" sin paquete fijado en
  design.md).
- Igual que T11 con el `httpClient` inyectable, `createCompletionClient`
  toma un segundo parámetro opcional `provider: CompletionProvider` (con
  default real armado sobre `generateObject` + `createOpenRouter`), en
  vez de mockear los módulos `ai`/`@openrouter/ai-sdk-provider` con
  `vi.mock`. El TDD plan habla de "un provider fake", reforzando que la
  inyección explícita es el mecanismo de test esperado acá.
- División de responsabilidades entre `CompletionProvider.generate` y
  `CompletionClient.complete`: `generate` le pasa el schema al proveedor
  real (para aprovechar la generación restringida a schema del AI SDK) y
  devuelve el resultado *sin* validarlo; `complete` es quien hace
  `schema.safeParse` y decide si reintenta. Así el retry-once (3.3, 3.4,
  4.4) es responsabilidad exclusiva de `complete`, independiente de que
  el proveedor real ya intente cumplir el schema por su cuenta — el test
  con "provider fake" que devuelve payloads inválidos ejercita
  exactamente esa capa de validación/retry sin depender del
  comportamiento interno de `generateObject`.
- Un segundo fallo de validación rechaza con un `Error` genérico (sin
  clase dedicada), mismo criterio que T10: nada en requirements.md
  distingue este fallo por código; los steps `analyze`/`generateScript`
  (T19/T20) solo necesitan que la promesa rechace para mapearlo a su
  propio mensaje ("invalid analysis/script response").
- `ANALYSIS_MODEL`/`SCRIPT_MODEL` en `src/lib/models.ts` se fijaron en
  `'anthropic/claude-3.5-sonnet'` como placeholders plausibles de
  OpenRouter (ningún test pega contra la red real); quedan centralizados
  para poder cambiarlos sin tocar `completion.ts` ni los steps que los
  consuman.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/lib/openrouter/completion.ts`
expone `CompletionClient`, `CompletionProvider`, `createCompletionClient`;
`src/lib/models.ts` agrega `ANALYSIS_MODEL`, `SCRIPT_MODEL`.

### T13 — `mastra/index`: instancia de Mastra con storage

- **Status:** `[x]`
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

**Decision log:**

- **Bloqueante de entorno descubierto y resuelto en esta tarea:** toda
  versión `1.x` de `@mastra/core` (incluida la última, `1.67.0`) declara
  `engines.node: '>=22.13.0'`. La máquina de desarrollo tenía Node
  `v20.19.0` activo, así que `npm install @mastra/core` sin pin de
  versión resolvía silenciosamente a `0.24.9` (la última pre-1.0,
  `engines.node: '>=20'`), cuya API de storage es estructuralmente
  distinta (sin `MastraCompositeStore`/`InMemoryStore`/`getStore()`) de
  la que design.md y el resto de este `tasks.md` asumen. Se confirmó con
  el usuario actualizar Node en vez de programar contra la API vieja: la
  máquina ya tenía Node `v22.2.0` instalado vía `nvm-windows` pero no
  activo (`nvm use` requiere una terminal elevada, que la sesión de
  ejecución no tenía); el usuario lo activó manualmente y a partir de ahí
  `npm install @mastra/core@1.67.0 --save-exact` instaló limpio. Nota:
  `v22.2.0` sigue técnicamente por debajo del piso declarado
  (`>=22.13.0`) — `npm` solo emite un warning `EBADENGINE`, no bloquea —
  y typecheck/tests corren bien sobre esa versión, pero si algo de
  `mastra/*` falla de forma rara más adelante, subir el patch de Node a
  `22.13+` es el primer sospechoso a descartar.
- `@mastra/core` quedó pineado exacto (`"@mastra/core": "1.67.0"`, sin
  `^`) en vez de con rango — a diferencia de `insta-fetcher` (pineado
  exacto porque design.md lo pide explícitamente), acá se pineó por
  precaución dado lo reciente del soporte de Node 22 y la superficie
  enorme del paquete: un bump de minor/patch automático es más riesgoso
  de lo habitual mientras el resto de `mastra/*` (T14-T25) todavía no
  está escrito.
- Storage: `InMemoryStore` de `@mastra/core/storage` (sin agregar
  `@mastra/libsql` ni ningún otro adapter) — es exactamente el "adapter
  en memoria" que sugiere el Objective de esta tarea, no requiere
  dependencias adicionales, y el design explícitamente deja fuera de
  alcance persistir runs entre reinicios del proceso.
- El test ronda-trip usa `createEmptyWorkflowSnapshot(runId)` (exportado
  por `@mastra/core/storage`) para construir el snapshot fake en vez de
  armar un objeto a mano: garantiza una forma válida de
  `WorkflowRunState` real sin tener que replicar esa forma compleja en
  el test, y sigue probando exactamente el round-trip pedido
  (`persistWorkflowSnapshot` → `loadWorkflowSnapshot` devuelve el mismo
  contenido).
- El acceso al dominio de storage es vía `mastra.getStorage()` +
  `storage.getStore('workflows')` (ambos `async`/nullable en la API de
  1.67.0) en vez de un helper propio (`persistRunSnapshot`/
  `loadRunSnapshot`) en `mastra/index.ts` — el Objective solo pide que
  el snapshot "se pueda" persistir/releer por id, y T27/T28 son quienes
  van a necesitar decidir la forma exacta de esa lectura para el mapeo a
  `RunView`; no tiene sentido adelantar esa envoltura acá sin saber
  todavía qué necesitan.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/index.ts` expone
`mastra`, una instancia de `Mastra` (`@mastra/core@1.67.0`, pineado
exacto) con `InMemoryStore` como storage.

**Addendum (T27):** esta tarea originalmente instanciaba `Mastra` solo
con `storage`. T27 amplió esa instancia para registrar
`workflows: {generateScriptsWorkflow, processReelWorkflow}` —
imprescindible para que los sub-runs por reel del `foreach` de
`generateScriptsWorkflow` persistan y sean consultables. Ver el decision
log de T27 para el detalle completo.

### T14 — `mastra/steps`: helper de fallo-como-valor por step

- **Status:** `[x]`
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

**Decision log:**

- `runPipelineStep<TIn extends ReelBase, TOut>(stepName, input: TIn |
  FailedReel, fn: (input: TIn) => Promise<TOut>): Promise<TOut |
  FailedReel>` reutiliza `ReelBase`/`PipelineStep` de `lib/domain` (T2)
  en vez de definir tipos nuevos — `FailedReel` es exactamente la rama
  `failed` de `ReelOutcome` (`ReelBase & {status:'failed', failedStep,
  reason}`), así que el helper encaja directo con el tipo que ya existe
  para el resultado final de un reel, sin duplicar esa forma.
- Detección de "input ya failed" vía un type guard
  (`isFailedReel(input): input is FailedReel`) que chequea
  `'status' in input && input.status === 'failed'` — los reels sanos que
  circulan entre steps (T15-T20) nunca tienen campo `status` hasta que
  fallan, así que esta detección no da falsos positivos con inputs
  intermedios (p.ej. un reel ya hidratado antes de pasar por
  `downloadVideo`).
- El `reason` de un fallo usa `error.message` cuando el valor lanzado es
  un `Error`, y `String(error)` en cualquier otro caso — cubre el caso
  (poco común pero posible en JS) de que un step lance un valor no-Error.
- Se agregó una tercera prueba (además de las dos del TDD plan) para el
  caso feliz explícito: `fn` que resuelve, dado un input sano, devuelve
  el resultado de `fn` tal cual — cierra el contrato completo del helper
  (failed-pasa-derecho / throw-se-convierte-en-failed / éxito-pasa-el-
  resultado) del que T15-T20 van a depender.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/pipeline-step.ts`
expone `runPipelineStep`, `FailedReel`.

### T15 — `mastra/steps`: `hydrate`

- **Status:** `[x]`
- **Traces to:** 2.1 · design.md Architecture (`hydrate`)
- **Depends on:** T7, T14

**Objective:** El step `hydrate` adjunta caption/videoUrl/duration a un reel
sano vía `instagram.hydrateReel`; si la llamada falla, el reel queda `failed`
en el step `hydrate`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/hydrate.test.ts` — con un `InstagramClient` fake, un reel sano termina con caption/videoUrl/durationSeconds adjuntos; un `hydrateReel` que rechaza produce `{status:'failed', failedStep:'hydrate'}`.
2. **Implement (green):** `src/mastra/steps/hydrate.ts` usando `runPipelineStep` (T14) + `instagram.hydrateReel` (T7).
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- `ReelBase` (T2) no incluye `mediaId` — es un identificador interno de
  Instagram que no forma parte de lo que la UI necesita ver (`ReelView`/
  `ReelOutcome` tampoco lo exponen). El input sano de este step se tipó
  como `ReelToHydrate extends ReelBase { mediaId: string }`, un tipo
  nuevo y local a `hydrate.ts`: el reel trae `mediaId` mientras viaja
  internamente por el pipeline (viene de `discover+rank`, T24) pero se
  descarta en el `assemble` final, igual que otros campos internos que
  no llegan a `ReelBase`.
- El segundo parámetro del step es `Pick<InstagramClient,
  'hydrateReel'>`, no `InstagramClient` completo — el step solo necesita
  esa capacidad, y acotar el tipo evita que el fake de test tenga que
  implementar `discoverReels`/`downloadVideo` sin usarlos.
- Sin sorpresas de implementación: es una aplicación directa de
  `runPipelineStep` (T14) sobre `instagram.hydrateReel` (T7), tal cual
  preveía el design.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/hydrate.ts`
expone `ReelToHydrate`, `hydrate`.

### T16 — `mastra/steps`: `downloadVideo`

- **Status:** `[x]`
- **Traces to:** 2.2 · design.md Architecture (`downloadVideo`)
- **Depends on:** T7, T14

**Objective:** El step `downloadVideo` descarga el video de un reel hidratado
a un path local vía `instagram.downloadVideo`; una descarga fallida deja el
reel `failed` en `download`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/download-video.test.ts` — con un `InstagramClient` fake, éxito adjunta un path local de video; un rechazo produce `failed('download')`.
2. **Implement (green):** `src/mastra/steps/download-video.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- design.md no fija una convención de paths para archivos temporales;
  se decidió `join(os.tmpdir(), \`${mediaId}.mp4\`)` — usa el directorio
  temporal del SO (no un directorio propio del proyecto) y el `mediaId`
  como nombre de archivo (único por reel, ya disponible en el reel
  hidratado). `extractAudio` (T17) va a seguir el mismo criterio para el
  mp3 resultante, y `cleanup` (T21) borra ambos paths al terminar el
  reel.
- `HydratedReelForDownload extends ReelBase { mediaId, caption, videoUrl,
  durationSeconds }` es el tipo de salida exacto de `hydrate` (T15) más
  `mediaId` — se define localmente en `download-video.ts` en vez de
  importarlo de `hydrate.ts`, porque `hydrate.ts` no exporta un tipo para
  su salida en caso `ok` (solo la firma de la función); redefinirlo acá
  documenta explícitamente qué campos necesita este step en particular.
- El segundo parámetro es `Pick<InstagramClient, 'downloadVideo'>`,
  mismo criterio de acotar capacidades que T15 con `hydrateReel`.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/download-video.ts`
expone `HydratedReelForDownload`, `downloadVideo`.

### T17 — `mastra/steps`: `extractAudio`

- **Status:** `[x]`
- **Traces to:** 2.3 · design.md Architecture (`extractAudio`)
- **Depends on:** T10, T14

**Objective:** El step `extractAudio` produce el mp3 mono 16 kHz de un reel
descargado vía `media.extractAudio`; una falla de ffmpeg deja el reel
`failed` en `extract-audio`.

**TDD plan:**

1. **Test (red):** `src/mastra/steps/extract-audio.test.ts` — con un `AudioExtractor` fake, éxito adjunta `audioPath` y `sizeBytes`; un rechazo produce `failed('extract-audio')`.
2. **Implement (green):** `src/mastra/steps/extract-audio.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- `DownloadedReelForAudio extends HydratedReelForDownload { videoPath:
  string }` importa y extiende el tipo de salida de T16 (`hydrate.ts`
  hizo lo mismo con `ReelBase` de T2) en vez de redefinir todos los
  campos desde cero — encadena la forma real de cómo el reel acumula
  campos step a step.
- Mismo criterio de paths que T16: `join(os.tmpdir(), \`${mediaId}.mp3\`)`
  para el destino del audio.
- El segundo parámetro es `Pick<AudioExtractor, 'extractAudio'>` (mismo
  patrón de acotar capacidades que T15/T16 con `InstagramClient`).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/extract-audio.ts`
expone `DownloadedReelForAudio`, `extractAudio`.

### T18 — `mastra/steps`: `transcribe`

- **Status:** `[x]`
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

**Decision log:**

- Este es el único step (junto con `cleanup`, T21) cuyo uso de
  `runPipelineStep` (T14) no es directo: `runPipelineStep` siempre marca
  un fallo con el `stepName` que se le pasó, pero acá un
  `AudioTooLargeError` tiene que aterrizar como `failed('extract-audio',
  'audio too large')`, no como `failed('transcribe', ...)` — un
  `failedStep` distinto del nombre del step que lo detecta. Se resolvió
  sin bypassear `runPipelineStep` (a diferencia de `cleanup`, que sí lo
  hace): dentro de la función que le pasamos, un `AudioTooLargeError` se
  atrapa y se devuelve como resultado "exitoso" con un marcador interno
  (`{...reel, audioTooLarge: true}`) en vez de volver a lanzar; después
  de que `runPipelineStep` resuelve, `transcribe()` detecta ese marcador
  y recién ahí arma el `FailedReel` con el `failedStep`/`reason`
  correctos. Cualquier otro error sigue lanzándose tal cual, así que
  `runPipelineStep` lo captura con su comportamiento genérico
  (`failed('transcribe', error.message)`) sin código extra. Esto preserva
  el passthrough de un input ya `failed` (T14) sin duplicar esa lógica.
- El marcador (`audioTooLarge: true`) es un campo plano, no un `Symbol`
  ni un valor lanzado — se probó primero con un `Symbol` como key
  computada y quedó más difícil de leer que simplemente chequear `'
  audioTooLarge' in result`, dado que ninguna otra parte del código usa
  `Symbol` para esto.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/transcribe.ts`
expone `ReelForTranscription`, `transcribe`.

### T19 — `mastra/steps`: `analyze`

- **Status:** `[x]`
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

**Decision log:**

- A diferencia de T18, acá el `failedStep` no cambia (siempre `'analyze'`),
  solo el `reason` necesita ser el string fijo `'invalid analysis
  response'` en vez de propagar el mensaje real del error que lanzó
  `CompletionClient.complete` (que ya hizo su propio retry-once
  internamente, T12). Alcanza con un `try/catch` local dentro de la
  función que le pasamos a `runPipelineStep` que relanza un `Error` con
  ese mensaje fijo — no hace falta el mecanismo de marcador de T18,
  porque acá el `failedStep` de destino coincide con el `stepName` que ya
  se le pasa a `runPipelineStep`.
- `ReelForAnalysis extends ReelForTranscription { transcript: string }`
  sigue la misma cadena de tipos que los steps anteriores (T15-T18):
  cada uno extiende la salida `ok` del anterior.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/analyze.ts`
expone `ReelForAnalysis`, `analyze`.

### T20 — `mastra/steps`: `generateScript`

- **Status:** `[x]`
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

**Decision log:**

- `generateScript(input, openrouter, profile)` recibe el `ActorProfile`
  como tercer parámetro en vez de como campo del reel: el profile es el
  mismo para los N reels de un run (lo carga `preflight`, T23, una sola
  vez), no algo que viaje reel por reel como `mediaId`/`caption`/etc., así
  que no tiene sentido acumularlo en el tipo `ReelForScript`.
- Mismo patrón que T19 para el mapeo de error: `try/catch` local dentro
  de la función de `runPipelineStep` que relanza `Error('invalid script
  response')`, porque acá tampoco cambia el `failedStep` (sigue siendo
  `'generate-script'`, el mismo `stepName`).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/generate-script.ts`
expone `ReelForScript`, `generateScript`.

### T21 — `mastra/steps`: `cleanup`

- **Status:** `[x]`
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

**Decision log:**

- `cleanup<T extends { videoPath?: string; audioPath?: string }>(input:
  T, fs): Promise<T>` es genérico sobre cualquier forma de reel que
  llegue al final del pipeline (`ok` con `script`, o `failed` en
  cualquiera de los seis steps anteriores) — no importa qué otros campos
  tenga, solo mira `videoPath`/`audioPath` si están presentes. Devuelve
  el mismo objeto (`input`) sin copiarlo ni tocar ningún otro campo,
  cumpliendo literalmente "devuelve el outcome sin modificarlo".
- `FilesystemForCleanup { unlink(path): Promise<void> }` es la única
  capacidad que este step necesita del filesystem — se inyecta en vez de
  importar `node:fs/promises` directo, siguiendo el mismo criterio de
  capacidades acotadas que T15/T16/T17 (`Pick<...>` sobre sus adapters).
- Sin sorpresas respecto a lo ya documentado en el Objective de esta
  tarea (que explica por qué no usa `runPipelineStep`, T14): acá se
  confirma esa decisión al implementarla — el borrado tiene que correr
  siempre, tanto en el camino `ok` como `failed`, que es exactamente lo
  opuesto al passthrough-sin-ejecutar de `runPipelineStep` sobre un input
  ya `failed`.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/cleanup.ts`
expone `FilesystemForCleanup`, `cleanup`.

### T22 — `mastra/workflows`: `processReelWorkflow`

- **Status:** `[x]`
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

**Decision log:**

- **Inyección de dependencias:** cada step de T15-T21 es una función
  plana `(input, adapter, [profile])`, no un `Step` de Mastra — así que
  hubo que decidir cómo le llegan `InstagramClient`/`AudioExtractor`/
  `TranscriptionClient`/`CompletionClient`/`ActorProfile` (y el
  filesystem de `cleanup`) a cada `execute()` de Mastra, que solo recibe
  `{inputData, requestContext, mastra, ...}` — no parámetros custom. Se
  usó `requestContext.setRaw/getRaw` (API real de
  `@mastra/core/request-context`) con una única clave
  (`PROCESS_REEL_DEPS_KEY`) que guarda un objeto `ProcessReelDeps` con
  los seis adapters/perfil juntos, en vez de declarar un
  `requestContextSchema` tipado por Zod para cada uno — es la vía
  "raw" del propio `RequestContext` (pensada justo para valores
  runtime-only que no forman parte de un schema validado), y evita tener
  que modelar en Zod objetos que son instancias de clases/funciones, no
  datos serializables. Quien arranca el run (T25) es responsable de
  construir el `RequestContext` con esta clave antes de llamar
  `run.start()`.
- **`export const processReelWorkflow`** es un objeto `Workflow` real de
  `@mastra/core/workflows` (`createWorkflow(...).then(...).commit()`),
  no una función — coincide con el comentario de design.md ("ReelInput ->
  ReelOutcome") en el sentido de que ejecutarlo (`.createRun()` +
  `.start({inputData, requestContext})`) tiene ese efecto, pero el valor
  exportado en sí es el objeto workflow, para que T25
  (`generateScriptsWorkflow`) pueda encadenarlo como step de su propio
  `foreach` — un `Workflow` implementa la interfaz `Step` en
  `@mastra/core`, así que esto es composición nativa de la librería, no
  un truco.
- **Schemas de cada step:** en vez de modelar cada tipo intermedio
  (`ReelToHydrate`, `HydratedReelForDownload | FailedReel`, etc.) como un
  `z.object({...})` que replique campo por campo la interfaz TS ya
  existente, se usó `z.custom<T>()` (sin predicado, acepta cualquier
  valor en runtime) para cada `inputSchema`/`outputSchema`. Los tipos TS
  de T15-T21 ya son la fuente de verdad de la forma de estos objetos
  internos del pipeline — no son inputs externos que necesiten validación
  de runtime (a diferencia de `reelAnalysisSchema`/`reelScriptSchema`,
  que sí validan salidas de LLM de verdad, vía `CompletionClient` en T12)
  — así que `z.custom` documenta el tipo para el chequeo de tipos de
  Mastra sin el costo/riesgo de mantener 7 schemas Zod duplicados y
  potencialmente desincronizados de las interfaces reales.
- **`FailedReel` no declara `videoPath`/`audioPath`** (T14 solo conoce
  `ReelBase`), pero en runtime un reel que falla en `transcribe` o
  después sí los trae acumulados — `runPipelineStep` los preserva vía
  `{...input, status:'failed', ...}`. El step `cleanup` de esta workflow
  necesita verlos para poder borrar los archivos de un reel que falló
  tarde en el pipeline. Se resolvió ensanchando el tipo *localmente* en
  `process-reel.ts` (`FailedReel & {videoPath?: string; audioPath?:
  string}`) solo en el punto donde se llama a `cleanup()`, sin tocar el
  `FailedReel` compartido de `pipeline-step.ts` (T14, ya mergeado) — es
  un cast acotado a este único call site, no una reinterpretación global
  del tipo.
- **`status: 'ok'` no lo pone ningún step de T15-T20** — ninguno de esos
  steps necesitaba ese campo para su propio contrato (`generateScript`
  solo agrega `script`), pero el `ReelOutcome` final que promete el
  Objective de esta tarea sí lo requiere para distinguir `ok`/`failed`.
  Se agregó ese ensamblado final (armar el `ReelOutcome` limpio: `rank`,
  `shortcode`, `thumbnailUrl`, `metrics`, `status:'ok'`, `analysis`,
  `script`, descartando los campos internos como `mediaId`/`videoPath`/
  `transcript`/etc.) dentro del propio step `cleanup` de este workflow
  (no en el `cleanup()` reusable de T14, que sigue devolviendo su input
  sin tocarlo tal cual promete su Objective) — es orquestación/glue
  específica de "cómo se arma la salida pública de este workflow", que
  encaja en la responsabilidad de `mastra/workflows` ("orquestación y
  nada más").
- **`isFailedReel` se exportó** desde `pipeline-step.ts` (T14) — antes
  era una función privada del módulo; solo se le agregó `export` (sin
  cambiar su comportamiento) porque el step `cleanup` de este workflow
  la necesita para decidir si el resultado de `cleanup()` (T21) ya viene
  `failed` o hay que armarle el `ReelOutcome` `ok`.
- El test ejercita el workflow real (`processReelWorkflow.createRun()` +
  `run.start({inputData, requestContext})`) en vez de solo probar las
  funciones de step directo — así el happy path y las 6 fallas
  parametrizadas (una por step) corren contra el motor de Mastra de
  verdad, no una simulación de él, confirmando que el wiring de
  `requestContext`/`.then()`/`.commit()` funciona.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/workflows/process-reel.ts`
expone `processReelWorkflow` (un `Workflow` de `@mastra/core`),
`ProcessReelDeps`, `PROCESS_REEL_DEPS_KEY`.

### T23 — `mastra/steps`: `preflight`

- **Status:** `[x]`
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

**Decision log:**

- `preflight(env, probe, actorsDir, actor)` es una composición directa y
  sin envoltura extra de `assertPreconditions` (T4) seguido de
  `loadActorProfile` (T5): ninguna de las dos ya lanza `FatalRunError`
  por su cuenta, así que este step no necesita capturar ni reinterpretar
  nada — simplemente deja que el primer `FatalRunError` que se dispare
  se propague, que es exactamente "abortar el run".
- No usa `runPipelineStep` (T14) ni el tipo `FailedReel`: a diferencia de
  T15-T21 (que operan sobre un reel individual y convierten sus fallas en
  un `ReelOutcome` failed-como-valor), `preflight` corre una sola vez por
  run, antes de que exista ningún reel, y su fallo es exactamente el otro
  lado de la regla de "Dos clases de error, una regla" de design.md: un
  `FatalRunError` que debe *lanzarse* y abortar el run entero, no
  devolverse como valor.
- Esta tarea no depende de T13 (la instancia de Mastra): se testea
  inyectando `env`/`probe`/`actorsDir` directo, igual que el resto de
  `mastra/steps` (T15-T21) antes de que T22 los conectara al motor real
  — la integración con `createStep`/`requestContext` de Mastra queda
  para T25, que sí construye `generateScriptsWorkflow`.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/preflight.ts`
expone `preflight`.

### T24 — `mastra/steps`: `discover+rank`

- **Status:** `[x]`
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

**Decision log:**

- El Objective agrupa "cuenta inexistente/inalcanzable/sin reels" bajo un
  mismo `FatalRunError('account-not-found')`, así que `discoverAndRank`
  trata **cualquier** rechazo de `discoverReels` que no sea
  `SessionExpiredError` (no solo un caso específico de "cuenta no
  encontrada") como `account-not-found` — junto con el caso de que la
  llamada resuelva pero devuelva un array vacío. Es una decisión
  deliberadamente amplia: `lib/instagram` (T7/T8) no distingue a nivel de
  tipo entre "cuenta no existe", "cuenta inalcanzable" y otros fallos de
  red no cubiertos por el retry de T8, así que cualquier error que llegue
  hasta acá después de agotar esos reintentos se interpreta como
  problema de la cuenta pedida.
- Igual que `preflight` (T23), no usa `runPipelineStep`/`FailedReel`: corre
  una sola vez a nivel de run (antes de que exista ningún reel individual)
  y su fallo debe abortar el run entero (`FatalRunError` lanzado), no
  convertirse en una falla de reel.
- No depende de T13: se testea con un `InstagramClient` fake inyectado
  directo, mismo patrón que el resto de `mastra/steps` antes de que T22
  (y acá, más adelante T25) los conecte al motor real de Mastra.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/steps/discover-rank.ts`
expone `discoverAndRank`.

### T25 — `mastra/workflows`: `generateScriptsWorkflow`

- **Status:** `[x]`
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

**Decision log:**

- **Cadena real:** `createWorkflow({id, inputSchema: z.custom<RunInput>(),
  outputSchema: z.custom<RunResult>()}).then(preflightStep)
  .then(discoverAndRankStep).then(toReelToHydrateStep)
  .foreach(processReelWorkflow, {concurrency: 3}).then(assembleStep)
  .commit()` — mismo criterio de T22 para los schemas (`z.custom<T>()`,
  sin replicar cada interfaz TS en Zod) y para la inyección de deps
  (`requestContext.setRaw/getRaw`, no `requestContextSchema`).
  `.foreach(processReelWorkflow, {concurrency: 3})` usa el `Workflow` de
  T22 directo como el step a iterar — es composición nativa de Mastra
  (`Workflow` implementa `Step`), no hizo falta ningún adapter extra.
- **`toReelToHydrateStep` (nuevo, no es ninguna de T22-T24):** el output
  de `discoverAndRank` (T24) es `Array<DiscoveredReel & {rank}>`, pero
  `processReelWorkflow` (T22) espera `ReelToHydrate[]`
  (`ReelBase & {mediaId}`, con `metrics: {views,likes,comments}` agrupado
  en vez de sueltos) — son formas distintas a propósito (`DiscoveredReel`
  es el vocabulario de `lib/instagram`, `ReelBase` el de `lib/domain`).
  Se agregó este step de mapeo puro entre ambos, como glue de
  orquestación propia de `mastra/workflows` (no de ninguna task
  anterior), igual que T22 agregó su propio ensamblado final de
  `ReelOutcome` dentro del step `cleanup` del workflow.
- **`assembleStep` usa `getInitData<RunInput>()`** (helper real de la API
  de ejecución de Mastra) para recuperar `account`/`actor` del
  `RunInput` original — en ese punto de la cadena el `inputData` que le
  llega es el array de `ReelOutcome[]` que devolvió el `foreach`, no el
  input original del run, así que no hay otra forma de reconstruir esos
  dos campos sin volver a pasarlos "de contrabando" a mano por cada
  step intermedio.
- **`FatalRunError` lanzado dentro de `preflightStep`/
  `discoverAndRankStep` no se atrapa**: se deja propagar tal cual, y el
  motor de ejecución de Mastra lo convierte en
  `WorkflowResult.status:'failed'` — así se cumple "un FatalRunError
  lanzado en cualquier punto aborta el run entero en vez de convertirse
  en una falla de reel" sin código adicional de por medio.
- **Hallazgo importante de esta tarea:** `WorkflowResult.error` en un run
  `failed` **no es la instancia original** del error lanzado —
  `DefaultExecutionEngine.formatResultError` (dist interno de
  `@mastra/core`) le corre `.toJSON()` antes de exponerlo, así que
  `error instanceof FatalRunError` da `false` aunque el step haya
  lanzado un `FatalRunError` real; sus propiedades propias (`code`,
  `message`, `name`) sí sobreviven la serialización. El test de esta
  tarea verifica `result.error` con `toMatchObject({name:
  'FatalRunError', code: 'account-not-found'})` en vez de
  `toBeInstanceOf`. **Esto es relevante para T27/T28**, que van a leer
  `RunView.error` a partir de exactamente este mismo campo serializado —
  no van a poder usar `instanceof` tampoco.
- **Test de concurrencia ajustado respecto al TDD plan original:** el
  texto de la tarea pedía "5 reels fake y `top: 3`", pero con `top: 3`
  el `foreach` solo procesa 3 reels en total — un concurrency de 3 sobre
  3 ítems no prueba nada (nunca podría superarlo aunque el límite no
  existiera). Se usó `top: 5` (los 5 candidatos pasan el ranking) con
  `concurrency: 3` para que el contador de "en vuelo" realmente tenga
  que alcanzar 3 simultáneos con reels de sobra esperando cupo — y se
  agregó `expect(tracker.max).toBe(3)` (no solo `toBeLessThanOrEqual`)
  para confirmar que el paralelismo de verdad ocurre, no que el motor
  serializó todo por accidente. La aserción de orden (`RunResult.reels`
  ordenado por rank) se probó igual, ahora sobre 5 reels en vez de 3.
  El segundo test (una falla no aborta a los demás) sí usa `top: 3` tal
  cual el texto original, ya que ahí no hace falta estresar la
  concurrencia.
- El actor profile para estos tests se carga de un directorio temporal
  real (`fs.mkdtemp`), mismo patrón que T5/T23 — `preflight` (T23) hace
  una lectura de filesystem real, no está mockeado.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/workflows/generate-scripts.ts`
expone `generateScriptsWorkflow` (un `Workflow` de `@mastra/core`),
`GenerateScriptsDeps`, `GENERATE_SCRIPTS_DEPS_KEY`.

### T26 — `app/api/runs`: `POST` arranca un run

- **Status:** `[x]`
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

**Decision log:**

- **DI vía factory, no `vi.mock`:** `route.ts` exporta
  `createPostHandler(startRun)` (que arma el `POST` real) además del
  `POST` ya wireado con la implementación real
  (`startGenerateScriptsRun`). El test importa `createPostHandler`
  directo y le inyecta un `startRun` fake — evita mockear
  `@mastra/core/request-context`/`generateScriptsWorkflow` con
  `vi.mock`, que hubiera sido más frágil dado que `route.ts` construye
  varios adapters reales (`createInstagramClient`,
  `createFfmpegExtractor`, etc.) solo para la wiring real, no para el
  contrato que el test necesita verificar.
- **"Responde antes de que el trabajo en background termine" se logra
  con `startRun` devolviendo `{runId}` sin esperar la ejecución real:**
  la implementación real (`startGenerateScriptsRun`) hace `await
  generateScriptsWorkflow.createRun()` (rápido, solo arma el `Run` y le
  asigna `runId`) y después `void run.startAsync({inputData,
  requestContext})` (fire-and-forget, sin `await`) antes de devolver
  `{runId: run.runId}` — `startAsync` es el método real de Mastra
  pensado exactamente para esto ("Returns immediately with the runId...
  executes in the background"). El test simula ese mismo contrato con
  un `startRun` fake que resuelve `{runId}` mientras una promesa de
  "background" queda deliberadamente sin resolver, y verifica que la
  respuesta ya llegó sin que ese background haya asentado.
- **`scan` se agrega siempre en `20`** (no configurable desde el body,
  tal cual nota el Interface de design.md) — `createPostHandler` lo fija
  como constante (`DEFAULT_SCAN`) al armar el `RunInput` que le pasa a
  `startRun`.
- **Validación:** `account`/`actor` deben ser strings no vacíos, `top`
  debe ser un entero positivo (`Number.isInteger` + `> 0`) — cualquier
  desvío (falta un campo, `top` no numérico, no entero, o ≤0) responde
  `400` sin invocar `startRun`. Un body que ni siquiera parsea como JSON
  también responde `400` (caso no pedido explícitamente por el TDD plan,
  pero necesario para no reventar con una excepción no controlada en un
  route handler real).
- **Wiring real de `buildDeps()`:** construye los adapters reales
  (`createInstagramClient`, `createFfmpegExtractor`,
  `createTranscriptionClient`, `createCompletionClient`) desde
  `process.env.IG_SESSION_ID`/`OPENROUTER_API_KEY`, un `BinaryProbe` real
  que corre `ffmpeg -version` vía `child_process.spawn` (no existía
  ninguna implementación real de `BinaryProbe` en el repo — T4 solo
  definió la interfaz, y todo lo probado hasta acá usó fakes), y
  `actorsDir: 'content/actors'`. Ninguna de estas piezas de wiring está
  cubierta por el test de esta tarea (que solo ejercita el contrato de
  `createPostHandler`) — es la composición final de dependencias,
  análoga a la que T22/T25 dejaron pendiente de un "punto de wiring real"
  en sus propios decision logs.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/app/api/runs/route.ts`
expone `createPostHandler` y `POST`.

**Addendum (T27):** `startGenerateScriptsRun` originalmente llamaba
`generateScriptsWorkflow.createRun()` importado directo (Mastra le
asignaba el `runId`). T27 lo cambió a
`mastra.getWorkflow('generateScriptsWorkflow').createRun({runId,
resourceId: runId})` con un `runId` generado acá (`randomUUID()`),
usado también como `resourceId` — necesario para poder correlacionar
después cada sub-run de `processReelWorkflow` con el run que lo generó
(T28 los necesita para armar el `RunView`). Ver el decision log de T27.

### T27 — Mapeo puro snapshot → `RunView`

- **Status:** `[x]`
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

**Decision log:**

- **Hallazgo que obligó a amenderrar T13 y T26 (ambas ya mergeadas):**
  probé empíricamente cómo Mastra persiste el snapshot de un
  `.foreach(processReelWorkflow)` dentro de `generateScriptsWorkflow`, y
  el `context` del run principal **no** expone el progreso individual de
  cada reel — solo el estado agregado del step `foreach` en sí (el
  `payload`/`status` de la iteración que esté corriendo en ese momento,
  no una entrada por reel). Sin embargo, si `processReelWorkflow` está
  *también* registrado en la instancia de `Mastra` (no solo
  `generateScriptsWorkflow`), cada iteración del `foreach` persiste su
  **propio run independiente** de `processReelWorkflow`, recuperable vía
  `storage.getStore('workflows').listWorkflowRuns({workflowName:
  'processReelWorkflow', resourceId})` — y ese `resourceId` se propaga
  automáticamente del run padre a cada sub-run cuando se lo pasa a
  `createRun({runId, resourceId})`. Esto obligó dos cambios en tareas ya
  mergeadas, hechos en esta misma tarea porque T27 no se puede
  implementar/probar de forma útil sin ellos:
  - `src/mastra/index.ts` (T13): ahora registra
    `workflows: {generateScriptsWorkflow, processReelWorkflow}` en la
    instancia de `Mastra`, no solo el storage.
  - `src/app/api/runs/route.ts` (T26): `startGenerateScriptsRun` genera
    el `runId` con `randomUUID()` (en vez de dejar que Mastra lo asigne)
    y lo pasa como `resourceId` a `createRun({runId, resourceId: runId})`
    sobre `mastra.getWorkflow('generateScriptsWorkflow')` (en vez del
    `generateScriptsWorkflow` importado directo) — así cada sub-run de
    reel que dispare el `foreach` de ese run específico queda
    correlacionado a su `runId`.
- **`toRunView` recibe un `RunViewBundle` (`{runId, outer, reelRuns}`),
  no un único "snapshot"** como sugiere literalmente el nombre de la
  tarea — es la consecuencia directa del hallazgo anterior: hacen falta
  dos fuentes (el snapshot del run principal + la lista de sub-runs por
  reel) para reconstruir un `RunView` completo. Sigue siendo una función
  pura (no hace I/O — quien arme el bundle con las dos consultas de
  storage es T28).
- **Reels `ok`/`failed` se leen directo de `reelRun.result`:** ningún
  step de `processReelWorkflow` (T15-T21) lanza una excepción real para
  una falla de reel — las fallas son valores (`runPipelineStep`, T14),
  así que a nivel de Mastra el sub-run **siempre** termina con
  `status: 'success'`, y `reelRun.result` ya es exactamente el
  `ReelOutcome` que armó el step `cleanup` de T22 (`ok` con
  `analysis`/`script`, o `failed` con `failedStep`/`reason`) — no hace
  falta ninguna transformación extra para esos dos casos.
- **`currentStep` de un reel pendiente** se deriva recorriendo
  `PIPELINE_STEPS` en orden (`hydrate, download, extract-audio,
  transcribe, analyze, generate-script` — los mismos ids literales que
  usa `process-reel.ts`) y devolviendo el primero cuyo `context[step]`
  no existe todavía o no está en `status: 'success'` — el snapshot de
  Mastra solo tiene una entrada en `context` para los steps que ya
  arrancaron (confirmado empíricamente), así que "no existe todavía" y
  "existe pero no es success" cubren entre los dos toda la casuística de
  "está corriendo ahí".
- **`RunSnapshotLike`** es un tipo local mínimo (no el `WorkflowRunState`
  completo de `@mastra/core`) con solo los campos que `toRunView`
  necesita (`status`, `context`, `result?`, `error?`) — evita atar esta
  función pura y sus tests al tipo completo (enorme) de Mastra, y hace
  los fixtures del test triviales de armar a mano.
- **El campo `error` reusa el hallazgo de T25:** `RunSnapshotLike.error`
  se tipa como `{code: FatalCode; message: string}` (la forma
  serializada real, no `instanceof FatalRunError`) — coherente con lo
  documentado en el decision log de T25.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/mastra/run-view.ts` expone
`toRunView`, `RunSnapshotLike`, `RunViewBundle`; `src/mastra/index.ts`
registra ambos workflows; `src/app/api/runs/route.ts` correlaciona
sub-runs de reel vía `resourceId`.

### T28 — `app/api/runs/[runId]`: `GET` estado de un run

- **Status:** `[x]`
- **Traces to:** 5.7 (y expone 5.3–5.6 vía T27) · design.md `app/api/runs`
- **Depends on:** T27, T13

**Objective:** `GET /api/runs/:runId` lee el snapshot del storage de Mastra
para un `runId` conocido y responde `200` con el `RunView` mapeado; un
`runId` desconocido responde `404 {error: 'run not found'}`.

**TDD plan:**

1. **Test (red):** `src/app/api/runs/[runId]/route.test.ts` — un `runId` con snapshot persistido responde `200` con el `RunView` esperado (usando T27); un `runId` sin snapshot responde `404 {error: 'run not found'}`.
2. **Implement (green):** `src/app/api/runs/[runId]/route.ts`.
3. **Verify:** `npm run typecheck` && `npm test`.

**Decision log:**

- Mismo patrón de DI-por-factory que T26: `createGetHandler(loadRunView)`
  es la pieza testeable, `GET` la wiring real
  (`loadGenerateScriptsRunView`) que usa `mastra.getStorage()` +
  `toRunView` (T27). El test inyecta un `loadRunView` fake que devuelve
  un `RunView` o `null`, sin tocar Mastra ni storage real.
- **Next.js 15 cambió `params` a `Promise<{...}>`** en route handlers de
  segmento dinámico — `createGetHandler` refleja eso en su firma
  (`{params: Promise<{runId: string}>}`) y el handler hace `await
  params` antes de leer `runId`.
- `loadGenerateScriptsRunView` arma el `RunViewBundle` de T27 con dos
  lecturas de storage: `loadWorkflowSnapshot({workflowName:
  'generateScriptsWorkflow', runId})` para el snapshot del run principal
  (si no existe, `null` → responde 404), y
  `listWorkflowRuns({workflowName: 'processReelWorkflow', resourceId:
  runId})` para los sub-runs por reel — el `resourceId` es el mismo
  `runId` que T26 asignó al crear el run (ver decision log de T27).
- `WorkflowRun.snapshot` está tipado como `WorkflowRunState | string` en
  `@mastra/core` (algunos adapters de storage devuelven el snapshot ya
  serializado como JSON string) — se agregó `parseSnapshot()` para
  parsear ese caso de forma defensiva antes de pasarlo a `toRunView`,
  aunque `InMemoryStore` (T13) siempre devuelve el objeto ya parseado.
- **Verificación manual end-to-end** (no forma parte de la suite
  automatizada, se hizo con un script descartable vía `tsx` contra un
  `generateScriptsWorkflow` real con adapters fake): confirmé que
  `POST` (T26) → `resourceId` compartido → `GET` (este) → `toRunView`
  (T27) arman un `RunView` correcto de punta a punta contra la instancia
  real de Mastra, no solo contra los stubs de cada test aislado — dos
  reels rankeados y con `analysis`/`script`, en el orden esperado.

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/app/api/runs/[runId]/route.ts`
expone `createGetHandler` y `GET`.

### T29 — `app/page.tsx`: formulario de arranque de run

- **Status:** `[x]`
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

**Decision log:**

- **Bloqueante de tooling descubierto y resuelto en esta tarea:** era el
  primer test `.tsx` del repo (T1 ya incluía `.tsx` en el `include` de
  `vitest.config.ts`, pero nada lo había ejercitado). Dos piezas
  faltaban:
  - `jsdom` como entorno de test (`// @vitest-environment jsdom` por
    archivo, no el entorno global — el resto de la suite es Node puro y
    no necesita DOM). La versión `latest` de `jsdom` (30.1.0) rompe bajo
    `vitest@2.1.9` (`html-encoding-sniffer` intenta `require()` un
    paquete ESM-only, `@exodus/bytes`) — se pineó `jsdom@25.0.1`,
    compatible con esta versión de vitest.
  - `@vitejs/plugin-react` para transformar JSX en los tests (sin él,
    Vite no sabe qué runtime de JSX usar y el componente placeholder de
    T1 fallaba con "React is not defined"). Se instaló `@vitejs/plugin-
    react@4.7.0` (el rango compatible con el `vite@5.4.21` que trae
    `vitest@2.1.9`; la v6 requiere Vite 8) y se agregó a `plugins` en
    `vitest.config.ts`.
  - Se agregó `@testing-library/react` (compatible con React 19) para
    poder testear componentes.
- **Server Component testeado invocándolo directo:** `Page()` es un
  `async function` de Next.js App Router; el test hace `render(await
  Page())` en vez de necesitar un harness de Next — patrón estándar para
  testear Server Components de App Router con React Testing Library sin
  levantar un servidor real.
- **`listActors('content/actors')` se mockea con `vi.mock('../lib/
  profiles')`** en vez de parametrizar `Page()` con un directorio
  inyectable: Next.js invoca `export default function Page()` sin
  argumentos propios, así que no hay forma de pasarle un directorio fake
  vía props — mockear el módulo es la única vía de inyección posible acá
  (mismo criterio que T7-T10 mockearon módulos externos).
- **Split servidor/cliente:** `page.tsx` (Server Component) llama
  `listActors` y le pasa el resultado a `<RunForm actors={actors} />`
  (`src/app/run-form.tsx`, `'use client'`) — el formulario necesita
  estado y `fetch`, que no pueden vivir en un Server Component. Esta
  tarea deja el formulario mostrando "Run en progreso: {runId}" tras el
  submit; la vista de resultados real (T30) y el polling (T31) se
  integran en tareas separadas, como indica el plan.
- Se creó `content/actors/.gitkeep` para que el directorio exista en un
  clone nuevo del repo — sin él, `listActors` (que hace `readdir` real)
  tira `ENOENT` apenas se visita la página en dev antes de que exista
  ningún actor. Verificado manualmente con `npm run dev`: la página
  sirve el formulario completo (select de actor vacío, como se espera
  sin ningún `.md` real todavía).

**Outcome:** `npm run typecheck` y `npm test` pasan; `src/app/page.tsx` lista actores
y renderiza `<RunForm>`; `src/app/run-form.tsx` expone `RunForm`. Verificado
manualmente en el navegador vía `npm run dev`.

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
- `design.md` describe una única factory pública `createOpenRouterClients`
  que devuelve `{transcription, completion}`; T11 y T12 la resolvieron
  como dos factories independientes (`createTranscriptionClient`,
  `createCompletionClient`) porque ningún task del plan invoca la
  combinada. Si más adelante hace falta un único punto de wiring (p.ej.
  para el contenedor de DI de Mastra en T13/T25), agregar un
  `createOpenRouterClients` delgado que las componga.
