# WISPR — Estado del backend y trabajo pendiente

Este documento describe qué espera el frontend de WISPR (`app.js`) del backend,
qué ya está resuelto en el `server.js` actual y qué falta antes de publicar la
plataforma fuera de una sola computadora. Sirve tanto si se sigue usando
`server.js` como si se reemplaza por otro backend: el contrato de la API es el
mismo.

---

## 1. Ya resuelto (octubre 2026)

| Tema | Qué se hizo |
|---|---|
| **Sesiones** | Tras el MFA el servidor emite un token opaco (64 hex). El frontend lo envía en `Authorization: Bearer <token>`. Todo `/api/*` fuera de la lista pública exige sesión válida. |
| **Identidad** | El `playerId` que mande el navegador (URL o cuerpo) se **ignora**: el servidor lo reemplaza por el de la sesión en un único punto (`parseJson` + inicio del handler). |
| **Revocación** | Cerrar sesión, bloquear, eliminar una cuenta o resetear su contraseña revoca sus tokens. Las sesiones vencen por inactividad (12 h) o antigüedad (7 días). |
| **Almacenamiento de sesiones** | `lab/data/sessions.json` guarda solo el **hash SHA-256** del token, nunca el token. Sobreviven a reinicios. |
| **Progreso de Teoría** | Lecciones, XP e insignias se guardan en el servidor (`player.lessonProgress`); el profesor lo ve en el detalle del estudiante. Se conserva el mejor intento. |
| **Ranking** | `/api/ranking` real (antes había rivales inventados en el frontend). |
| **Barra animada** | Usa datos reales del jugador (antes mostraba valores fijos como “Docker 28.3.2”). |
| **Escritura de JSON** | Atómica (archivo `.tmp` + `rename`): un corte a mitad no corrompe `players.json` / `groups.json`. |
| **URL del backend** | Configurable con `<meta name="wispr-api" content="…">` en `index.html` (vacío = mismo origen). |
| **Medios** | `img/historias/` e `img/team/` se sirven por carpeta (nombre en minúsculas, `.mp4/.jpg/.png`): no hace falta tocar código para agregar archivos. |

---

## 2. Contrato de la API que usa el frontend

Todas las respuestas son JSON con `ok: true|false` y, si falla, `error` (texto en español para mostrar al usuario).

### Autenticación

- Rutas **públicas** (sin token): `GET /api/challenges`, `GET /api/platform/status`, `POST /api/players/register`, `/verify`, `/resend`, `/login`, `/login-verify`, `/login-resend`.
- Todo lo demás exige `Authorization: Bearer <token>`.
- Sesión inválida o vencida → **HTTP 401 con `{ ok: false, auth: "required", error }`**. El frontend usa `auth: "required"` para distinguirlo de un 401 por contraseña incorrecta en `/login`, que **no** lleva ese campo.
- El token se entrega en `sessionToken` en: `POST /api/players/verify` (registro), `POST /api/players/login-verify` (login con MFA) y `POST /api/players/login` cuando la cuenta es admin.
- `POST /api/players/logout` revoca el token enviado.
- WebSocket de la terminal: `/ws/terminal?token=<token>` (el navegador no puede mandar cabeceras en un WebSocket).

### Jugador y progreso

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| GET | `/api/players/me` | `{ player }` con `name, handle, email, role, solved, attempts, submissions, lessonProgress, mustChangePassword` |
| POST | `/api/progress` | Cuerpo `{ lessonId, percent (0-100), xp (0-200), attempts?, badge? }` → `{ lessonProgress }` completo. Conserva el mejor `percent`/`xp`. `lessonId`: `^[a-z0-9][a-z0-9-]{1,47}$`. |
| GET | `/api/ranking` | `{ ranking: [{ name, handle, score, solves, streak, current }] }` — solo estudiantes, máx. 100, **sin ids ni correos**. |

### Resto (sin cambios de forma)

Retos y envíos (`/api/challenges/active`, `/api/submissions`, archivos `/api/challenges/:id/files/:name`), Kali (`/api/kali/*`), grupos y tareas (`/api/groups*`), panel admin (`/api/admin/*`). Siguen aceptando `playerId` en la URL o el cuerpo por compatibilidad, pero **el servidor ya no lo usa para identificar**: lo reemplaza por el de la sesión.

