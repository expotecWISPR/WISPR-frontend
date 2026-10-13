"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFile, spawn } = require("child_process");
const pty = require("node-pty");
const { WebSocketServer } = require("ws");
const nodemailer = require("nodemailer");
const { initialChallenges, publicChallenge, createChallengeGenerator } = require("./challenge-engine");
const { materializeInstance } = require("./challenge-instances");

// Carga variables desde un archivo .env (si existe) antes de leer process.env,
// para no tener que exportar SMTP_HOST/SMTP_USER/etc. a mano en cada terminal.
// Nunca pisa una variable que ya venga del entorno real. Ver .env.example.
function loadEnvFile(file) {
  let content;
  try { content = fs.readFileSync(file, "utf8"); } catch { return; }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const LAB_DIR = path.join(ROOT, "lab");
const CHALLENGES_DIR = path.join(LAB_DIR, "challenges");
const SESSIONS_DIR = path.join(LAB_DIR, "sessions");
const IMAGE = process.env.KALI_IMAGE || "wispr-ctf-kali:local";
const TARGET_IMAGE = process.env.KALI_TARGET_IMAGE || "wispr-ctf-target:local";
const DOCKERFILE = path.join(ROOT, "kali", "Dockerfile");
const TARGET_DOCKERFILE = path.join(ROOT, "kali", "target", "Dockerfile");
const TARGET_CONTEXT = path.join(ROOT, "kali", "target");
const MAX_COMMAND_SESSIONS = Number(process.env.MAX_COMMAND_SESSIONS || 8);
const MAX_LAB_ENVIRONMENTS = Number(process.env.MAX_LAB_ENVIRONMENTS || 8);
const DATA_DIR = path.join(LAB_DIR, "data");
const REGISTRY_FILE = path.join(DATA_DIR, "players.json");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
// Sesiones: token opaco emitido tras el MFA. Se guarda solo su hash SHA-256,
// así que una copia del archivo no permite suplantar a nadie.
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_HOURS || 12) * 60 * 60 * 1000;
const SESSION_MAX_MS = Number(process.env.SESSION_MAX_DAYS || 7) * 24 * 60 * 60 * 1000;
// Instancias por jugador: las flags esperadas viven SOLO en el host (nunca en el
// workspace montado), en lab/data/instances/, un directorio que jamás se monta
// en el contenedor. INSTANCE_SECRET fija la semilla determinista.
const INSTANCES_DIR = path.join(DATA_DIR, "instances");
const INSTANCE_SECRET = process.env.INSTANCE_SECRET || "wispr-local-instance-secret";
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `127.0.0.1:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
const GENDERS = new Set(["femenino", "masculino", "otro"]);
const DOCKER_BIN = process.platform === "win32" ? "docker.exe" : "docker";

// ---------------------------------------------------------------------------
// Modo conectado (12 oct 2026): con WISPR_BACKEND_URL (p. ej.
// http://127.0.0.1:8000) este servidor atiende SOLO la terminal Kali y los
// archivos del frontend; cuentas, retos, flags y ranking son del backend
// FastAPI (repo WISPR, base de datos Supabase). En el servidor, nginx manda a
// Node /ws/terminal y las rutas de TERMINAL_API, y el resto de /api/ directo a
// FastAPI. Sin la variable, el prototipo funciona solo, como antes.
// ---------------------------------------------------------------------------
const BACKEND_URL = String(process.env.WISPR_BACKEND_URL || "").trim().replace(/\/+$/, "");
const CONNECTED = Boolean(BACKEND_URL);
if (CONNECTED && !/^http:\/\/[^/?#]+$/.test(BACKEND_URL)) {
  // FastAPI corre en la misma máquina: solo esquema + host + puerto, sin ruta.
  console.error("WISPR_BACKEND_URL inválida. Ejemplo: http://127.0.0.1:8000");
  process.exit(1);
}
const TERMINAL_API = new Set([
  "/api/platform/status", "/api/challenges/active",
  "/api/kali/start", "/api/kali/stop", "/api/kali/status", "/api/kali/diagnose"
]);
// Detrás de nginx el navegador manda Origin con el dominio o la IP pública
// (p. ej. "wispr.ejemplo.com"); hay que agregarlo aquí o se rechaza (403).
for (const host of String(process.env.WISPR_PUBLIC_HOSTS || "").split(",")) {
  if (host.trim()) ALLOWED_HOSTS.add(host.trim().toLowerCase());
}
// Cada cuánto se vuelve a preguntar a FastAPI si la sesión de una terminal
// abierta sigue valiendo (logout, cuenta bloqueada o vencida -> se cierra).
const SESSION_RECHECK_MS = Number(process.env.SESSION_RECHECK_SECONDS || 60) * 1000;
const backendTitles = new Map(); // challengeId -> título, para el resultado de `ctf submit`

// ---------------------------------------------------------------------------
// Verificación de correo institucional (MFA de registro): el dominio decide
// el rol y un código de un solo uso confirma que el correo existe de verdad.
// ---------------------------------------------------------------------------
const EMAIL_SUFFIXES = { estudiante: "@est.cedesdonbosco.ed.cr", profesor: "@cedesdonbosco.ed.cr" };
// Cuentas de administrador: entran sin código MFA (usuario + contraseña basta).
// Cuenta como admin cualquier jugador con role="admin" o cuyo usuario esté en
// ADMIN_HANDLES (lista separada por comas, p. ej. "@admin,@root").
const ADMIN_HANDLES = new Set(
  String(process.env.ADMIN_HANDLES || "")
    .split(",")
    .map(value => "@" + value.trim().toLowerCase().replace(/^@+/, ""))
    .filter(value => value.length > 1)
);
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
// Bloqueo de cuentas por fuerza bruta: 5 fallos en 15 min -> 15 min de bloqueo.
const LOGIN_LOCK_THRESHOLD = Number(process.env.LOGIN_LOCK_THRESHOLD || 5);
const LOGIN_LOCK_WINDOW_MS = Number(process.env.LOGIN_LOCK_WINDOW_MIN || 15) * 60 * 1000;
const LOGIN_LOCK_DURATION_MS = Number(process.env.LOGIN_LOCK_MIN || 15) * 60 * 1000;
// Mensaje ÚNICO para credenciales inválidas: no revela si la cuenta existe.
const GENERIC_LOGIN_ERROR = "Usuario o contraseña incorrectos.";
const pendingRegistrations = new Map(); // token -> { name, handle, gender, email, role, salt, passwordHash, code, attempts, expiresAt, lastSentAt }

const CATEGORY_TARGET_PROFILES = {
  "Rogue AP": [{ port: 80, banner: "HTTP/1.1 200 OK\r\nServer: RogueAP-Training/1.0\r\n\r\n<title>Synthetic AP Console</title>" }],
  "Evil Twin": [{ port: 443, banner: "HTTP/1.1 200 OK\r\nServer: CaptivePortal-Training/1.0\r\n\r\n<title>Offline training target</title>" }],
  PMKID: [{ port: 8080, banner: "HTTP/1.1 200 OK\r\nServer: RoamController-Training/1.0\r\n\r\n{\"scope\":\"offline\"}" }],
  WPS: [{ port: 1900, banner: "WPS-TRAINING/1.0 READY\r\n" }],
  Bluetooth: [{ port: 5555, banner: "BT-TRAINING/1.0 READY\r\n" }],
  WPA3: [{ port: 8443, banner: "HTTP/1.1 200 OK\r\nServer: SAE-Training/1.0\r\n\r\n" }],
  "WPA/WPA2": [{ port: 8080, banner: "HTTP/1.1 200 OK\r\nServer: Handshake-Training/1.0\r\n\r\n" }]
};
const DEFAULT_TARGET_PORTS = [{ port: 8080, banner: "HTTP/1.1 200 OK\r\nServer: wispr-offline-lab/1.0\r\n\r\n<html>synthetic practice target</html>" }];

const challengeRegistry = new Map();
const challengeCatalog = [];
const playerStates = new Map();
const knownEnvironments = new Set();
const terminalSubmissionResults = new Map();
const generator = createChallengeGenerator();
let generationQueue = Promise.resolve();
let dockerStatusCache = { at: 0, value: null };

// ---------------------------------------------------------------------------
// Registro de datos: cuentas y progreso persistidos en lab/data/players.json
// ---------------------------------------------------------------------------
const registry = { players: {} };

function loadRegistry() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    if (parsed && typeof parsed.players === "object") registry.players = parsed.players;
  } catch {
    registry.players = {};
  }
}

// Escritura atómica: primero a un .tmp y luego rename. Si el proceso muere a
// mitad de la escritura, el JSON anterior queda intacto (nunca a medias).
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.promises.rename(tmp, file);
}

let registryWrite = Promise.resolve();
function saveRegistry() {
  registryWrite = registryWrite.then(() => writeJsonAtomic(REGISTRY_FILE, registry)).catch(error => {
    console.error("No se pudo guardar el registro de jugadores:", error.message);
  });
  return registryWrite;
}

// ---------------------------------------------------------------------------
// Grupos: cada profesor arma sus propios grupos y agrega estudiantes ya
// registrados. Persistidos aparte en lab/data/groups.json (misma forma de
// guardado en cola que el registro de jugadores).
// ---------------------------------------------------------------------------
const groupsStore = { groups: {} };

function loadGroups() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(GROUPS_FILE, "utf8"));
    if (parsed && typeof parsed.groups === "object") groupsStore.groups = parsed.groups;
  } catch {
    groupsStore.groups = {};
  }
}

let groupsWrite = Promise.resolve();
function saveGroups() {
  groupsWrite = groupsWrite.then(() => writeJsonAtomic(GROUPS_FILE, groupsStore)).catch(error => {
    console.error("No se pudo guardar los grupos:", error.message);
  });
  return groupsWrite;
}

// ---------------------------------------------------------------------------
// Sesiones autenticadas. Cada petición protegida se identifica por el token
// (cabecera Authorization: Bearer …, o ?token= en el WebSocket); el playerId
// que envíe el navegador se IGNORA y se reemplaza por el de la sesión.
// ---------------------------------------------------------------------------
const sessionStore = { sessions: {} }; // sha256(token) -> { playerId, createdAt, lastSeen }

function loadSessions() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
    if (parsed && typeof parsed.sessions === "object") sessionStore.sessions = parsed.sessions;
  } catch {
    sessionStore.sessions = {};
  }
}

let sessionsWrite = Promise.resolve();
let sessionsDirty = false;
function saveSessions() {
  sessionsDirty = false;
  sessionsWrite = sessionsWrite.then(() => writeJsonAtomic(SESSIONS_FILE, sessionStore)).catch(error => {
    console.error("No se pudo guardar las sesiones:", error.message);
  });
  return sessionsWrite;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function sessionExpired(session, now = Date.now()) {
  return !session || now - session.lastSeen > SESSION_IDLE_MS || now - session.createdAt > SESSION_MAX_MS;
}

function createSession(pid) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  sessionStore.sessions[hashToken(token)] = { playerId: pid, createdAt: now, lastSeen: now };
  saveSessions();
  return token;
}

// Devuelve el playerId dueño del token, o null si no existe, venció, la
// cuenta fue eliminada o está bloqueada.
function resolveSession(token) {
  if (!token || typeof token !== "string" || token.length > 128) return null;
  const key = hashToken(token);
  const session = sessionStore.sessions[key];
  const now = Date.now();
  if (!session) return null;
  const player = registry.players[session.playerId];
  if (sessionExpired(session, now) || !player || isAccountLocked(player)) {
    delete sessionStore.sessions[key];
    saveSessions();
    return null;
  }
  // "lastSeen" se refresca como mucho cada minuto para no reescribir el
  // archivo en cada petición.
  if (now - session.lastSeen > 60 * 1000) { session.lastSeen = now; sessionsDirty = true; }
  return session.playerId;
}

function revokeSession(token) {
  const key = hashToken(token || "");
  if (sessionStore.sessions[key]) { delete sessionStore.sessions[key]; saveSessions(); }
}

function revokePlayerSessions(pid) {
  let changed = false;
  for (const [key, session] of Object.entries(sessionStore.sessions)) {
    if (session.playerId === pid) { delete sessionStore.sessions[key]; changed = true; }
  }
  if (changed) saveSessions();
}

function pruneSessions() {
  const now = Date.now();
  let changed = sessionsDirty;
  for (const [key, session] of Object.entries(sessionStore.sessions)) {
    if (sessionExpired(session, now)) { delete sessionStore.sessions[key]; changed = true; }
  }
  if (changed) saveSessions();
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

// Endpoints que no requieren sesión (catálogo público y flujo de login/registro).
const PUBLIC_API = new Set([
  "/api/challenges", "/api/platform/status",
  "/api/players/register", "/api/players/verify", "/api/players/resend",
  "/api/players/login", "/api/players/login-verify", "/api/players/login-resend"
]);

// ---------------------------------------------------------------------------
// Modo conectado: FastAPI decide quién es el jugador y valida las flags.
// ---------------------------------------------------------------------------
function backendFetch(pathname, token, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(BACKEND_URL + pathname, { ...options, headers, signal: AbortSignal.timeout(10000) });
}

// FastAPI identifica a cada usuario con un número (users.id), pero aquí el id
// nombra contenedores y carpetas, y playerId() exige 16-80 caracteres hex. Se
// deriva uno estable: el mismo usuario siempre cae en el mismo laboratorio.
function localPlayerId(backendId) {
  return crypto.createHash("sha256").update(`wispr-backend-user:${backendId}`).digest("hex").slice(0, 32);
}

// Pregunta a FastAPI (GET /api/players/me) de quién es el token. Devuelve
// { id, role }, null si la sesión no vale (vencida, cerrada o cuenta
// bloqueada), o lanza un error si FastAPI no responde.
async function backendSession(token) {
  if (!token || typeof token !== "string" || token.length > 128) return null;
  const response = await backendFetch("/api/players/me", token);
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`FastAPI respondió ${response.status} a /api/players/me`);
  const data = await response.json();
  if (!data || !data.ok || !data.player || !data.player.playerId) return null;
  return { id: localPlayerId(data.player.playerId), role: String(data.player.role || "") };
}

// `ctf submit`: la flag la valida FastAPI con la misma regla y los mismos
// puntos que un envío desde la web. Va con el token del propio jugador, así
// FastAPI sabe quién es sin confiar en nada que diga este servidor.
async function forwardSubmission(token, record) {
  const challengeId = String(record.challengeId || "").slice(0, 120);
  try {
    const response = await backendFetch("/api/submissions", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, flag: String(record.flag || "").slice(0, 512), source: "terminal" })
    });
    if (response.status === 401) return { ok: false, challengeId, error: "Tu sesión expiró. Inicia sesión de nuevo en la web." };
    const data = await response.json();
    return data && typeof data === "object" ? data : { ok: false, challengeId, error: "Respuesta inválida del servidor." };
  } catch (error) {
    console.error("[ctf submit] FastAPI no responde:", error.message);
    return { ok: false, challengeId, error: "No se pudo contactar al servidor de WISPR. Intenta de nuevo." };
  }
}

// Monta en el workspace del jugador el reto tal como lo tiene FastAPI: los
// MISMOS archivos que se descargan desde la web (fijos por ahora, ver
// CLAUDE.md del repo WISPR, punto 7c), así la flag que valida FastAPI coincide.
// Devuelve null si el reto no existe.
async function prepareWorkspaceFromBackend(player, token, challengeId) {
  const catalogResponse = await backendFetch("/api/challenges");
  if (!catalogResponse.ok) throw new Error(`catálogo: FastAPI respondió ${catalogResponse.status}`);
  const catalog = await catalogResponse.json();
  const challenge = (catalog.challenges || []).find(item => item.id === String(challengeId || ""));
  if (!challenge) return null;
  backendTitles.set(challenge.id, challenge.title);
  // Primero se bajan todos los archivos; recién después se reemplaza la
  // carpeta, para no dejarla a medias si una descarga falla.
  const files = [];
  for (const file of challenge.files || []) {
    const response = await backendFetch(`/api/challenges/${encodeURIComponent(challenge.id)}/files/${encodeURIComponent(file.name)}`, token);
    if (!response.ok) throw new Error(`${file.name}: FastAPI respondió ${response.status}`);
    files.push({ name: safeFileName(file.name), type: file.type || "file", desc: file.desc || "", data: Buffer.from(await response.arrayBuffer()) });
  }
  const environment = environmentFor(player);
  const challengeDir = path.join(environment.workspace, "challenge");
  fs.mkdirSync(environment.workspace, { recursive: true });
  fs.rmSync(challengeDir, { recursive: true, force: true });
  fs.mkdirSync(challengeDir, { recursive: true });
  for (const file of files) fs.writeFileSync(path.join(challengeDir, file.name), file.data);
  const publicFiles = files.map(({ name, type, desc }) => ({ name, type, desc }));
  fs.writeFileSync(path.join(challengeDir, "README.md"), backendReadme(challenge, publicFiles), "utf8");
  const active = {
    ...challenge,
    objective: challenge.objective || challenge.description || "",
    files: publicFiles,
    directory: "/workspace/challenge",
    sharedEvidence: true, // `ctf show` no dice "única para tu cuenta"
    activatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(environment.workspace, "active.json"), JSON.stringify(active, null, 2), "utf8");
  const submissions = path.join(environment.workspace, "submissions.ndjson");
  if (!fs.existsSync(submissions)) fs.writeFileSync(submissions, "", "utf8");
  return active;
}

function backendReadme(challenge, files) {
  return [
    `# ${challenge.title}`,
    "",
    `Nivel ${challenge.difficulty} · ${challenge.points} pts · ${challenge.category}`,
    "",
    challenge.description || "",
    "",
    "## Objetivo",
    challenge.objective || "",
    "",
    "## Archivos",
    files.map(file => `- \`${file.name}\`${file.desc ? ` — ${file.desc}` : ""}`).join("\n"),
    "",
    "## Herramientas sugeridas",
    (challenge.tools || []).map(tool => `- ${tool}`).join("\n") || "- Lee los archivos del reto.",
    "",
    "Pistas: `ctf hint`. Cuando tengas la flag:",
    "```bash",
    "ctf submit WISPR{tu_flag}",
    "```",
    "",
    "Evidencia sintética y sin conexión: no uses estas técnicas contra redes o equipos sin permiso."
  ].join("\n");
}

