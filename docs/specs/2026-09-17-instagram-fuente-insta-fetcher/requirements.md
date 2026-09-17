# Requirements — Reel Script Generation (fuente insta-fetcher)

**Status:** Draft
**Date:** 2026-09-17
**Author:** Syntex

## Introduction

Syntex tiene un objetivo de crecimiento en Instagram y quiere hacerlo de forma
consistente, agregando valor real a sus seguidores. Hoy dos cosas lo frenan:
recopilar y analizar qué reels están funcionando en cuentas de referencia es
un trabajo manual y lento, y convertir esos hallazgos en un script que suene
como la persona específica que lo va a grabar cuesta tiempo humano en cada
pieza.

Esta feature cierra ese loop de punta a punta. Dada una cuenta de referencia
(una *North Star Account*) y un *actor*, el sistema trae los reels recientes
de mejor desempeño de esa cuenta, los escucha, entiende qué está haciendo cada
uno y para quién, y escribe un script listo para grabar para el actor
elegido — entregado a través de una página web donde un miembro de Syntex
arranca el run y lee los resultados.

Es la primera vertical slice: una cuenta, N reels, un script cada uno. Cubre
el pipeline completo en vez de profundizar en una sola parte.

La fuente de datos de Instagram usa `insta-fetcher` (API móvil de Instagram)
en lugar de `instaloader`, según la evaluación documentada en
`docs/research/ig-tools-bench/REPORT.md`: 3.5×–19× más rápido y 8/8 vs 4/8 en
fiabilidad de descubrimiento de perfil sobre cuentas business.

## Glossary

- **North Star Account** — cuenta pública de Instagram que Syntex usa como
  referencia de contenido.
- **Reel** — video corto de Instagram.
- **Actor** — el miembro de Syntex que va a grabar el script. Cada actor
  tiene un perfil escrito a mano que describe cómo habla.
- **Actor profile** — archivo markdown a mano (`content/actors/<nombre>.md`)
  con el tono, tics verbales, temas que domina, formato preferido y algunos
  scripts de ejemplo de un actor.
- **Run** — una ejecución del pipeline para una cuenta y un actor dados.
- **Scan window** — cuántos de los reels más recientes de la cuenta se
  inspeccionan antes de rankear (default 20).
- **Análisis** — el resumen producido por el LLM de un reel: su objetivo, sus
  highlights, y su audiencia objetivo.
- **Script** — el texto generado para grabar, estructurado como hook, body y
  closing.

## Requirements

### Requirement 1 — Descubrir y rankear los mejores reels de una cuenta

**User story:** Como miembro de Syntex, quiero que el sistema me muestre los
reels recientes de mejor desempeño de una cuenta de referencia, para trabajar
sobre lo que realmente resonó en vez de sobre lo último que se publicó.

**Acceptance criteria:**

1.1. WHEN arranca un run para una cuenta dada THE SYSTEM SHALL obtener, para
     los reels más recientes de esa cuenta dentro del scan window, al menos
     su cantidad de views, de likes y de comentarios, usando `insta-fetcher`
     como cliente de Instagram.
1.2. THE SYSTEM SHALL rankear los reels obtenidos por cantidad de views en
     orden descendente y seleccionar los `top` reels con mejor ranking.
1.3. WHEN dos reels tienen la misma cantidad de views THE SYSTEM SHALL
     preservar su orden relativo original (más reciente primero).
1.4. IF la cuenta tiene menos reels que `top` THEN THE SYSTEM SHALL seguir
     con todos los reels disponibles en vez de fallar.
1.5. IF la cuenta no existe, no es alcanzable, o no tiene reels THEN THE
     SYSTEM SHALL abortar el run y reportar que no se encontraron reels para
     esa cuenta.
1.6. THE SYSTEM SHALL asignar a cada reel seleccionado un rank que empieza en
     1 y mantenerlo hasta el resultado final del run.

### Requirement 2 — Obtener lo que se dijo en un reel

