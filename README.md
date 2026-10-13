# WISPR — Wireless Security Range

Plataforma local de aprendizaje y competición CTF orientada a seguridad wireless. Conserva la identidad azul, verde lima y ámbar de WISPR, pero la organiza como un rango profesional: dashboard de misión, progreso, score, catálogo de retos y una terminal Kali web real.

> Los escenarios son sintéticos y de práctica. No están diseñados para capturar, atacar o administrar redes inalámbricas reales.

## MVP oficial (con el backend FastAPI)

Este repositorio es el **frontend + terminal Kali**. Las cuentas, retos, flags y ranking viven en el
backend FastAPI (repo `expotecWISPR/WISPR`), así que hay que correr los dos:

1. **Backend** (en `WISPR/backend`, con su `.env` real, que no está en GitHub):
   `venv\Scripts\python.exe -m app.db.seed_challenges` (la primera vez) y luego
   `venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`.
2. **Este repo:** `copy .env.example .env` (ya trae `WISPR_BACKEND_URL=http://127.0.0.1:8000`) y
   `start-wispr-kali.bat` con Docker Desktop abierto.
3. Abrir `http://127.0.0.1:8787`.

Sin `WISPR_BACKEND_URL` en el `.env`, el prototipo funciona solo, como se describe abajo.

## Inicio rápido (modo independiente, sin el backend)