// Solo para probar en una computadora sin nginx (p. ej. Windows con Docker
// Desktop): las rutas /api/* que no son de la terminal se reenvían a FastAPI y
// basta abrir http://127.0.0.1:8787. En el servidor, nginx las manda directo a
// FastAPI y esto no se usa. El destino se arma con url.pathname (ya analizado),
// nunca con req.url crudo: un "//otro-host/..." no puede desviar la petición.
function proxyToBackend(req, res, url) {
  const target = new URL(BACKEND_URL + url.pathname + url.search);
  const forwardedFor = [req.headers["x-forwarded-for"], req.socket.remoteAddress].filter(Boolean).join(", ");
  const upstream = http.request(target, {
    method: req.method,
    headers: { ...req.headers, host: target.host, "x-forwarded-for": forwardedFor }
  }, response => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  upstream.on("error", () => {
    if (res.headersSent) return res.destroy();
    sendJson(res, 502, { ok: false, error: "El backend de WISPR (FastAPI) no responde." });
  });
  req.pipe(upstream);
}

// ---------------------------------------------------------------------------
// Progreso de Teoría (lecciones y misiones). El cliente reporta el resultado
// al terminar; el servidor valida rangos y conserva el MEJOR intento.
// ---------------------------------------------------------------------------
const LESSON_ID_RE = /^[a-z0-9][a-z0-9-]{1,47}$/;

function mergeLessonProgress(player, lessonId, report) {
  if (!LESSON_ID_RE.test(String(lessonId || ""))) return { ok: false, error: "Lección inválida." };
  const percent = Math.round(Number(report.percent));
  const xp = Math.round(Number(report.xp));
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { ok: false, error: "Porcentaje inválido." };
  if (!Number.isFinite(xp) || xp < 0 || xp > 200) return { ok: false, error: "XP inválido." };
  player.lessonProgress = player.lessonProgress && typeof player.lessonProgress === "object" ? player.lessonProgress : {};
  if (!player.lessonProgress[lessonId] && Object.keys(player.lessonProgress).length >= 200) return { ok: false, error: "Demasiadas lecciones registradas." };
  const previous = player.lessonProgress[lessonId] || {};
  const now = Date.now();
  player.lessonProgress[lessonId] = {
    completed: true,
    percent: Math.max(previous.percent || 0, percent),
    xp: Math.max(previous.xp || 0, xp),
    attempts: Math.max(0, Math.min(9999, Math.round(Number(report.attempts) || 0))),
    badge: typeof report.badge === "string" ? report.badge.slice(0, 60) : (previous.badge || undefined),
    completedAt: previous.completedAt || now,
    updatedAt: now
  };
  return { ok: true, progress: player.lessonProgress[lessonId] };
}

// Racha = envíos correctos consecutivos más recientes (submissions va del más
// nuevo al más viejo).
function currentStreak(player) {
  let streak = 0;
  for (const submission of player.submissions || []) {
    if (!submission.ok) break;
    streak += 1;
  }
  return streak;
}

function normalizeHandle(value) {
  return "@" + String(value || "").trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString("hex") };
}

function passwordMatches(player, password) {
  const candidate = hashPassword(password, player.salt).hash;
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(player.passwordHash || "", "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

// --- Bloqueo de cuentas y auditoría ---------------------------------------
// Una cuenta está bloqueada si un admin la marcó (manual) o si acumuló
// demasiados fallos de login (automático, con caducidad).
function isAccountLocked(player) {
  if (!player) return false;
  if (player.locked) return true;
  return typeof player.lockedUntil === "number" && player.lockedUntil > Date.now();
}

// Registro de eventos de seguridad por cuenta (fecha/hora + tipo). Acotado.
function pushSecurityEvent(player, type, detail) {
  player.security = Array.isArray(player.security) ? player.security : [];
  player.security.push({ at: new Date().toISOString(), type, detail: String(detail || "").slice(0, 200) });
  if (player.security.length > 30) player.security = player.security.slice(-30);
}

// Suma un intento fallido dentro de la ventana móvil; al llegar al umbral,
// bloquea automáticamente y deja constancia con fecha y hora.
function recordFailedLogin(player) {
  const now = Date.now();
  const since = now - LOGIN_LOCK_WINDOW_MS;
  player.failedLogins = (Array.isArray(player.failedLogins) ? player.failedLogins : []).filter(t => t > since);
  player.failedLogins.push(now);
  if (player.failedLogins.length >= LOGIN_LOCK_THRESHOLD && !isAccountLocked(player)) {
    player.lockedUntil = now + LOGIN_LOCK_DURATION_MS;
    player.failedLogins = [];
    pushSecurityEvent(player, "auto-lock",
      `${LOGIN_LOCK_THRESHOLD} intentos fallidos en ${Math.round(LOGIN_LOCK_WINDOW_MS / 60000)} min`);
  }
  saveRegistry();
}

function clearFailedLogins(player) {
  if (player.failedLogins && player.failedLogins.length) { player.failedLogins = []; saveRegistry(); }
}

// Contraseña temporal legible (sin caracteres ambiguos), de un solo uso: el
// admin la entrega en persona y el sistema obliga a cambiarla al entrar.
function generateTempPassword() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0, I/1, etc.
  const pick = n => Array.from({ length: n }, () => alpha[crypto.randomInt(0, alpha.length)]).join("");
  return `WISPR-${pick(4)}-${pick(4)}`;
}

function findPlayerByHandle(handle) {
  return Object.values(registry.players).find(player => player.handle === handle) || null;
}

function findPlayerByEmail(email) {
  return Object.values(registry.players).find(player => player.email === email) || null;
}

function publicPlayer(player) {
  return {
    playerId: player.id,
    name: player.name,
    handle: player.handle,
    gender: player.gender,
    email: player.email || "",
    role: player.role || "",
    joined: player.createdAt,
    solved: player.solved || {},
    attempts: player.attempts || {},
    submissions: (player.submissions || []).slice(0, 50),
    lessonProgress: player.lessonProgress || {},
    mustChangePassword: Boolean(player.mustChangePassword)
  };
}

// El dominio institucional decide el rol: @est.* es más específico que el
// dominio de profesores, así que se comprueba primero.
function roleForEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (value.endsWith(EMAIL_SUFFIXES.estudiante)) return "estudiante";
  if (value.endsWith(EMAIL_SUFFIXES.profesor)) return "profesor";
  return null;
}

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

// Un admin salta el MFA de login: basta usuario + contraseña correctos.
function isAdminPlayer(player) {
  if (!player) return false;
  return player.role === "admin" || ADMIN_HANDLES.has(player.handle);
}

