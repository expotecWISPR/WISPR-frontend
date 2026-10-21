# Cómo agregar un módulo de Teoría

Guía para escribir un módulo nuevo (por ejemplo el 4 o el 6) usando el motor de lecciones que ya
existe en `app.js`. **No hace falta tocar el motor ni el CSS**: un módulo es solo datos. La
referencia completa es el bloque `MÓDULO 2 — SEGURIDAD WI-FI` de `app.js`.

> `app.js` y `style.css` usan saltos de línea de Windows (CRLF). VS Code los respeta solo.

## 1. Registrar el módulo (3 lugares)

| Dónde (`app.js`) | Qué poner |
|---|---|
| `theoryModules` (arriba del archivo) | El título del módulo y la lista de sus temas, en orden |
| `topicLessons` | Una línea por tema: `"Nombre del tema": "id-de-la-leccion"` (el nombre debe coincidir exacto con el de `theoryModules`) |
| Bloque del módulo (debajo del Módulo 2) | `const MX_SEQUENCE = [ids de las lecciones en orden]`, `const MX_MISSION_ID = "mX-mision"` y `moduleMissions[X] = { missionId: MX_MISSION_ID, sequence: MX_SEQUENCE }` |

Con `moduleMissions[X]` el módulo ya tiene barra de progreso, XP total, mapa de lecciones y la
misión final, que se desbloquea al completar todas las lecciones.

Los `id` de lección deben cumplir `^[a-z0-9][a-z0-9-]{1,47}$` (el backend rechaza otros al guardar
el progreso). Convención: `m4-…`, `m6-…`.

## 2. Estructura de una lección

```js
"mX-tema": {
  ...MX_COMMON,              // labTheme + títulos de feedback (ver Módulo 2: M2_COMMON)
  id: "mX-tema",
  moduleId: X,
  title: "Nombre corto",     // el mismo que en theoryModules
  subtitle: "Título de la lección",
  quizTitle: "Desafío: …",
  bridge: "Frase que conecta con la siguiente lección",
  ctf: "Para qué sirve esto en los retos",
  learn: { steps: [ /* 2-3 pasos, ver §3 */ ] },
  practice: { type: "…", /* ver §4 */ },
  quiz: [ /* 3-5 preguntas, ver §5 */ ]
}
```

`MX_COMMON` (como `M2_COMMON`): `{ labTheme: true, feedbackTitles: ["✓ Correcto", "✗ …"], quizOkTitle: "✓ Correcto", quizWrongTitle: "✗ …" }`.

## 3. Pasos de «Aprender»

Cada paso: `{ concept, explanation, visual: {...}, check: {...} }`. El `check` es una
micro-pregunta opcional: `{ prompt, options: [a, b], correct: índice, feedback: [si acierta, si falla] }`.

Visuales disponibles (`visual.type`):

| Tipo | Datos | Úsalo para |
|---|---|---|
| `node-cluster` | `note`, `nodes: [{ id, label, sublabel, detail }]` | Tarjetas que se abren al tocarlas |
| `compare-pair` | `left`/`right: { title, rows: [{ label, value }] }` | Dos columnas; resalta las filas distintas |
| `bt-compare` | `prompt`, `options: [{ id, icon, label, tag, tone, rows: [{ k, v }] }]`, `summary` | 2-3 tarjetas seleccionables (línea de tiempo, comparación) |
| `list-select` | `prompt`, `items: [{ id, label, note }]` | Lista; tocar muestra una nota |
| `timeline` | `items: [{ id, era, title, detail }]` | Línea de tiempo simple |
| `frame-fields` | `frameLabel`, `note`, `fields: [{ id, label, width, detail }]` | Barra de campos (una trama, columnas) |
| `m2-flow` | `prompt`, `modes: [{ id, label, icon, tone, nodes: [{ icon, label, detail? }], links: [{ label, packet?, tone? }], observer?: { title, text }, detail }]`, `summary` | Diagrama de comunicación con modos alternables |
| `m2-cipher` | `plaintext`, `terms: [[término, definición]]`, `summary` | Simulación visual de cifrado (no es criptografía real) |
| `icon-row` | `items: [{ icon, label, caption }]` | Resumen estático |

`tone`: `ok` (verde), `warn` (naranja), `bad` (rojo), `info`, `plain`.

## 4. Prácticas

| `practice.type` | Datos | Mecánica |
|---|---|---|
| `scan-classify` | `prompt`, `instructions`, `panelTitle`, `categories: [{ id, label }]`, `items: [{ id, icon, name, clues: [..], answer, explain, hint }]`, `success` | Cada fila se clasifica en una categoría |
| `packet-sort` | `prompt`, `instructions`, `itemLabel`, `countLabel`, `binPrefix: ""`, `okTitle`, `wrongTitle`, `bins: [{ id, label, caption, icon }]`, `items: [{ id, icon, text, bin, accept?, explain, hint }]`, `hints: { [binId]: texto }`, `success` | Arrastrar tarjetas a compartimentos |
| `m2-decisions` | `prompt`, `instructions`, `scenario: { title, text, devices: [..] }`, `decisions: [{ id, title, context, options: [{ id, label, ok, effects: [[etiqueta, tone]], text }] }]`, `success` | Decisiones con consecuencias visibles |
| `sequence-build` | `prompt`, `instructions`, `steps: [{ id, label, icon, hint }]`, `success` | Ordenar pasos (ojo: su animación final dice un texto de Bluetooth fijo) |

`accept: [a, b]` en `packet-sort` permite más de una respuesta válida (casos que dependen del contexto).

## 5. Quiz

```js
{ id: "q1", concept: "Concepto evaluado", prompt: "Pregunta", options: ["A", "B", "C", "D"], correct: 1,
  feedback: ["Explicación si acierta", "Explicación si falla"] }
```

`concept` aparece en «Conceptos que deberías repasar» cuando se falla.

## 6. Misión final (`missionType: "steps-mission"`)

Ver `lessons[M2_MISSION_ID]`. Campos: `mission: true`, `title`, `subtitle`, `doneTitle`, `claim`,
`badge: { icon, name }`, `brief: { file, heading, text }`, `scan` (tabla opcional:
`{ title, columns: [{ key, label, code? }], rows: [{ key: valor }] }`), `phases` (una por etapa +
`{ id: "done", label: "Informe" }`), `steps` y `ctfLinks: [[término, texto]]`.

Tipos de etapa (`steps[].kind`), cada una con `id`, `lesson` (nombre del concepto, aparece en
«dominados / repasar») y `prompt`:

- `per-item`: `options: [{ id, label }]`, `items: [{ id, label, detail?, answer, explain, hint }]`
- `single`: `options: [{ label, correct, explain }]`
- `multi`: `items: [{ id, label, target, explain }]` (marcar los correctos y «Comprobar»)

## 7. XP y progreso (no hay que programar nada)

- Lección: `XP = porcentaje del quiz × 0,5 + 10` si se resolvió la práctica.
- Misión: `50 + (100 − 5 × errores, mínimo 40) × 0,5`.
- Se guarda con `POST /api/progress`; el backend conserva el **mejor** intento, así que repetir no
  duplica ni baja el XP.

## 8. Antes de dar un módulo por terminado

- `npm run check` (sintaxis).
- Abrir Teoría → el módulo: deben verse los temas como «Lección interactiva» y la misión bloqueada.
- Completar cada tema y la misión una vez, y revisar el celular (≈390 px de ancho).