**User story:** Como miembro de Syntex, quiero que cada reel seleccionado se
convierta en una transcripción, para que el análisis se base en lo que
realmente se dijo y no solo en el caption.

**Acceptance criteria:**

2.1. WHEN un reel fue seleccionado THE SYSTEM SHALL obtener su caption, la
     URL de su video y su duración, usando `insta-fetcher` para el detalle
     del post.
2.2. WHEN se obtuvo la URL del video de un reel THE SYSTEM SHALL descargar el
     archivo de video.
2.3. WHEN el video de un reel fue descargado THE SYSTEM SHALL extraer su
     pista de audio como mp3 mono a 16 kHz.
2.4. WHEN el audio de un reel fue extraído THE SYSTEM SHALL transcribirlo y
     guardar el texto resultante contra ese reel.
2.5. WHEN la transcripción de un reel fue guardada THE SYSTEM SHALL borrar el
     video descargado y el audio extraído de ese reel del almacenamiento
     local.
2.6. IF el audio extraído de un reel supera el límite de 25 MB del proveedor
     de transcripción THEN THE SYSTEM SHALL marcar ese reel como fallido con
     motivo "audio too large" sin enviar el pedido de transcripción.

### Requirement 3 — Analizar un reel

**User story:** Como miembro de Syntex, quiero que cada reel se descomponga
en qué intentaba lograr y para quién, para poder juzgar si vale la pena
replicar la idea antes de leer el script.

**Acceptance criteria:**

3.1. WHEN la transcripción de un reel está disponible THE SYSTEM SHALL
     producir un análisis de ese reel con su objetivo, sus highlights, y su
     audiencia objetivo, usando tanto la transcripción como el caption como
     input a un LLM vía OpenRouter.
3.2. THE SYSTEM SHALL rechazar cualquier respuesta de análisis que no
     conforme al schema de análisis.
3.3. IF una respuesta de análisis es rechazada THEN THE SYSTEM SHALL
     reintentar el análisis una vez.
3.4. IF la respuesta del reintento también es rechazada THEN THE SYSTEM SHALL
     marcar ese reel como fallido con motivo "invalid analysis response".

### Requirement 4 — Generar un script en la voz del actor

**User story:** Como miembro de Syntex, quiero que el script esté escrito
como realmente hablo, para poder grabarlo sin tener que reescribirlo antes.

**Acceptance criteria:**

4.1. WHEN el análisis de un reel está disponible THE SYSTEM SHALL generar un
     script para ese reel compuesto por un hook, un body y un closing.
4.2. THE SYSTEM SHALL incluir el actor profile del actor elegido en el input
     usado para generar el script.
4.3. THE SYSTEM SHALL rechazar cualquier respuesta de script que no conforme
     al schema de script.
4.4. IF una respuesta de script es rechazada THEN THE SYSTEM SHALL reintentar
     la generación una vez, y IF el reintento también es rechazado THEN THE
     SYSTEM SHALL marcar ese reel como fallido con motivo "invalid script
     response".
4.5. IF el actor pedido no tiene un actor profile THEN THE SYSTEM SHALL
     abortar el run, antes de obtener ningún reel, y reportar que el actor es
     desconocido.
4.6. THE SYSTEM SHALL generar todo script en español, sin importar el idioma
     hablado en el reel de origen.

### Requirement 5 — Manejar un run desde la UI web

**User story:** Como miembro de Syntex que no vive en una terminal, quiero
arrancar un run desde una página y ver su progreso, para obtener scripts sin
correr comandos.

**Acceptance criteria:**

5.1. WHEN un usuario envía una cuenta, un actor y una cantidad de reels THE
     SYSTEM SHALL arrancar un run y devolver un identificador de run sin
     esperar a que el run termine.
5.2. THE SYSTEM SHALL ofrecer, como actores seleccionables, exactamente los
     actores que tienen un actor profile.
5.3. WHILE un run está en progreso THE SYSTEM SHALL reportar, para cada reel
     seleccionado, el step del pipeline que se está ejecutando para ese reel.