// Autoriza los endpoints /api/admin/*: exige que playerId corresponda a una
// cuenta admin ya registrada (mismo criterio que el login sin MFA).
function adminPlayerFromRequest(rawPlayerId) {
  const id = playerId(rawPlayerId);
  const player = id && registry.players[id];
  return player && isAdminPlayer(player) ? player : null;
}

// Dueño de grupos: una cuenta profesor (no admin, no estudiante). Las cuentas
// admin no "son" profesores, pero sí pueden gestionar cualquier grupo (ver
// groupManageAllowed) para poder moderar desde el panel admin.
function professorPlayerFromRequest(rawPlayerId) {
  const id = playerId(rawPlayerId);
  const player = id && registry.players[id];
  return player && !isAdminPlayer(player) && player.role === "profesor" ? player : null;
}

function groupManageAllowed(group, requester) {
  return Boolean(requester) && (isAdminPlayer(requester) || (requester.role === "profesor" && group.ownerId === requester.id));
}

// Un profesor solo puede ver el detalle de un estudiante que esté en alguno
// de sus propios grupos; un admin puede ver el de cualquiera.
function canViewStudentDetail(requester, studentId) {
  if (!requester) return false;
  if (isAdminPlayer(requester)) return true;
  if (requester.role !== "profesor") return false;
  return Object.values(groupsStore.groups).some(group => group.ownerId === requester.id && (group.memberIds || []).includes(studentId));
}

function publicGroupMember(member) {
  const entries = Object.values(member.solved || {});
  return {
    playerId: member.id,
    name: member.name,
    handle: member.handle,
    email: member.email || "",
    solves: entries.length,
    score: entries.reduce((sum, entry) => sum + (entry.points || 0), 0),
    // Con timestamps (no solo el total) para que el profesor/admin puedan
    // armar un gráfico de actividad sin pedir el detalle de cada estudiante.
    solved: member.solved || {}
  };
}

function publicGroup(group) {
  const members = (group.memberIds || []).map(id => registry.players[id]).filter(Boolean).map(publicGroupMember);
  const owner = registry.players[group.ownerId];
  const tasks = (group.tasks || []).slice()
    .sort((left, right) => (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31") || new Date(left.createdAt) - new Date(right.createdAt));
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    ownerId: group.ownerId,
    ownerName: owner ? owner.name : "(profesor eliminado)",
    ownerHandle: owner ? owner.handle : "",
    members,
    tasks
  };
}

function prunePendingRegistrations() {
  const now = Date.now();
  for (const [token, pending] of pendingRegistrations) {
    if (pending.expiresAt < now) pendingRegistrations.delete(token);
  }
}

let mailTransport;
function getMailTransport() {
  if (mailTransport !== undefined) return mailTransport;
  mailTransport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      })
    : null;
  return mailTransport;
}

// Modo desarrollo / respaldo: registra el código en consola y en
// lab/data/outbox/ para que el registro nunca quede bloqueado. La app solo
// escucha en 127.0.0.1, así que el devCode no se expone fuera del equipo local.
function deliverDevCode(email, code, subject, text, reason) {
  console.log(`[MFA] ${reason} Código para ${email}: ${code}`);
  try {
    const outbox = path.join(DATA_DIR, "outbox");
    fs.mkdirSync(outbox, { recursive: true });
    const safeName = email.replace(/[^a-z0-9.@-]/gi, "_");
    fs.writeFileSync(path.join(outbox, `${Date.now()}-${safeName}.txt`), `Para: ${email}\nAsunto: ${subject}\n\n${text}\n`, "utf8");
  } catch (error) {
    console.error("No se pudo escribir el correo de desarrollo:", error.message);
  }
  return { ok: true, dev: true, code };
}

// Sin SMTP configurado (SMTP_HOST), la app sigue siendo probable localmente:
// el código se registra en consola y en lab/data/outbox/ en vez de perderse.
// Con SMTP configurado se envía el correo real; si ese envío falla, en vez de
// bloquear el registro (502) se cae automáticamente al modo desarrollo.
async function sendVerificationCode(email, code) {
  const subject = "Tu código de verificación WISPR";
  const text = `Tu código de verificación es: ${code}\nVence en 10 minutos. Si no solicitaste este registro, ignora este mensaje.`;
  const transport = getMailTransport();
  if (!transport) {
    return deliverDevCode(email, code, subject, text, "Sin SMTP configurado (modo desarrollo).");
  }
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email, subject, text });
    return { ok: true, dev: false };
  } catch (error) {
    console.error("No se pudo enviar el correo de verificación:", error.message);
    return deliverDevCode(email, code, subject, text, `Envío SMTP falló (${error.message}); respaldo a modo desarrollo.`);
  }
}

// Primer paso del registro: valida todo pero NO crea la cuenta todavía; sólo
// deja un registro pendiente a la espera del código de verificación (MFA).
function beginRegistration({ name, handle, gender, password, email }) {
  const cleanName = String(name || "").trim().slice(0, 48);
  const cleanHandle = normalizeHandle(handle || name);
  const cleanGender = String(gender || "").trim().toLowerCase();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanName) return { ok: false, error: "Escribe un nombre." };
  if (cleanHandle.length < 3) return { ok: false, error: "El usuario debe tener al menos 2 caracteres válidos." };
  if (!GENDERS.has(cleanGender)) return { ok: false, error: "Selecciona un género." };
  if (String(password || "").length < 4) return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: "Escribe un correo válido." };
  // Los dominios institucionales conservan su rol automático (@est.* = estudiante,
  // dominio de profesores = profesor). Cualquier otro correo válido se acepta y
  // entra como estudiante por defecto.
  const role = roleForEmail(cleanEmail) || "estudiante";
  if (findPlayerByHandle(cleanHandle)) return { ok: false, error: "Ese usuario ya está registrado. Inicia sesión." };
  if (findPlayerByEmail(cleanEmail)) return { ok: false, error: "Ese correo ya tiene una cuenta verificada. Inicia sesión." };

  prunePendingRegistrations();
  // Un nuevo intento con el mismo usuario o correo reemplaza cualquier código pendiente anterior.
  for (const [existingToken, existingPending] of pendingRegistrations) {
    if (existingPending.handle === cleanHandle || existingPending.email === cleanEmail) pendingRegistrations.delete(existingToken);
  }

  const { salt, hash } = hashPassword(password);
  const token = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  pendingRegistrations.set(token, {
    name: cleanName, handle: cleanHandle, gender: cleanGender, email: cleanEmail, role,
    salt, passwordHash: hash, code: generateCode(), attempts: 0,
    expiresAt: now + OTP_TTL_MS, lastSentAt: now
  });
  return { ok: true, token, email: cleanEmail, role };
}

// Segundo paso: el código correcto confirma el correo y recién ahí se crea la cuenta.
function completeRegistration(token, code) {
  prunePendingRegistrations();
  const pending = pendingRegistrations.get(String(token || ""));
  if (!pending) return { ok: false, error: "El código expiró o el registro ya no está disponible. Vuelve a registrarte." };
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    pendingRegistrations.delete(token);
    return { ok: false, error: "Demasiados intentos incorrectos. Vuelve a registrarte para recibir un código nuevo." };
  }
  pending.attempts += 1;
  const submitted = Buffer.from(String(code || "").trim());
  const expected = Buffer.from(pending.code);
  const match = submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected);
  if (!match) return { ok: false, error: `Código incorrecto. Intentos restantes: ${Math.max(0, OTP_MAX_ATTEMPTS - pending.attempts)}.` };

  pendingRegistrations.delete(token);
  // Re-chequeo por si otra pestaña/sesión ya reclamó el usuario o correo mientras este código estaba pendiente.
  if (findPlayerByHandle(pending.handle)) return { ok: false, error: "Ese usuario ya fue registrado en otra sesión. Vuelve a registrarte con otro usuario." };
  if (findPlayerByEmail(pending.email)) return { ok: false, error: "Ese correo ya fue verificado en otra sesión. Inicia sesión." };

  const player = {
    id: crypto.randomUUID(),
    name: pending.name,
    handle: pending.handle,
    gender: pending.gender,
    email: pending.email,
    role: pending.role,
    salt: pending.salt,
    passwordHash: pending.passwordHash,
    createdAt: new Date().toISOString(),
    emailVerifiedAt: new Date().toISOString(),
    solved: {},
    attempts: {},
    submissions: []
  };
  registry.players[player.id] = player;
  saveRegistry();
  return { ok: true, player: publicPlayer(player) };
}

function resendVerificationCode(token) {
  prunePendingRegistrations();
  const pending = pendingRegistrations.get(String(token || ""));
  if (!pending) return { ok: false, error: "El registro ya no está disponible. Vuelve a registrarte." };
  const wait = OTP_RESEND_COOLDOWN_MS - (Date.now() - pending.lastSentAt);
  if (wait > 0) return { ok: false, error: `Espera ${Math.ceil(wait / 1000)}s para volver a enviar el código.` };
  pending.code = generateCode();
  pending.attempts = 0;
  pending.expiresAt = Date.now() + OTP_TTL_MS;
  pending.lastSentAt = Date.now();
  return { ok: true, email: pending.email, code: pending.code };
}

const pendingLogins = new Map(); // token -> { playerId, code, attempts, expiresAt, lastSentAt }

function prunePendingLogins() {
  const now = Date.now();
  for (const [token, pending] of pendingLogins) {
    if (pending.expiresAt < now) pendingLogins.delete(token);
  }
}

// Primer paso del login: usuario y contraseña correctos, pero todavía falta el
// código MFA — se pide en cada inicio de sesión, no solo la primera vez.
function beginLogin({ handle, password }) {
  const player = findPlayerByHandle(normalizeHandle(handle));
  const credsOk = Boolean(player) && passwordMatches(player, password);

  // Cuenta bloqueada (manual o automática): el motivo SOLO se revela a quien
  // acierta la contraseña (el dueño). Cualquier otro caso recibe el mensaje
  // genérico, para no filtrar qué cuentas existen ni cuáles están bloqueadas.
  if (player && isAccountLocked(player)) {
    if (!credsOk) return { ok: false, error: GENERIC_LOGIN_ERROR };
    if (player.locked) return { ok: false, locked: true, error: "Tu cuenta está bloqueada. Contacta al administrador del rango." };
    const mins = Math.max(1, Math.ceil((player.lockedUntil - Date.now()) / 60000));
    return { ok: false, locked: true, error: `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ~${mins} min.` };
  }

  // Credenciales inválidas: cuenta el fallo (si la cuenta existe) y responde
  // siempre con el MISMO mensaje.
  if (!credsOk) {
    if (player) recordFailedLogin(player);
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  // Acierto: limpia el contador de intentos fallidos.
  clearFailedLogins(player);

  // Los administradores entran sin código: usuario + contraseña es suficiente.
  if (isAdminPlayer(player)) return { ok: true, admin: true, player: publicPlayer(player) };

  if (!player.email || !player.role) return { ok: false, error: "Esta cuenta no tiene un correo institucional verificado. Contacta al administrador del rango." };

  prunePendingLogins();
  for (const [existingToken, existingPending] of pendingLogins) {
    if (existingPending.playerId === player.id) pendingLogins.delete(existingToken);
  }
  const token = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  pendingLogins.set(token, { playerId: player.id, code: generateCode(), attempts: 0, expiresAt: now + OTP_TTL_MS, lastSentAt: now });
  return { ok: true, token, email: player.email, role: player.role };
}

function completeLogin(token, code) {
  prunePendingLogins();
  const pending = pendingLogins.get(String(token || ""));
  if (!pending) return { ok: false, error: "El código expiró o la sesión ya no está disponible. Vuelve a iniciar sesión." };
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    pendingLogins.delete(token);
    return { ok: false, error: "Demasiados intentos incorrectos. Vuelve a iniciar sesión para recibir un código nuevo." };
  }
  pending.attempts += 1;
  const submitted = Buffer.from(String(code || "").trim());
  const expected = Buffer.from(pending.code);
  const match = submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected);
  if (!match) return { ok: false, error: `Código incorrecto. Intentos restantes: ${Math.max(0, OTP_MAX_ATTEMPTS - pending.attempts)}.` };

  pendingLogins.delete(token);
  const player = registry.players[pending.playerId];
  if (!player) return { ok: false, error: "Esta cuenta ya no existe." };
  return { ok: true, player: publicPlayer(player) };
}