---

## 3. Pendiente para el backend

Ordenado por prioridad.

### 3.1 Bloqueante para publicar fuera de la computadora local

1. **Acceso solo local.** `isLocalRequest()` rechaza todo lo que no venga de `127.0.0.1`, y `ALLOWED_HOSTS` solo admite `localhost`. Hay que reemplazarlo por la lista real de dominios permitidos (y CORS si el frontend vive en otro dominio).
2. **HTTPS obligatorio.** Los tokens viajan en cabeceras: sin TLS se pueden robar. El WebSocket debe ir por `wss://`.
3. **Desactivar el “modo desarrollo” del MFA.** Sin SMTP (o si el SMTP falla), el servidor devuelve el código en la respuesta (`devCode`) y el frontend lo muestra en pantalla. En producción esto **anula el MFA**: debe fallar con error en vez de caer a ese modo.
4. **Secretos por defecto.** `INSTANCE_SECRET` tiene un valor fijo de respaldo (`wispr-local-instance-secret`) que determina las flags de cada jugador: en producción debe venir del entorno y ser aleatorio.
5. **CSP.** Si el backend está en otro dominio, agregarlo a `connect-src` (incluido `wss://`).

### 3.2 Seguridad recomendada

6. **Política de contraseñas.** Hoy el mínimo es **4 caracteres**. Recomendado: mínimo 10–12.
7. **Admins sin MFA.** Las cuentas admin entran solo con usuario y contraseña. Recomendado: exigirles el mismo código por correo (o TOTP).
8. **Límite de peticiones (rate limiting)** en `/register`, `/login` y el envío de códigos. Ya existe bloqueo de cuenta tras 5 fallos, pero no límite por IP ni por correo (riesgo de spam de correos).
9. **Token en `localStorage`.** Es simple y funciona, pero un XSS podría leerlo. Si el backend comparte dominio con el frontend, migrar a cookie `HttpOnly; Secure; SameSite=Strict` (el frontend ya centraliza todo en `apiFetch`, el cambio es acotado).
10. **Token en la URL del WebSocket.** Puede quedar en logs de proxies. Alternativa: un “ticket” de un solo uso y corta vida (`POST /api/terminal/ticket`) que se canjea al abrir el socket.

### 3.3 Datos y escalabilidad

11. **Base de datos.** Cuentas, grupos y sesiones viven en archivos JSON que se reescriben completos. Sirve para un aula; con muchos usuarios simultáneos conviene una base de datos (PostgreSQL / SQLite) con las mismas entidades: `players`, `groups`, `group_members`, `tasks`, `sessions`, `lesson_progress`, `submissions`.
12. **Validación del progreso de Teoría.** Las lecciones se resuelven en el navegador y el servidor solo acota rangos (`percent` 0–100, `xp` 0–200). Un estudiante con conocimientos técnicos podría reportar una lección como completada. Si el XP de Teoría va a contar para notas, mover la corrección de los quizzes al servidor (el frontend enviaría las respuestas, no el puntaje).
13. **XP de Teoría separado del puntaje CTF.** Hoy son independientes a propósito. Decidir si el ranking debe incluir el XP de Teoría.

### 3.4 Contenido (opcional)

14. Las lecciones (módulos 1, 3 y 5) están dentro de `app.js`. Si los profesores van a editarlas, servirlas como JSON desde el backend (`GET /api/lessons/:id`) con la misma estructura que el objeto `lessons`.
15. Los nombres y descripciones de “Voces del CTF” están en el arreglo `ctfStories` de `app.js`.

---

## 4. Notas para la migración

- **Usuarios existentes:** al actualizar, las sesiones viejas (sin token) cierran sesión una vez. El progreso de Teoría que tenían en el navegador se sube automáticamente al servidor la próxima vez que inician sesión, **solo si es el mismo usuario** (para no mezclar datos en computadoras compartidas).
- **`server.js` solo se recarga al reiniciar el proceso.** Los archivos del frontend (`app.js`, `style.css`, etc.) se leen en cada petición.
- Variables nuevas (opcionales): `SESSION_IDLE_HOURS` (por defecto 12) y `SESSION_MAX_DAYS` (por defecto 7).