5.4. WHEN un run terminó THE SYSTEM SHALL presentar, para cada reel exitoso,
     su rank, sus métricas de views/likes/comments, su análisis y su script.
5.5. THE SYSTEM SHALL permitir copiar cada script generado en una sola
     acción.
5.6. WHEN un reel falló THE SYSTEM SHALL presentar el motivo de esa falla en
     lugar de su análisis y su script.
5.7. IF se pide el estado de un identificador de run desconocido THEN THE
     SYSTEM SHALL responder con un error "run not found".

### Requirement 6 — Sobrevivir a la falla de un reel individual

**User story:** Como miembro de Syntex, quiero que un run que se topa con un
reel problemático igual me entregue los demás scripts, para que un video roto
no me cueste todo el lote.

**Acceptance criteria:**

6.1. IF el procesamiento de un reel falla en cualquier step THEN THE SYSTEM
     SHALL marcar solo ese reel como fallido, registrando el step que falló
     y el motivo, y SHALL seguir procesando los reels restantes.
6.2. WHEN un run termina con al menos un reel fallido THE SYSTEM SHALL igual
     entregar los resultados de cada reel que sí tuvo éxito.
6.3. THE SYSTEM SHALL procesar como máximo 3 reels en simultáneo a través del
     pipeline completo (transcripción → análisis → script).
6.4. WHEN un pedido a Instagram falla de forma transitoria THE SYSTEM SHALL
     reintentarlo con backoff exponencial antes de marcar el reel como
     fallido.
6.5. WHILE se obtiene el detalle de los reels seleccionados vía
     `insta-fetcher` THE SYSTEM SHALL limitar la cantidad de llamadas de
     detalle en simultáneo a un máximo configurable
     (`REEL_FETCH_CONCURRENCY`, default 5).

### Requirement 7 — Configuración y seguridad operativa

**User story:** Como persona que opera el sistema, quiero que falle de
inmediato y de forma legible cuando está mal configurado, para arreglar la
causa en vez de debuggear un run a medio terminar.

**Acceptance criteria:**

7.1. WHEN se pide un run THE SYSTEM SHALL verificar que estén configurados el
     `sessionid` de Instagram (`IG_SESSION_ID`) y la API key de OpenRouter, y
     que `ffmpeg` esté disponible, antes de descargar ningún contenido.
7.2. IF alguna de esas precondiciones no se cumple THEN THE SYSTEM SHALL
     abortar el run y reportar cuál no se cumple.
7.3. IF Instagram rechaza un pedido con HTTP 403 THEN THE SYSTEM SHALL
     abortar el run y reportar que el sessionid de Instagram venció y debe
     rotarse, distinguiendo este caso (`SessionExpiredError`) de cualquier
     otro error de la fuente de datos.
7.4. THE SYSTEM SHALL documentar, en el README del proyecto, que el
     sessionid de Instagram debe venir de una cuenta de Instagram quemable, y
     nunca de la cuenta real de Syntex.

## Out of scope

- **Texto de comentarios.** `insta-fetcher` expone la *cantidad* de
  comentarios pero no su texto; analizarlos necesita sumar `instaloader`
  como fuente complementaria en un spec aparte.
- **Múltiples cuentas por run.** Una cuenta por run; agrupar varias North
  Star Accounts queda para después.
- **Actor profiles autogenerados.** Los perfiles se escriben a mano por
  ahora, no se infieren a partir de reels previos del actor.
- **Persistencia e historial.** Sin base de datos de runs pasados, sin
  deduplicar reels ya procesados, sin medir qué script se usó al final. El
  estado de un run vive únicamente en el registro propio del motor de
  workflow (Mastra.ai).
- **Scheduling.** Los runs los arranca una persona, no un cron.
- **Autenticación.** La página no tiene login.
- **Artefactos durables del run.** Nada se exporta a disco aparte de los
  archivos temporales de audio/video, que se borran (Requirement 2.5).
- **Selección de idioma por run.** Los scripts siempre son en español
  (criterio 4.6); no se ofrece elegir el idioma de salida.