function resendLoginCode(token) {
  prunePendingLogins();
  const pending = pendingLogins.get(String(token || ""));
  if (!pending) return { ok: false, error: "La sesión ya no está disponible. Vuelve a iniciar sesión." };
  const wait = OTP_RESEND_COOLDOWN_MS - (Date.now() - pending.lastSentAt);
  if (wait > 0) return { ok: false, error: `Espera ${Math.ceil(wait / 1000)}s para volver a enviar el código.` };
  const player = registry.players[pending.playerId];
  if (!player) return { ok: false, error: "Esta cuenta ya no existe." };
  pending.code = generateCode();
  pending.attempts = 0;
  pending.expiresAt = Date.now() + OTP_TTL_MS;
  pending.lastSentAt = Date.now();
  return { ok: true, email: player.email, code: pending.code };
}

function recordSubmission(player, challenge, result, source) {
  const record = registry.players[player];
  if (!record) return;
  record.attempts = record.attempts || {};
  record.attempts[challenge.id] = (record.attempts[challenge.id] || 0) + 1;
  record.submissions = record.submissions || [];
  record.submissions.unshift({ id: challenge.id, title: challenge.title, ok: Boolean(result.ok), time: Date.now(), source });
  record.submissions = record.submissions.slice(0, 100);
  if (result.ok && !record.solved[challenge.id]) record.solved[challenge.id] = { time: Date.now(), points: challenge.points };
  saveRegistry();
}

function run(file, args, options = {}) {
  return new Promise(resolve => {
    execFile(file, args, {
      cwd: options.cwd || ROOT,
      timeout: options.timeout || 30000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    }, (error, stdout, stderr) => resolve({
      ok: !error,
      code: error && typeof error.code === "number" ? error.code : 0,
      output: [stdout, stderr].filter(Boolean).join("").trim()
    }));
  });
}

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96) || "challenge";
}

function safeFileName(value) {
  return path.basename(String(value || "artifact.txt")).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "artifact.txt";
}

function playerId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-f0-9-]{16,80}$/.test(normalized) ? normalized : null;
}

function environmentFor(player) {
  const scope = crypto.createHash("sha256").update(player).digest("hex").slice(0, 14);
  return {
    scope,
    network: `wispr-net-${scope}`,
    kali: `wispr-kali-${scope}`,
    target: `wispr-target-${scope}`,
    workspace: path.join(SESSIONS_DIR, scope)
  };
}

function playerState(player) {
  if (!playerStates.has(player)) {
    const stored = registry.players[player];
    playerStates.set(player, { solved: new Set(Object.keys((stored && stored.solved) || {})), attempts: 0 });
  }
  return playerStates.get(player);
}

function writeChallengeArtifacts(challenge) {
  const dir = path.join(CHALLENGES_DIR, safeId(challenge.id));
  fs.mkdirSync(dir, { recursive: true });
  const publicData = publicChallenge(challenge);
  const readme = [
    `# ${publicData.title}`,
    "",
    publicData.description,
    "",
    "## Objective",
    publicData.objective,
    "",
    "## Suggested tools",
    publicData.tools.map(tool => `- ${tool}`).join("\n") || "- Read the challenge artifact.",
    "",
    "## Safety scope",
    "This challenge contains synthetic, offline-only evidence. Do not use its workflow or tools against systems you do not own or have permission to test.",
    "",
    "Submit from Kali with:",
    "```bash",
    "ctf submit WISPR{your_flag}",
    "```"
  ].join("\n");
  fs.writeFileSync(path.join(dir, "README.md"), readme, "utf8");
  for (const file of publicData.files) {
    fs.writeFileSync(path.join(dir, safeFileName(file.name)), challenge.artifactText || "Synthetic WISPR training artifact.\n", "utf8");
  }
}

function registerChallenge(challenge) {
  if (!challenge || !challenge.id || !challenge.flag) throw new Error("Reto inválido en el catálogo interno.");
  if (challengeRegistry.has(challenge.id)) throw new Error(`ID de reto duplicado: ${challenge.id}`);
  challengeRegistry.set(challenge.id, challenge);
  challengeCatalog.push(challenge.id);
  writeChallengeArtifacts(challenge);
  return challenge;
}

// --- Almacén de flags de instancia (SOLO host) ------------------------------
// Cada (jugador, reto) tiene una flag distinta. La flag esperada nunca se
// escribe en el workspace montado; vive aquí, en lab/data/instances/<scope>.json.
const instanceFlags = new Map(); // playerId -> Map(challengeId -> flag)

function instanceStoreFile(player) {
  return path.join(INSTANCES_DIR, `${environmentFor(player).scope}.json`);
}
function loadInstanceFlags(player) {
  if (instanceFlags.has(player)) return instanceFlags.get(player);
  const map = new Map();
  try {
    const parsed = JSON.parse(fs.readFileSync(instanceStoreFile(player), "utf8"));
    if (parsed && typeof parsed === "object") {
      for (const [key, value] of Object.entries(parsed)) map.set(key, String(value));
    }
  } catch { /* aún no existe: instancia nueva */ }
  instanceFlags.set(player, map);
  return map;
}
function saveInstanceFlags(player) {
  fs.mkdirSync(INSTANCES_DIR, { recursive: true });
  const obj = {};
  for (const [key, value] of (instanceFlags.get(player) || new Map())) obj[key] = value;
  try { fs.writeFileSync(instanceStoreFile(player), JSON.stringify(obj, null, 2), "utf8"); }
  catch (error) { console.error("No se pudo guardar la instancia:", error.message); }
}
function setInstanceFlag(player, challengeId, flag) {
  loadInstanceFlags(player).set(challengeId, flag);
  saveInstanceFlags(player);
}
function getInstanceFlag(player, challengeId) {
  return loadInstanceFlags(player).get(challengeId) || null;
}

function preparePlayerWorkspace(player, challenge) {
  const environment = environmentFor(player);
  fs.mkdirSync(environment.workspace, { recursive: true });

  // Materializa una instancia única y determinista para este jugador.
  const baseFile = (challenge.files && challenge.files[0] && challenge.files[0].name) || "evidence.txt";
  const instance = materializeInstance({
    player,
    challengeId: challenge.id,
    baseFlag: challenge.flag,
    fileName: baseFile,
    category: challenge.category,
    difficulty: challenge.difficulty,
    kind: challenge.kind,
    seedSecret: INSTANCE_SECRET
  });
  setInstanceFlag(player, challenge.id, instance.flag);

  // Escribe la evidencia + README de la instancia en un subdirectorio limpio del
  // workspace (rw, aislado por jugador). El contenedor lo ve en vivo por el bind.
  // Los artefactos binarios (.pcap) se escriben como Buffer, no como texto.
  const challengeDir = path.join(environment.workspace, "challenge");
  fs.rmSync(challengeDir, { recursive: true, force: true });
  fs.mkdirSync(challengeDir, { recursive: true });
  const activeFiles = [];
  for (const file of instance.files) {
    const name = safeFileName(file.name);
    const data = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content), "utf8");
    fs.writeFileSync(path.join(challengeDir, name), data);
    activeFiles.push({ name, type: file.type || "trace", desc: file.desc || "Evidencia única de tu instancia" });
  }
  fs.writeFileSync(path.join(challengeDir, "README.md"), instance.readme, "utf8");

  const active = {
    ...publicChallenge(challenge),
    files: activeFiles,
    tools: instance.tools,
    hints: instance.hints,
    command: instance.command,
    level: instance.level,
    learn: instance.learn,
    directory: "/workspace/challenge",
    activatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(environment.workspace, "active.json"), JSON.stringify(active, null, 2), "utf8");
  const submissions = path.join(environment.workspace, "submissions.ndjson");
  if (!fs.existsSync(submissions)) fs.writeFileSync(submissions, "", "utf8");
  return active;
}

async function createFollowUpChallenge(solvedChallenge) {
  const task = generationQueue.then(async () => {
    const challenge = await generator.generate({ sequence: challengeCatalog.length + 1, solvedChallenge });
    return publicChallenge(registerChallenge(challenge));
  });
  generationQueue = task.catch(error => {
    console.error("Challenge generator failed:", error.message);
  });
  return task;
}