1. Inicia Docker Desktop con contenedores Linux.
2. Desde esta carpeta, ejecuta `start-wispr-kali.bat`.
3. Abre `http://127.0.0.1:8787` (o `http://localhost:8787`).
4. Regístrate con tu correo institucional (`@est.cedesdonbosco.ed.cr` o `@cedesdonbosco.ed.cr`), verifica el código de 6 dígitos que te llega (ver [más abajo](#registro-con-correo-institucional-y-verificación-mfa) si no tienes SMTP configurado), abre un reto y selecciona **Resolver en Kali**.
5. Dentro de la shell: `cd "$(ctf open)"`, analiza el artefacto y envía con `ctf submit WISPR{...}`. El veredicto aparece en la misma terminal y el score se actualiza solo.

La primera terminal crea las imágenes de Docker, por lo que puede tardar varios minutos. Se requieren Node.js 20+ y Docker Desktop.

## Si la terminal no conecta

1. Pestaña **Terminal → Diagnosticar**: comprueba Docker, imágenes, red, contenedor y `exec`. Copia la salida tal cual.
2. La primera vez la imagen Kali se construye en segundo plano; el panel de la terminal muestra el log de `docker build` y se conecta sola al terminar.
3. Si un error aparece en rojo en el panel de la terminal, ese texto es el fallo exacto del backend. También sale en la consola de `start-wispr-kali.bat` con prefijo `[lab]`, `[build]` o `[ws]`.
4. Tras cambiar `kali/Dockerfile`, elimina la imagen vieja: `docker image rm wispr-ctf-kali:local`.

## Registro de datos

Las cuentas y el progreso se guardan en `lab/data/players.json` (contraseña con scrypt, nunca en claro). Los solves, intentos y envíos (web y terminal) sobreviven a reinicios del servidor.

## Registro con correo institucional y verificación MFA

El registro es en dos pasos:

1. **`POST /api/players/register`** valida los datos y el correo institucional, pero todavía no crea la cuenta. El dominio decide el rol automáticamente:
   - `@est.cedesdonbosco.ed.cr` → **estudiante**
   - `@cedesdonbosco.ed.cr` → **profesor**

   Cualquier otro dominio se rechaza. La respuesta trae un `token` de un registro pendiente (10 minutos de vigencia) y dispara el envío de un código de 6 dígitos al correo.
2. **`POST /api/players/verify`** (`{ token, code }`) confirma el código y recién ahí crea la cuenta — esto es la verificación MFA de que el correo existe de verdad. Máximo 5 intentos por código; `POST /api/players/resend` reenvía uno nuevo (cooldown de 30s).

**El login pide el mismo código en cada inicio de sesión, no solo al registrarse:**

1. **`POST /api/players/login`** valida usuario y contraseña como antes, pero en vez de entrar directo, genera y envía un código nuevo (misma vigencia, límite de intentos y cooldown de reenvío que el registro) y responde `{ pending: true, token, email, role }`.
2. **`POST /api/players/login-verify`** (`{ token, code }`) confirma el código y ahí sí entrega el perfil del jugador. `POST /api/players/login-resend` reenvía un código nuevo.

`GET /api/players/me?playerId=…` no cambia — solo se usa para refrescar el perfil de una sesión ya iniciada en el navegador (`localStorage`), no crea una sesión nueva por sí sola.

### Envío real de correos (SMTP) — para que el código llegue al inbox de Gmail

Sin configurar nada, el código **no se pierde**: se imprime en la consola del servidor con el prefijo `[MFA]` y se guarda en `lab/data/outbox/` (ignorado por git) — útil para desarrollar sin un servidor de correo real. La API también devuelve el código en `devCode` en ese modo (la app nunca se expone fuera de `127.0.0.1`, así que no hay riesgo de fuga).

Para que el correo llegue de verdad:

1. Copia `.env.example` a `.env` en esta misma carpeta.
2. Sigue las instrucciones que trae el archivo para crear una **contraseña de aplicación de Gmail** (necesita verificación en 2 pasos activada en esa cuenta): [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Completa `SMTP_USER` (el Gmail que envía) y `SMTP_PASS` (los 16 caracteres de la contraseña de aplicación, no tu contraseña normal) en `.env`.
4. Reinicia el servidor (`start-wispr-kali.bat` o `npm start`) — `.env` se carga solo, no hace falta exportar nada a mano.

En cuanto `SMTP_HOST` queda definido (por `.env` o por variables de entorno reales), el servidor deja el modo desarrollo y envía el correo de verdad vía `nodemailer`, llegando al inbox de Gmail de quien se registró o inició sesión.

Si en vez de Gmail personal el colegio usa su propio SMTP (Google Workspace, Office 365, etc.), pon esos datos en `.env` en lugar de los de Gmail — la única diferencia suele ser `SMTP_HOST`/`SMTP_PORT` y que `SMTP_PASS` sea la contraseña o token que indique ese proveedor.

## Experiencia de aprendizaje

- **Dashboard de misión:** estado de progreso, puntos, siguiente reto y protocolo de trabajo.
- **Cinco retos iniciales:** PMKID roaming, Evil Twin/PEAP, WPS, Rogue AP/TSF y BLE; todos incluyen artefactos sintéticos.
- **Progreso y score:** los solves, pistas y actividad se guardan para la sesión local del jugador.
- **Cola dinámica:** cada solve correcto genera un nuevo reto variado y lo incorpora al catálogo.
- **Terminal Kali web:** xterm.js se conecta a una PTY real. Los atajos solo escriben comandos en esa shell; no son una consola simulada ni restringen lo que se puede teclear.

## Arquitectura de seguridad

```text
Browser (xterm.js)
  → WebSocket local (127.0.0.1)
  → node-pty + docker exec
  → Kali por jugador (usuario sin privilegios)
     ├─ /lab/challenges     solo lectura
     ├─ /workspace          espacio reducido de la sesión
     └─ red Docker interna  solo objetivo sintético del jugador
```

- La aplicación solo escucha en `127.0.0.1` y bloquea solicitudes que no sean locales.
- Cada jugador recibe su propio contenedor Kali y su propia red Docker `--internal`; no comparte objetivo ni shell con otros jugadores.
- Kali se ejecuta como el usuario `kali`, sin capabilities Linux, con `no-new-privileges`, raíz de solo lectura y límites de procesos, CPU y memoria.
- Los artefactos se montan como solo lectura. La única escritura persistente del contenedor es un directorio de sesión reducido que contiene envíos no confiables.
- La validación de flags y el generador viven exclusivamente en el servidor. Los archivos del servidor no se sirven como estáticos.
- `ctf submit` escribe un registro no confiable; el backend vuelve a validar el reto y la flag contra su catálogo privado.

Consulta [KALI-VM.md](KALI-VM.md) para los límites operativos y el modelo de aislamiento completo.

## Motor de retos

`challenge-engine.js` define una interfaz de generación del lado del servidor:

- Sin configuración adicional, usa `TemplateChallengeGenerator`, que produce variaciones seguras y reproducibles desde plantillas.
- Si se definen `AI_CHALLENGE_ENDPOINT` y opcionalmente `AI_CHALLENGE_TOKEN`, el servidor activa `ExternalAiChallengeGenerator`. Este proveedor debe responder JSON con el esquema validado por el backend; la clave y el endpoint nunca llegan al navegador.
- Si el proveedor externo falla, el solve queda registrado y se informa que el siguiente reto no pudo crearse. No se inventa una validación de flag en el cliente.

## Verificación de código

```powershell
npm install
npm run check
```

La comprobación valida la sintaxis de los entry points de Node. La verificación completa de la terminal requiere Docker Desktop ejecutándose, porque construye una imagen Kali.