function flagsMatch(submitted, expected) {
  const left = Buffer.from(String(submitted || ""), "utf8");
  const right = Buffer.from(String(expected || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function verifySubmission(player, challengeId, flag, source = "web") {
  const challenge = challengeRegistry.get(String(challengeId || ""));
  const submitted = String(flag || "").trim();
  if (!challenge) return { ok: false, error: "El reto no existe o ya no está disponible." };
  if (!/^WISPR\{[^{}\r\n]{3,180}\}$/.test(submitted)) return { ok: false, error: "La flag debe tener el formato WISPR{...}.", challengeId: challenge.id };

  const state = playerState(player);
  state.attempts += 1;
  // Valida contra la flag de la instancia de ESTE jugador; si no hay instancia
  // (retos antiguos aún no activados), usa la flag estática del catálogo.
  const expected = getInstanceFlag(player, challenge.id) || challenge.flag;
  const correct = flagsMatch(submitted, expected);
  if (!correct) {
    recordSubmission(player, challenge, { ok: false }, source);
    return { ok: false, challengeId: challenge.id };
  }
  if (state.solved.has(challenge.id)) {
    recordSubmission(player, challenge, { ok: true }, source);
    return { ok: true, duplicate: true, challengeId: challenge.id, points: challenge.points };
  }

  state.solved.add(challenge.id);
  let nextChallenge = null;
  let generationError = "";
  try {
    nextChallenge = await createFollowUpChallenge(challenge);
  } catch (error) {
    generationError = "El solve fue registrado, pero no se pudo crear el siguiente reto todavía.";
    console.error("Follow-up challenge failed:", error.message);
  }
  recordSubmission(player, challenge, { ok: true }, source);
  return { ok: true, challengeId: challenge.id, points: challenge.points, nextChallenge, generationError };
}

async function dockerStatus() {
  if (Date.now() - dockerStatusCache.at < 10000 && dockerStatusCache.value) return dockerStatusCache.value;
  const result = await run(DOCKER_BIN, ["version", "--format", "{{.Server.Version}}"], { timeout: 10000 });
  const value = result.ok && result.output
    ? { ready: true, version: result.output.split("\n")[0].trim() }
    : { ready: false, error: /cannot find the file|connect/i.test(result.output) ? "Docker Desktop no está iniciado." : (result.output || "Docker no está disponible en el PATH.") };
  dockerStatusCache = { at: Date.now(), value };
  return value;
}

async function ensureNetwork(environment) {
  const inspected = await run(DOCKER_BIN, ["network", "inspect", environment.network], { timeout: 10000 });
  if (inspected.ok) return { ok: true };
  const created = await run(DOCKER_BIN, ["network", "create", "--internal", "--driver", "bridge", environment.network], { timeout: 15000 });
  return created.ok ? { ok: true } : { ok: false, error: created.output || "No se pudo crear la red interna del laboratorio." };
}

// ---------------------------------------------------------------------------
// Construcción de imágenes en segundo plano, con log visible desde el navegador.
// La primera vez tarda varios minutos; el cliente consulta /api/kali/status.
// ---------------------------------------------------------------------------
const builds = {
  kali: { status: "idle", log: [], startedAt: 0, finishedAt: 0, error: "" },
  target: { status: "idle", log: [], startedAt: 0, finishedAt: 0, error: "" }
};

function startBuild(name, tag, args) {
  const state = builds[name];
  if (state.status === "building") return state;
  Object.assign(state, { status: "building", log: [], startedAt: Date.now(), finishedAt: 0, error: "" });
  const push = chunk => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => {
      state.log.push(line.slice(0, 240));
      if (state.log.length > 60) state.log.shift();
    });
  };
  console.log(`[build] ${tag}: docker ${args.join(" ")}`);
  let child;
  try {
    child = spawn(DOCKER_BIN, args, { cwd: ROOT, windowsHide: true, env: process.env });
  } catch (error) {
    Object.assign(state, { status: "error", error: `No se pudo ejecutar docker: ${error.message}`, finishedAt: Date.now() });
    return state;
  }
  child.stdout.on("data", push);
  child.stderr.on("data", push);
  child.on("error", error => Object.assign(state, { status: "error", error: `No se pudo ejecutar docker: ${error.message}`, finishedAt: Date.now() }));
  child.on("close", code => {
    state.finishedAt = Date.now();
    if (code === 0) { state.status = "ready"; console.log(`[build] ${tag}: lista.`); }
    else { state.status = "error"; state.error = `docker build terminó con código ${code}. Últimas líneas:\n${state.log.slice(-8).join("\n")}`; console.error(`[build] ${tag}: ${state.error}`); }
  });
  return state;
}

async function ensureImage(name, tag, args, failMessage) {
  const state = builds[name];
  if (state.status === "ready") return { ok: true };
  const inspected = await run(DOCKER_BIN, ["image", "inspect", tag], { timeout: 10000 });
  if (inspected.ok) { state.status = "ready"; return { ok: true }; }
  if (state.status === "error" && Date.now() - state.finishedAt < 15000) return { ok: false, error: `${failMessage}\n${state.error}` };
  const started = startBuild(name, tag, args);
  if (started.status === "error") return { ok: false, error: `${failMessage}\n${started.error}` };
  return { ok: false, building: true, error: `Construyendo la imagen ${tag}. Puede tardar varios minutos la primera vez.`, build: buildSummary(name) };
}

function buildSummary(name) {
  const state = builds[name];
  return { name, status: state.status, startedAt: state.startedAt, elapsedSeconds: state.startedAt ? Math.round(((state.finishedAt || Date.now()) - state.startedAt) / 1000) : 0, log: state.log.slice(-25), error: state.error };
}

function ensureKaliImage() {
  return ensureImage("kali", IMAGE, ["build", "--tag", IMAGE, "--file", DOCKERFILE, ROOT], "No se pudo crear la imagen Kali.");
}

function ensureTargetImage() {
  return ensureImage("target", TARGET_IMAGE, ["build", "--tag", TARGET_IMAGE, "--file", TARGET_DOCKERFILE, TARGET_CONTEXT], "No se pudo crear la imagen del objetivo simulado.");
}

// `full` (solo administradores): versiones de Docker/Node y sistema operativo
// del host. Un estudiante ve solo el estado de SU contenedor: las versiones
// exactas le sirven a un atacante para buscar vulnerabilidades conocidas.
async function diagnose(player, { full = false } = {}) {
  const environment = player ? environmentFor(player) : null;
  const checks = full ? [
    ["docker version", ["version", "--format", "client={{.Client.Version}} server={{.Server.Version}} os={{.Server.Os}}"]],
    ["docker info (OS)", ["info", "--format", "{{.OperatingSystem}} / {{.OSType}}"]],
    [`imagen ${IMAGE}`, ["image", "inspect", "--format", "{{.Id}} creada {{.Created}}", IMAGE]],
    [`imagen ${TARGET_IMAGE}`, ["image", "inspect", "--format", "{{.Id}} creada {{.Created}}", TARGET_IMAGE]]
  ] : [];
  if (environment) {
    checks.push([`red ${environment.network}`, ["network", "inspect", "--format", "{{.Name}} internal={{.Internal}}", environment.network]]);
    checks.push([`contenedor ${environment.kali}`, ["inspect", "--format", "running={{.State.Running}} exit={{.State.ExitCode}} error={{.State.Error}}", environment.kali]]);
    checks.push([`contenedor ${environment.target}`, ["inspect", "--format", "running={{.State.Running}}", environment.target]]);
    checks.push([`exec en ${environment.kali}`, ["exec", "-u", "kali", environment.kali, "bash", "-lc", "id && test -w /workspace && echo workspace:rw && ls /lab/challenges | head -3 && ctf help | head -1"]]);
  }
  const lines = [`WISPR diagnóstico ${new Date().toISOString()}`];
  if (full) lines.push(`host=${process.platform} node=${process.version} docker_bin=${DOCKER_BIN}`);
  lines.push(`build kali=${builds.kali.status} target=${builds.target.status}`, "");
  for (const [label, args] of checks) {
    const result = await run(DOCKER_BIN, args, { timeout: 20000 });
    lines.push(`${result.ok ? "OK  " : "FAIL"} ${label}`);
    if (result.output) lines.push(...result.output.split("\n").slice(0, 6).map(line => "     " + line));
  }
  if (builds.kali.status === "error") lines.push("", "Último error de build Kali:", builds.kali.error);
  return lines.join("\n");
}

const diagnoseLastRun = new Map(); // playerId -> último diagnóstico (ms)

// Comprueba que el bind de /workspace dentro del contenedor refleja de verdad la
// carpeta del host: escribe un centinela en el host y lo busca dentro. Si no
// aparece, el montaje quedó obsoleto (p. ej. tras recrear la carpeta o mover el
// proyecto) y el contenedor hay que recrearlo.
async function workspaceMountHealthy(environment) {
  const token = `.mount-${crypto.randomBytes(6).toString("hex")}`;
  const probe = path.join(environment.workspace, token);
  try { fs.writeFileSync(probe, "ok", "utf8"); } catch { return false; }
  const seen = await run(DOCKER_BIN, ["exec", "-u", "kali", environment.kali, "test", "-f", `/workspace/${token}`], { timeout: 10000 });
  try { fs.unlinkSync(probe); } catch { /* ignore */ }
  return seen.ok;
}

async function ensureLabEnvironment(player) {
  const environment = environmentFor(player);
  let existing = await run(DOCKER_BIN, ["container", "inspect", environment.kali], { timeout: 10000 });
  if (!existing.ok && !knownEnvironments.has(environment.scope) && knownEnvironments.size >= MAX_LAB_ENVIRONMENTS) {
    return { ok: false, error: `Límite de ${MAX_LAB_ENVIRONMENTS} laboratorios activos alcanzado.` };
  }
  fs.mkdirSync(CHALLENGES_DIR, { recursive: true });
  fs.mkdirSync(environment.workspace, { recursive: true });
  const network = await ensureNetwork(environment);
  if (!network.ok) { console.error("[lab] red:", network.error); return network; }
  const image = await ensureKaliImage();
  if (!image.ok) { if (!image.building) console.error("[lab] imagen:", image.error); return image; }

  // Contenedor ya existente: arráncalo y verifica que /workspace refleje el host.
  // Si el montaje está obsoleto, se recrea para que la terminal vea active.json.
  if (existing.ok) {
    await run(DOCKER_BIN, ["start", environment.kali], { timeout: 30000 });
    if (!(await workspaceMountHealthy(environment))) {
      console.warn("[lab] montaje /workspace obsoleto; recreando contenedor Kali.");
      await run(DOCKER_BIN, ["rm", "-f", environment.kali], { timeout: 15000 });
      existing = { ok: false };
    }
  }

  if (!existing.ok) {
    const created = await run(DOCKER_BIN, [
      "run", "-d", "--name", environment.kali,
      "--hostname", "wispr",
      "--network", environment.network,
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges:true",
      "--pids-limit", "256",
      "--memory", process.env.KALI_MEMORY || "2g",
      "--cpus", process.env.KALI_CPUS || "2",
      "--read-only",
      "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=256m",
      "--tmpfs", "/home/kali:rw,nosuid,nodev,size=64m",
      "--user", "1000:1000",
      "-v", `${CHALLENGES_DIR}:/lab/challenges:ro`,
      "-v", `${environment.workspace}:/workspace:rw`,
      "-w", "/workspace",
      IMAGE
    ], { timeout: 60000 });
    if (!created.ok) { console.error("[lab] docker run:", created.output); return { ok: false, error: created.output || "No se pudo crear el contenedor Kali aislado." }; }
  }
  const started = await run(DOCKER_BIN, ["start", environment.kali], { timeout: 30000 });
  if (!started.ok && !/already started/i.test(started.output)) return { ok: false, error: started.output || "No se pudo iniciar Kali." };
  const check = await run(DOCKER_BIN, ["exec", "-u", "kali", environment.kali, "bash", "-lc", "test -f /etc/os-release && test -w /workspace && echo ready"], { timeout: 30000 });
  if (!check.ok) { console.error("[lab] exec check:", check.output); return { ok: false, error: `Kali arrancó pero no respondió al exec de prueba: ${check.output || "sin salida"}` }; }
  knownEnvironments.add(environment.scope);
  return { ok: true, output: "Kali aislada y lista.", environment };
}

function targetPortsFor(challenge) {
  return (challenge.target && Array.isArray(challenge.target.ports) && challenge.target.ports.length)
    ? challenge.target.ports
    : (CATEGORY_TARGET_PROFILES[challenge.category] || DEFAULT_TARGET_PORTS);
}

async function ensureTarget(player, challenge) {
  const environment = environmentFor(player);
  const lab = await ensureLabEnvironment(player);
  if (!lab.ok) return lab;
  const image = await ensureTargetImage();
  if (!image.ok) return image;
  await run(DOCKER_BIN, ["rm", "-f", environment.target], { timeout: 15000 });
  const ports = targetPortsFor(challenge);
  const created = await run(DOCKER_BIN, [
    "run", "-d", "--name", environment.target,
    "--network", environment.network, "--network-alias", "target",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges:true",
    "--pids-limit", "64",
    "--memory", "128m",
    "--cpus", "0.5",
    "--read-only",
    "--user", "65534:65534",
    "-e", `TARGET_PORTS_JSON=${JSON.stringify(ports)}`,
    TARGET_IMAGE
  ], { timeout: 30000 });
  return created.ok
    ? { ok: true, host: "target", ports: ports.map(port => port.port) }
    : { ok: false, error: created.output || "No se pudo iniciar el objetivo simulado." };
}

async function containerStatus(player) {
  const environment = environmentFor(player);
  const result = await run(DOCKER_BIN, ["inspect", "--format", "{{.State.Running}}", environment.kali], { timeout: 10000 });
  return { ok: result.ok, running: result.ok && result.output === "true", output: result.output };
}

async function stopEnvironment(player) {
  const environment = environmentFor(player);
  await run(DOCKER_BIN, ["rm", "-f", environment.target], { timeout: 15000 });
  const stopped = await run(DOCKER_BIN, ["stop", environment.kali], { timeout: 30000 });
  knownEnvironments.delete(environment.scope);
  return { ok: stopped.ok, output: stopped.ok ? "Entorno Kali detenido." : stopped.output };
}

// Borrado de cuenta desde el panel admin: quita el registro y, en mejor
// esfuerzo, todo su rastro en disco/Docker (nunca bloquea el borrado si esa
// limpieza falla; la cuenta ya no debe volver a aparecer en el listado).
async function deletePlayerAccount(target) {
  const environment = environmentFor(target);
  revokePlayerSessions(target);
  delete registry.players[target];
  await saveRegistry();
  playerStates.delete(target);
  instanceFlags.delete(target);
  try { fs.unlinkSync(instanceStoreFile(target)); } catch { /* sin instancia guardada */ }
  try { fs.rmSync(environment.workspace, { recursive: true, force: true }); } catch (error) { console.error("No se pudo borrar el workspace:", error.message); }
  await run(DOCKER_BIN, ["rm", "-f", environment.kali], { timeout: 15000 });
  await run(DOCKER_BIN, ["rm", "-f", environment.target], { timeout: 15000 });
  await run(DOCKER_BIN, ["network", "rm", environment.network], { timeout: 15000 });
  knownEnvironments.delete(environment.scope);
  // Saca a la cuenta borrada de cualquier grupo (el grupo en sí se conserva,
  // aunque haya sido quien lo creó: publicGroup() ya cubre ese caso).
  let groupsChanged = false;
  for (const group of Object.values(groupsStore.groups)) {
    if (group.memberIds && group.memberIds.includes(target)) {
      group.memberIds = group.memberIds.filter(id => id !== target);
      groupsChanged = true;
    }
  }
  if (groupsChanged) await saveGroups();
}

// Cierra todas las sesiones de terminal (WebSocket) abiertas por una cuenta.
// Se usa al bloquearla: el `wss` se define más abajo, pero esta función solo
// se invoca en tiempo de petición, cuando ya existe.
function closePlayerSessions(pid) {
  let closed = 0;
  for (const client of wss.clients) {
    if (client._playerId === pid) {
      try { client.close(4403, "cuenta bloqueada"); } catch { /* socket ya cerrado */ }
      closed += 1;
    }
  }
  return closed;
}

// Detiene (sin borrar) el contenedor Kali y el objetivo de una cuenta.
async function stopPlayerContainers(pid) {
  const environment = environmentFor(pid);
  await run(DOCKER_BIN, ["stop", environment.kali], { timeout: 15000 }).catch(() => {});
  await run(DOCKER_BIN, ["stop", environment.target], { timeout: 15000 }).catch(() => {});
}

// `token` solo se usa en modo conectado (para reenviar cada envío a FastAPI).
async function readTerminalSubmissions(player, cursor, token) {
  const environment = environmentFor(player);
  const file = path.join(environment.workspace, "submissions.ndjson");
  if (!fs.existsSync(file)) return { cursor: 0, submissions: [] };
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).slice(0, 5000);
  const start = Math.max(0, Math.min(lines.length, Number(cursor) || 0));
  const submissions = [];
  for (let index = start; index < lines.length; index += 1) {
    let record;
    try { record = JSON.parse(lines[index]); } catch { continue; }
    const key = `${player}:${record.id || crypto.createHash("sha256").update(`${index}:${lines[index]}`).digest("hex")}`;
    let fresh = false;
    if (!terminalSubmissionResults.has(key)) {
      fresh = true;
      terminalSubmissionResults.set(key, CONNECTED
        ? forwardSubmission(token, record)
        : verifySubmission(player, record.challengeId, record.flag, "terminal"));
    }
    const result = await terminalSubmissionResults.get(key);
    if (fresh) writeTerminalResult(environment, record, result);
    submissions.push({ ...result, source: "terminal" });
  }
  return { cursor: lines.length, submissions };
}

// El comando `ctf submit` de Kali espera esta línea para imprimir el resultado directamente en la shell.
function writeTerminalResult(environment, record, result) {
  const challenge = challengeRegistry.get(result.challengeId || record.challengeId);
  const line = JSON.stringify({
    id: record.id,
    challengeId: result.challengeId || record.challengeId,
    title: challenge ? challenge.title : (backendTitles.get(result.challengeId || record.challengeId) || ""),
    ok: Boolean(result.ok),
    duplicate: Boolean(result.duplicate),
    points: result.points || 0,
    error: result.error || "",
    nextChallenge: result.nextChallenge ? result.nextChallenge.title : "",
    at: new Date().toISOString()
  });
  try { fs.appendFileSync(path.join(environment.workspace, "results.ndjson"), line + "\n", "utf8"); } catch (error) { console.error("No se pudo escribir results.ndjson:", error.message); }
}

function countSubmissionLines(player) {
  const file = path.join(environmentFor(player).workspace, "submissions.ndjson");
  try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length; } catch { return 0; }
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; base-uri 'none'; frame-ancestors 'none'"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function serveVideo(req, res, filePath) {
  fs.stat(filePath, (error, stat) => {
    if (error) return sendJson(res, 404, { ok: false, error: "Recurso no encontrado." });
    const total = stat.size;
    const base = { ...SECURITY_HEADERS, "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=86400" };
    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range) || [];
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (!Number.isFinite(start) || start < 0) start = 0;
      if (!Number.isFinite(end) || end >= total) end = total - 1;
      if (start > end) { res.writeHead(416, { ...base, "Content-Range": `bytes */${total}` }); return res.end(); }
      res.writeHead(206, { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": end - start + 1 });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...base, "Content-Length": total });
    return fs.createReadStream(filePath).pipe(res);
  });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { ok: false, error: "Recurso no encontrado." });
    const extension = path.extname(filePath).toLowerCase();
    const contentType = {
      ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
      ".mp4": "video/mp4", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
      ".txt": "text/plain; charset=utf-8", ".pcap": "application/vnd.tcpdump.pcap", ".pcapng": "application/octet-stream"
    }[extension] || "application/octet-stream";
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": contentType, "Cache-Control": "no-store" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 128 * 1024) {
        reject(new Error("Solicitud demasiado grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function parseJson(req) {
  let body;
  try { body = JSON.parse((await readBody(req)) || "{}"); } catch { body = {}; }
  if (!body || typeof body !== "object" || Array.isArray(body)) body = {};
  // En rutas protegidas, la identidad siempre sale de la sesión.
  if (req.sessionPlayerId) body.playerId = req.sessionPlayerId;
  return body;
}

function isLocalRequest(req) {
  const remote = req.socket.remoteAddress || "";
  return remote === "127.0.0.1" || remote === "::1" || remote.endsWith("127.0.0.1");
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  if (ALLOWED_HOSTS.has(host)) return true;
  console.warn(`[origen] rechazado: ${host}. Si es la dirección pública de WISPR, agrégala a WISPR_PUBLIC_HOSTS.`);
  return false;
}

function serveVendor(res, pathname) {
  const files = {
    "/vendor/xterm.js": "@xterm/xterm/lib/xterm.js",
    "/vendor/xterm.css": "@xterm/xterm/css/xterm.css",
    "/vendor/xterm-fit.js": "@xterm/addon-fit/lib/addon-fit.js",
    "/vendor/gsap.min.js": "gsap/dist/gsap.min.js",
    "/vendor/ScrollTrigger.min.js": "gsap/dist/ScrollTrigger.min.js"
  };
  if (!files[pathname]) return false;
  try { serveFile(res, require.resolve(files[pathname])); } catch { sendJson(res, 503, { ok: false, error: "Instala las dependencias con npm install." }); }
  return true;
}

function publicStaticPath(pathname) {
  const files = {
    "/": "index.html",
    "/index.html": "index.html",
    "/style.css": "style.css",
    "/app.js": "app.js",
    "/motion.js": "motion.js",
    "/theme-init.js": "theme-init.js",
    "/img/fondo.mp4": path.join("img", "fondo.mp4"),
    "/img/logo.png": path.join("img", "logo.png"),
    "/img/mascot.png": path.join("img", "mascot.png"),
    "/img/four-way-handshake.mp4": path.join("img", "Four-Way Handshake.mp4"),
    // Fotos del equipo en la landing: si el archivo no existe todavía, serveFile
    // responde 404 y el <img onerror> del frontend cae a un círculo con iniciales.
    "/img/team/sebastian-urena.jpg": path.join("img", "team", "sebastian-urena.jpg"),
    "/img/team/jathniel-navarrete.jpg": path.join("img", "team", "jathniel-navarrete.jpg"),
    "/img/team/alonso-lopez.jpg": path.join("img", "team", "alonso-lopez.jpg"),
    "/img/team/yuran-mora.jpg": path.join("img", "team", "yuran-mora.jpg"),
    "/img/team/ester-espinoza.jpg": path.join("img", "team", "ester-espinoza.jpg")
  };
  if (files[pathname]) return path.join(ROOT, files[pathname]);
  // Carpetas de medios editables: basta soltar el archivo (nombre en
  // minúsculas, sin rutas) para que se sirva, sin tocar este archivo.
  const media = pathname.match(/^\/img\/(historias|team)\/([a-z0-9][a-z0-9-]{0,60}\.(?:mp4|jpg|png))$/);
  if (media) return path.join(ROOT, "img", media[1], media[2]);
  return null;
}

const server = http.createServer(async (req, res) => {
  if (!isLocalRequest(req) || !isAllowedOrigin(req)) return sendJson(res, 403, { ok: false, error: "Acceso local requerido." });
  let url;
  try { url = new URL(req.url, `http://${HOST}:${PORT}`); } catch { return sendJson(res, 400, { ok: false, error: "Solicitud inválida." }); }
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });

  // Modo conectado: todo /api/* que no es de la terminal lo atiende FastAPI.
  if (CONNECTED && url.pathname.startsWith("/api/") && !TERMINAL_API.has(url.pathname)) return proxyToBackend(req, res, url);

  // Todo /api/* fuera de PUBLIC_API exige una sesión válida. El playerId de la
  // sesión reemplaza al que venga en la URL o en el cuerpo (ver parseJson), así
  // que los handlers de abajo nunca confían en lo que diga el navegador.
  if (url.pathname.startsWith("/api/") && !PUBLIC_API.has(url.pathname)) {
    let sessionPlayer = null;
    if (CONNECTED) {
      try {
        const session = await backendSession(bearerToken(req));
        sessionPlayer = session && session.id;
        req.sessionRole = session ? session.role : "";
      } catch (error) {
        console.error("[sesión] FastAPI no responde:", error.message);
        return sendJson(res, 503, { ok: false, error: "El servidor de cuentas de WISPR no responde. Intenta en un momento." });
      }
    } else {
      sessionPlayer = resolveSession(bearerToken(req));
    }
    if (!sessionPlayer) return sendJson(res, 401, { ok: false, auth: "required", error: "Tu sesión expiró o no es válida. Inicia sesión de nuevo." });
    req.sessionPlayerId = sessionPlayer;
    url.searchParams.set("playerId", sessionPlayer);
  }

  if (url.pathname === "/api/challenges" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, challenges: challengeCatalog.map(id => publicChallenge(challengeRegistry.get(id))) });
  }
  if (url.pathname === "/api/platform/status" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, docker: await dockerStatus(), isolation: "per-player Docker containers on internal networks", generator: process.env.AI_CHALLENGE_ENDPOINT ? "external-ai" : "template-fallback" });
  }
  if (url.pathname === "/api/players/register" && req.method === "POST") {
    const draft = beginRegistration(await parseJson(req));
    if (!draft.ok) return sendJson(res, 400, draft);
    const mail = await sendVerificationCode(draft.email, pendingRegistrations.get(draft.token).code);
    if (!mail.ok) { pendingRegistrations.delete(draft.token); return sendJson(res, 502, mail); }
    return sendJson(res, 200, {
      ok: true, pending: true, token: draft.token, email: draft.email, role: draft.role,
      dev: mail.dev, devCode: mail.dev ? mail.code : undefined
    });
  }
  if (url.pathname === "/api/players/verify" && req.method === "POST") {
    const body = await parseJson(req);
    const result = completeRegistration(body.token, body.code);
    if (result.ok) result.sessionToken = createSession(result.player.playerId);
    return sendJson(res, result.ok ? 200 : 400, result);
  }
  if (url.pathname === "/api/players/resend" && req.method === "POST") {
    const body = await parseJson(req);
    const draft = resendVerificationCode(body.token);
    if (!draft.ok) return sendJson(res, 400, draft);
    const mail = await sendVerificationCode(draft.email, draft.code);
    if (!mail.ok) return sendJson(res, 502, mail);
    return sendJson(res, 200, { ok: true, dev: mail.dev, devCode: mail.dev ? mail.code : undefined });
  }
  if (url.pathname === "/api/players/login" && req.method === "POST") {
    const draft = beginLogin(await parseJson(req));
    if (!draft.ok) return sendJson(res, 401, draft);
    // Admin: sesión inmediata, sin código ni correo.
    if (draft.admin) return sendJson(res, 200, { ok: true, player: draft.player, sessionToken: createSession(draft.player.playerId) });
    const mail = await sendVerificationCode(draft.email, pendingLogins.get(draft.token).code);
    if (!mail.ok) { pendingLogins.delete(draft.token); return sendJson(res, 502, mail); }
    return sendJson(res, 200, {
      ok: true, pending: true, token: draft.token, email: draft.email, role: draft.role,
      dev: mail.dev, devCode: mail.dev ? mail.code : undefined
    });
  }
  if (url.pathname === "/api/players/login-verify" && req.method === "POST") {
    const body = await parseJson(req);
    const result = completeLogin(body.token, body.code);
    if (result.ok) result.sessionToken = createSession(result.player.playerId);
    return sendJson(res, result.ok ? 200 : 400, result);
  }
  if (url.pathname === "/api/players/login-resend" && req.method === "POST") {
    const body = await parseJson(req);
    const draft = resendLoginCode(body.token);
    if (!draft.ok) return sendJson(res, 400, draft);
    const mail = await sendVerificationCode(draft.email, draft.code);
    if (!mail.ok) return sendJson(res, 502, mail);
    return sendJson(res, 200, { ok: true, dev: mail.dev, devCode: mail.dev ? mail.code : undefined });
  }
  if (url.pathname === "/api/players/me" && req.method === "GET") {
    const player = playerId(url.searchParams.get("playerId"));
    const record = player && registry.players[player];
    return record ? sendJson(res, 200, { ok: true, player: publicPlayer(record) }) : sendJson(res, 404, { ok: false, error: "Jugador no registrado." });
  }
  if (url.pathname === "/api/players/logout" && req.method === "POST") {
    revokeSession(bearerToken(req));
    return sendJson(res, 200, { ok: true });
  }
  if (url.pathname === "/api/progress" && req.method === "POST") {
    const body = await parseJson(req);
    const record = registry.players[req.sessionPlayerId];
    if (!record) return sendJson(res, 404, { ok: false, error: "Jugador no registrado." });
    const result = mergeLessonProgress(record, body.lessonId, body);
    if (!result.ok) return sendJson(res, 400, result);
    await saveRegistry();
    return sendJson(res, 200, { ok: true, lessonProgress: record.lessonProgress });
  }
  // Ranking real de estudiantes: sin ids ni correos, solo lo que se muestra.
  if (url.pathname === "/api/ranking" && req.method === "GET") {
    const ranking = Object.values(registry.players)
      .filter(player => player.role === "estudiante" && !isAdminPlayer(player))
      .map(player => {
        const entries = Object.values(player.solved || {});
        return {
          name: player.name,
          handle: player.handle,
          score: entries.reduce((sum, entry) => sum + (entry.points || 0), 0),
          solves: entries.length,
          streak: currentStreak(player),
          current: player.id === req.sessionPlayerId
        };
      })
      .sort((left, right) => right.score - left.score || right.solves - left.solves || left.name.localeCompare(right.name))
      .slice(0, 100);
    return sendJson(res, 200, { ok: true, ranking });
  }
  // Panel admin: listar y eliminar cuentas. Ambos exigen que playerId
  // corresponda a una cuenta admin ya registrada (mismo criterio que el login).
  if (url.pathname === "/api/admin/players" && req.method === "GET") {
    const admin = adminPlayerFromRequest(url.searchParams.get("playerId"));
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const players = Object.values(registry.players)
      .map(record => ({
        ...publicPlayer(record),
        isAdmin: isAdminPlayer(record),
        locked: Boolean(record.locked),
        lockReason: record.lockReason || "",
        lockedUntil: isAccountLocked(record) && !record.locked ? record.lockedUntil : 0,
        security: (record.security || []).slice(-10)
      }))
      .sort((left, right) => new Date(right.joined) - new Date(left.joined));
    return sendJson(res, 200, { ok: true, players });
  }
  if (url.pathname === "/api/admin/players" && req.method === "DELETE") {
    const body = await parseJson(req);
    const admin = adminPlayerFromRequest(body.playerId);
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const target = playerId(body.targetId);
    if (!target || !registry.players[target]) return sendJson(res, 404, { ok: false, error: "Esa cuenta no existe." });
    if (target === admin.id) return sendJson(res, 400, { ok: false, error: "No puedes eliminar tu propia cuenta de administrador." });
    await deletePlayerAccount(target);
    return sendJson(res, 200, { ok: true });
  }
  if (url.pathname === "/api/admin/players/bulk" && req.method === "DELETE") {
    const body = await parseJson(req);
    const admin = adminPlayerFromRequest(body.playerId);
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const requested = Array.isArray(body.targetIds) ? body.targetIds.slice(0, 500) : [];
    const deleted = [];
    const skipped = [];
    for (const raw of requested) {
      const target = playerId(raw);
      if (!target || !registry.players[target]) { skipped.push({ id: raw, reason: "no existe" }); continue; }
      if (target === admin.id) { skipped.push({ id: target, reason: "cuenta propia" }); continue; }
      await deletePlayerAccount(target);
      deleted.push(target);
    }
    return sendJson(res, 200, { ok: true, deleted, skipped });
  }
  // Cambio de contraseña por el propio jugador. Obligatorio tras un reset del
  // admin (mustChangePassword) y disponible en cualquier momento.
  if (url.pathname === "/api/players/change-password" && req.method === "POST") {
    const body = await parseJson(req);
    const pid = playerId(body.playerId);
    const player = pid && registry.players[pid];
    if (!player) return sendJson(res, 404, { ok: false, error: "Jugador no registrado." });
    if (isAccountLocked(player)) return sendJson(res, 403, { ok: false, error: "Tu cuenta está bloqueada. Contacta al administrador del rango." });
    if (!passwordMatches(player, body.currentPassword)) return sendJson(res, 401, { ok: false, error: "La contraseña actual no es correcta." });
    const next = String(body.newPassword || "");
    if (next.length < 4) return sendJson(res, 400, { ok: false, error: "La nueva contraseña debe tener al menos 4 caracteres." });
    if (passwordMatches(player, next)) return sendJson(res, 400, { ok: false, error: "La nueva contraseña debe ser distinta de la actual." });
    const { salt, hash } = hashPassword(next);
    player.salt = salt; player.passwordHash = hash;
    player.mustChangePassword = false;
    player.failedLogins = [];
    pushSecurityEvent(player, "password-change", "cambio por el propio usuario");
    await saveRegistry();
    return sendJson(res, 200, { ok: true, player: publicPlayer(player) });
  }
  // Recuperación SIN correo: el admin emite una contraseña temporal de un solo
  // uso (la entrega en persona). El sistema obliga a cambiarla al entrar.
  if (url.pathname === "/api/admin/players/reset-password" && req.method === "POST") {
    const body = await parseJson(req);
    const admin = adminPlayerFromRequest(body.playerId);
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const target = playerId(body.targetId);
    const record = target && registry.players[target];
    if (!record) return sendJson(res, 404, { ok: false, error: "Esa cuenta no existe." });
    const temp = generateTempPassword();
    const { salt, hash } = hashPassword(temp);
    record.salt = salt; record.passwordHash = hash;
    record.mustChangePassword = true;
    record.failedLogins = [];
    if (!record.locked) record.lockedUntil = 0; // un reset limpia el bloqueo automático, no el manual
    pushSecurityEvent(record, "password-reset", `temporal emitida por ${admin.handle}`);
    await saveRegistry();
    revokePlayerSessions(target);
    // La temporal se devuelve UNA vez para que el admin la dicte al jugador.
    return sendJson(res, 200, { ok: true, tempPassword: temp, handle: record.handle, name: record.name });
  }
  // Bloqueo/desbloqueo manual de una cuenta por un admin. Bloquear cierra sus
  // sesiones y detiene su contenedor Kali.
  if (url.pathname === "/api/admin/players/lock" && req.method === "POST") {
    const body = await parseJson(req);
    const admin = adminPlayerFromRequest(body.playerId);
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const target = playerId(body.targetId);
    const record = target && registry.players[target];
    if (!record) return sendJson(res, 404, { ok: false, error: "Esa cuenta no existe." });
    if (target === admin.id) return sendJson(res, 400, { ok: false, error: "No puedes bloquear tu propia cuenta." });
    const lock = body.locked !== false; // por defecto, bloquear
    if (lock) {
      record.locked = true;
      record.lockReason = String(body.reason || "").slice(0, 200);
      pushSecurityEvent(record, "manual-lock", `${admin.handle}${record.lockReason ? ": " + record.lockReason : ""}`);
      await saveRegistry();
      revokePlayerSessions(target);
      const sessionsClosed = closePlayerSessions(target);
      await stopPlayerContainers(target);
      return sendJson(res, 200, { ok: true, locked: true, sessionsClosed });
    }
    record.locked = false;
    record.lockReason = "";
    record.lockedUntil = 0;
    record.failedLogins = [];
    pushSecurityEvent(record, "manual-unlock", admin.handle);
    await saveRegistry();
    return sendJson(res, 200, { ok: true, locked: false });
  }
  // Grupos: un profesor arma los suyos y agrega estudiantes ya registrados
  // por usuario o correo; un admin puede gestionar (y ver) cualquier grupo.
  if (url.pathname === "/api/groups" && req.method === "POST") {
    const body = await parseJson(req);
    const owner = professorPlayerFromRequest(body.playerId);
    if (!owner) return sendJson(res, 403, { ok: false, error: "Solo las cuentas de profesor pueden crear grupos." });
    const name = String(body.name || "").trim().slice(0, 64);
    if (!name) return sendJson(res, 400, { ok: false, error: "Escribe un nombre para el grupo." });
    const group = { id: crypto.randomUUID(), name, ownerId: owner.id, createdAt: new Date().toISOString(), memberIds: [] };
    groupsStore.groups[group.id] = group;
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  if (url.pathname === "/api/groups/mine" && req.method === "GET") {
    const owner = professorPlayerFromRequest(url.searchParams.get("playerId"));
    if (!owner) return sendJson(res, 403, { ok: false, error: "Solo las cuentas de profesor tienen grupos." });
    const groups = Object.values(groupsStore.groups).filter(group => group.ownerId === owner.id).map(publicGroup)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    return sendJson(res, 200, { ok: true, groups });
  }
  if (url.pathname === "/api/groups" && req.method === "DELETE") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes eliminar este grupo." });
    delete groupsStore.groups[group.id];
    await saveGroups();
    return sendJson(res, 200, { ok: true });
  }
  if (url.pathname === "/api/groups/members" && req.method === "POST") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes modificar este grupo." });
    const query = String(body.student || "").trim().toLowerCase();
    if (!query) return sendJson(res, 400, { ok: false, error: "Escribe el usuario o correo del estudiante." });
    const student = findPlayerByEmail(query) || findPlayerByHandle(normalizeHandle(query));
    if (!student) return sendJson(res, 404, { ok: false, error: "No se encontró ningún estudiante con ese usuario o correo." });
    if (isAdminPlayer(student) || student.role !== "estudiante") return sendJson(res, 400, { ok: false, error: "Solo puedes agregar cuentas de estudiante." });
    group.memberIds = group.memberIds || [];
    if (!group.memberIds.includes(student.id)) group.memberIds.push(student.id);
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  if (url.pathname === "/api/groups/members" && req.method === "DELETE") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes modificar este grupo." });
    const studentId = playerId(body.studentId);
    group.memberIds = (group.memberIds || []).filter(id => id !== studentId);
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  // Tareas por grupo: el dueño (o un admin) las crea, marca como hechas y
  // las borra; se guardan junto con el grupo en groups.json.
  if (url.pathname === "/api/groups/tasks" && req.method === "POST") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes modificar este grupo." });
    const title = String(body.title || "").trim().slice(0, 120);
    if (!title) return sendJson(res, 400, { ok: false, error: "Escribe un título para la tarea." });
    const description = String(body.description || "").trim().slice(0, 500);
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || "")) ? body.dueDate : "";
    // Tarea ligada a un reto existente (opcional): el cumplimiento se rastrea
    // solo con el `solved` real de cada estudiante, nunca a mano.
    const challengeId = String(body.challengeId || "").trim();
    if (challengeId && !challengeRegistry.has(challengeId)) return sendJson(res, 400, { ok: false, error: "Ese reto no existe." });
    const task = { id: crypto.randomUUID(), title, description, dueDate, challengeId, createdAt: new Date().toISOString(), done: false };
    group.tasks = group.tasks || [];
    group.tasks.push(task);
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  if (url.pathname === "/api/groups/tasks" && req.method === "DELETE") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes modificar este grupo." });
    group.tasks = (group.tasks || []).filter(task => task.id !== String(body.taskId || ""));
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  if (url.pathname === "/api/groups/tasks/toggle" && req.method === "POST") {
    const body = await parseJson(req);
    const group = groupsStore.groups[String(body.groupId || "")];
    if (!group) return sendJson(res, 404, { ok: false, error: "Ese grupo no existe." });
    const requester = registry.players[playerId(body.playerId) || ""];
    if (!groupManageAllowed(group, requester)) return sendJson(res, 403, { ok: false, error: "No puedes modificar este grupo." });
    const task = (group.tasks || []).find(item => item.id === String(body.taskId || ""));
    if (!task) return sendJson(res, 404, { ok: false, error: "Esa tarea no existe." });
    if (task.challengeId) return sendJson(res, 400, { ok: false, error: "Esta tarea está ligada a un reto: se completa sola cuando el estudiante lo resuelve." });
    task.done = !task.done;
    await saveGroups();
    return sendJson(res, 200, { ok: true, group: publicGroup(group) });
  }
  if (url.pathname === "/api/admin/groups" && req.method === "GET") {
    const admin = adminPlayerFromRequest(url.searchParams.get("playerId"));
    if (!admin) return sendJson(res, 403, { ok: false, error: "Acceso solo para administradores." });
    const groups = Object.values(groupsStore.groups).map(publicGroup)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    return sendJson(res, 200, { ok: true, groups });
  }
  // Progreso detallado de un estudiante: solo lo ve un admin, o el profesor
  // dueño de un grupo donde ese estudiante sea miembro.
  if (url.pathname === "/api/groups/student" && req.method === "GET") {
    const requester = registry.players[playerId(url.searchParams.get("playerId")) || ""];
    const studentId = playerId(url.searchParams.get("studentId"));
    const student = studentId && registry.players[studentId];
    if (!student) return sendJson(res, 404, { ok: false, error: "Ese estudiante no existe." });
    if (!canViewStudentDetail(requester, studentId)) return sendJson(res, 403, { ok: false, error: "No puedes ver el progreso de este estudiante." });
    return sendJson(res, 200, { ok: true, student: publicPlayer(student) });
  }
  // Lista de estudiantes disponibles para armar el selector de "agregar al
  // grupo" (un profesor ya puede agregar a cualquier estudiante a su propio
  // grupo; esto solo evita que tenga que escribir el usuario/correo a ciegas).
  if (url.pathname === "/api/groups/available-students" && req.method === "GET") {
    const requester = registry.players[playerId(url.searchParams.get("playerId")) || ""];
    if (!requester || (requester.role !== "profesor" && !isAdminPlayer(requester))) {
      return sendJson(res, 403, { ok: false, error: "Acceso solo para profesores o administradores." });
    }
    const students = Object.values(registry.players)
      .filter(player => player.role === "estudiante")
      .map(publicGroupMember)
      .sort((left, right) => left.name.localeCompare(right.name));
    return sendJson(res, 200, { ok: true, students });
  }
  if (url.pathname === "/api/kali/start" && req.method === "POST") {
    const body = await parseJson(req);
    const player = playerId(body.playerId);
    return player ? sendJson(res, 200, await ensureLabEnvironment(player)) : sendJson(res, 400, { ok: false, error: "Sesión de jugador inválida." });
  }
  if (url.pathname === "/api/kali/stop" && req.method === "POST") {
    const body = await parseJson(req);
    const player = playerId(body.playerId);
    return player ? sendJson(res, 200, await stopEnvironment(player)) : sendJson(res, 400, { ok: false, error: "Sesión de jugador inválida." });
  }
  if (url.pathname === "/api/kali/status" && req.method === "GET") {
    const player = playerId(url.searchParams.get("playerId"));
    if (!player) return sendJson(res, 400, { ok: false, error: "Sesión de jugador inválida." });
    const container = await containerStatus(player);
    return sendJson(res, 200, { ok: true, container, docker: await dockerStatus(), builds: { kali: buildSummary("kali"), target: buildSummary("target") } });
  }
  if (url.pathname === "/api/kali/diagnose" && req.method === "GET") {
    const player = playerId(url.searchParams.get("playerId"));
    // Máximo un diagnóstico cada 10 s por jugador: cada uno lanza ~8 comandos
    // docker, y sin límite se podía saturar el host pidiéndolo en bucle.
    const now = Date.now();
    if (now - (diagnoseLastRun.get(player) || 0) < 10000) {
      return sendJson(res, 429, { ok: false, error: "Espera unos segundos antes de volver a diagnosticar." });
    }
    diagnoseLastRun.set(player, now);
    const full = CONNECTED ? req.sessionRole === "admin" : isAdminPlayer(registry.players[req.sessionPlayerId]);
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(await diagnose(player, { full }));
  }
  if (url.pathname === "/api/challenges/active" && req.method === "POST") {
    const body = await parseJson(req);
    const player = playerId(body.playerId);
    // Montar el reto = escribir su evidencia + active.json en el workspace. Esto
    // es lo único imprescindible para resolverlo en la terminal. En modo
    // conectado el reto y sus archivos vienen de FastAPI.
    let challenge = CONNECTED ? null : challengeRegistry.get(String(body.challengeId || ""));
    let active;
    if (CONNECTED && player) {
      try {
        challenge = active = await prepareWorkspaceFromBackend(player, bearerToken(req), body.challengeId);
      } catch (error) {
        console.error("[lab] preparar workspace desde FastAPI:", error.message);
        return sendJson(res, 502, { ok: false, error: "No se pudo preparar la evidencia del reto." });
      }
    }
    if (!player || !challenge) return sendJson(res, 400, { ok: false, error: "Reto o sesión inválidos." });
    if (!CONNECTED) {
      try {
        active = preparePlayerWorkspace(player, challenge);
      } catch (error) {
        console.error("[lab] preparar workspace:", error.message);
        return sendJson(res, 500, { ok: false, error: "No se pudo preparar la evidencia del reto." });
      }
    }
    // Asegura el contenedor Kali con un montaje /workspace sano (auto-repara si
    // quedó obsoleto), para que `ctf show` encuentre active.json de inmediato.
    const lab = await ensureLabEnvironment(player);
    if (!lab.ok && !lab.building) console.warn("[lab] entorno no listo al activar:", lab.error);
    // El objetivo de red (target) es OPCIONAL: los retos de análisis se resuelven
    // sobre el artefacto, así que un fallo del target no impide montar el reto.
    let target = { ok: false, optional: true };
    try {
      const result = await ensureTarget(player, challenge);
      target = { ...result, optional: true };
      if (result && !result.ok && !result.building) console.warn("[lab] target opcional no disponible:", result.error);
    } catch (error) {
      console.warn("[lab] target opcional falló:", error.message);
      target = { ok: false, optional: true, error: error.message };
    }
    return sendJson(res, 200, { ok: true, challenge: active, lab, target });
  }
  if (url.pathname === "/api/submissions" && req.method === "POST") {
    const body = await parseJson(req);
    const player = playerId(body.playerId);
    if (!player) return sendJson(res, 400, { ok: false, error: "Sesión de jugador inválida." });
    return sendJson(res, 200, await verifySubmission(player, body.challengeId, body.flag));
  }
  if (url.pathname === "/api/submissions" && req.method === "GET") {
    const player = playerId(url.searchParams.get("playerId"));
    return player
      ? sendJson(res, 200, { ok: true, ...(await readTerminalSubmissions(player, url.searchParams.get("cursor"))) })
      : sendJson(res, 400, { ok: false, error: "Sesión de jugador inválida." });
  }
  const artifactMatch = url.pathname.match(/^\/api\/challenges\/([^/]+)\/files\/([^/]+)$/);
  if (artifactMatch && req.method === "GET") {
    const challenge = challengeRegistry.get(decodeURIComponent(artifactMatch[1]));
    const filename = safeFileName(decodeURIComponent(artifactMatch[2]));
    if (!challenge) return sendJson(res, 404, { ok: false, error: "Archivo no encontrado." });
    const player = playerId(url.searchParams.get("playerId"));
    if (player) {
      // Sirve el artefacto de la INSTANCIA de este jugador: es el mismo que ve en
      // la terminal y su flag es la que valida el servidor. Registra la flag para
      // que el envío desde la web funcione aunque nunca abra la terminal.
      const baseFile = (challenge.files && challenge.files[0] && challenge.files[0].name) || "evidence.txt";
      const instance = materializeInstance({
        player, challengeId: challenge.id, baseFlag: challenge.flag,
        fileName: baseFile, category: challenge.category, difficulty: challenge.difficulty, kind: challenge.kind, seedSecret: INSTANCE_SECRET
      });
      setInstanceFlag(player, challenge.id, instance.flag);
      // Sirve el archivo solicitado por nombre (pcap, wordlist, …); si no coincide, el primero.
      const file = instance.files.find(f => safeFileName(f.name) === filename) || instance.files[0];
      const data = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content), "utf8");
      const isPcap = /\.pcap$/i.test(file.name);
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": isPcap ? "application/vnd.tcpdump.pcap" : "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${safeFileName(file.name)}"`
      });
      return res.end(data);
    }
    // Sin jugador: artefacto estático base (compatibilidad).
    if (!challenge.files.some(file => file.name === filename)) return sendJson(res, 404, { ok: false, error: "Archivo no encontrado." });
    return serveFile(res, path.join(CHALLENGES_DIR, safeId(challenge.id), filename));
  }
  if (serveVendor(res, url.pathname)) return;
  const staticPath = publicStaticPath(url.pathname);
  if (staticPath) return staticPath.toLowerCase().endsWith(".mp4") ? serveVideo(req, res, staticPath) : serveFile(res, staticPath);
  return sendJson(res, 404, { ok: false, error: "Recurso no encontrado." });
});

const wss = new WebSocketServer({ noServer: true, clientTracking: true });
server.on("upgrade", async (req, socket, head) => {
  let url;
  try { url = new URL(req.url, `http://${HOST}:${PORT}`); } catch { socket.destroy(); return; }
  if (url.pathname !== "/ws/terminal" || !isLocalRequest(req) || !isAllowedOrigin(req) || wss.clients.size >= MAX_COMMAND_SESSIONS) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return;
  }
  // El navegador no puede mandar cabeceras en un WebSocket: el token va en ?token=.
  const token = url.searchParams.get("token");
  let player = null;
  if (CONNECTED) {
    // FastAPI ya rechaza sesiones vencidas, cerradas o de cuentas bloqueadas.
    try {
      const session = await backendSession(token);
      player = session && session.id;
    } catch (error) {
      console.error("[ws] FastAPI no responde:", error.message);
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n"); socket.destroy(); return;
    }
  } else {
    player = resolveSession(token);
  }
  if (!player) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return;
  }
  // Una cuenta bloqueada (manual o automática) no puede abrir terminal, aunque
  // conserve una sesión en el navegador.
  if (!CONNECTED && isAccountLocked(registry.players[player])) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); socket.destroy(); return;
  }
  const ready = await ensureLabEnvironment(player);
  if (!ready.ok) {
    console.error("[ws] laboratorio no listo:", ready.error);
    socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n"); socket.destroy(); return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req, player, token));
});

wss.on("connection", (ws, _req, player, token) => {
  ws._playerId = player; // para poder cerrar las sesiones de una cuenta al bloquearla
  const environment = environmentFor(player);
  // El proceso `docker` corre en el HOST: necesita el entorno real del host (PATH, USERPROFILE,
  // DOCKER_HOST, contexto de Docker Desktop…). Las variables del contenedor van con `-e`.
  let shell;
  try {
    shell = pty.spawn(DOCKER_BIN, [
      "exec", "-it", "-u", "kali",
      "-e", "HOME=/home/kali", "-e", "TERM=xterm-256color", "-e", "COLORTERM=truecolor",
      "-e", "PS1=\\[\\e[1;92m\\]kali\\[\\e[1;93m\\]@\\[\\e[1;96m\\]wispr\\[\\e[0m\\]:\\[\\e[1;94m\\]\\w\\[\\e[0m\\]\\$ ",
      environment.kali, "bash", "--rcfile", "/etc/wispr.bashrc", "-i"
    ], {
      name: "xterm-256color",
      cols: 100,
      rows: 30,
      cwd: ROOT,
      env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" }
    });
  } catch (error) {
    ws.send(JSON.stringify({ type: "error", error: `No se pudo abrir la shell de Kali: ${error.message}` }));
    ws.close();
    return;
  }
  const send = message => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message)); };
  send({ type: "ready", message: "Kali aislada conectada. Ejecuta ctf help para ver el flujo del reto." });
  shell.onData(data => send({ type: "output", data }));
  shell.onExit(({ exitCode }) => { send({ type: "exit", exitCode }); ws.close(); });

  // Vigila los `ctf submit` hechos desde la shell y empuja el resultado al navegador.
  let cursor = countSubmissionLines(player);
  let checking = false;
  const watcher = setInterval(async () => {
    if (checking || ws.readyState !== ws.OPEN) return;
    checking = true;
    try {
      const { cursor: next, submissions } = await readTerminalSubmissions(player, cursor, token);
      cursor = next;
      submissions.forEach(result => send({ type: "submission", result }));
    } catch (error) {
      console.error("Error leyendo envíos de terminal:", error.message);
    } finally {
      checking = false;
    }
  }, 1500);
  // Modo conectado: si la sesión deja de valer en FastAPI (logout, cuenta
  // bloqueada o vencida), la terminal abierta se cierra en la siguiente vuelta.
  const sessionCheck = CONNECTED ? setInterval(async () => {
    try {
      if (await backendSession(token)) return;
      send({ type: "error", error: "Tu sesión terminó. Inicia sesión de nuevo para usar la terminal." });
      ws.close(4401, "sesion terminada");
    } catch { /* FastAPI no responde: se vuelve a intentar en la próxima vuelta */ }
  }, SESSION_RECHECK_MS) : null;
  ws.on("message", raw => {
    let message;
    try { message = JSON.parse(String(raw)); } catch { return; }
    if (message.type === "input" && typeof message.data === "string" && message.data.length <= 16384) shell.write(message.data);
    if (message.type === "resize") shell.resize(Math.max(20, Math.min(400, Number(message.cols) || 100)), Math.max(5, Math.min(200, Number(message.rows) || 30)));
  });
  const close = () => { clearInterval(watcher); clearInterval(sessionCheck); try { shell.kill(); } catch {} };
  ws.on("close", close);
  ws.on("error", close);
});

fs.mkdirSync(CHALLENGES_DIR, { recursive: true });
fs.mkdirSync(SESSIONS_DIR, { recursive: true });
loadRegistry();
loadGroups();
loadSessions();
pruneSessions();
setInterval(pruneSessions, 10 * 60 * 1000).unref();
initialChallenges.forEach(registerChallenge);

server.listen(PORT, HOST, () => {
  console.log(`WISPR CTF: http://${HOST}:${PORT}`);
  console.log("Terminal: browser → WebSocket → per-player Docker Kali container on an internal network.");
  console.log(CONNECTED
    ? `Modo conectado: cuentas, retos y flags en el backend FastAPI (${BACKEND_URL}).`
    : `Registro de datos: ${REGISTRY_FILE} (${Object.keys(registry.players).length} jugadores)`);
});
