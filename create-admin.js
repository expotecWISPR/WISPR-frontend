#!/usr/bin/env node
"use strict";

// ---------------------------------------------------------------------------
// create-admin.js — crea (o actualiza) una cuenta de administrador directamente
// en lab/data/players.json, sin pasar por el registro con código de correo.
//
// Uso:
//   node create-admin.js                       # usa los valores por defecto
//   node create-admin.js --handle @root --password "MiClaveFuerte"
//   node create-admin.js --name "Admin" --email admin@wispr.local
//
// Variables de entorno equivalentes (los flags tienen prioridad):
//   ADMIN_HANDLE, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_EMAIL
//
// El hashing (scrypt, salt de 16 bytes, 64 bytes de salida en hex) es idéntico
// al de server.js, así que la contraseña funciona en el login normal.
// La cuenta queda con role="admin" y el correo marcado como verificado.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "lab", "data");
const REGISTRY_FILE = path.join(DATA_DIR, "players.json");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function normalizeHandle(value) {
  return "@" + String(value || "").trim().toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(String(password), salt, 64).toString("hex") };
}

function loadRegistry() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    if (parsed && typeof parsed.players === "object" && parsed.players) return { players: parsed.players };
  } catch { /* archivo ausente o corrupto: empezamos en limpio */ }
  return { players: {} };
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const handle = normalizeHandle(args.handle || process.env.ADMIN_HANDLE || "@admin");
  const password = String(args.password || process.env.ADMIN_PASSWORD || "admin1234");
  const name = String(args.name || process.env.ADMIN_NAME || "Administrador");
  const email = String(args.email || process.env.ADMIN_EMAIL || "admin@wispr.local").trim().toLowerCase();
  const gender = String(args.gender || process.env.ADMIN_GENDER || "otro");

  if (password.length < 4) {
    console.error("La contraseña debe tener al menos 4 caracteres.");
    process.exit(1);
  }

  const registry = loadRegistry();
  const { salt, hash } = hashPassword(password);

  // Si ya existe un jugador con ese usuario, lo reutilizamos (conserva el id y
  // el progreso) y solo lo elevamos a admin + reseteamos la contraseña.
  const existing = Object.values(registry.players).find(p => p.handle === handle);
  const nowIso = new Date().toISOString();

  const player = existing || {
    id: crypto.randomUUID(),
    createdAt: nowIso,
    solved: {},
    attempts: {},
    submissions: []
  };

  player.name = name;
  player.handle = handle;
  player.gender = gender;
  player.email = email;
  player.role = "admin";
  player.salt = salt;
  player.passwordHash = hash;
  player.emailVerifiedAt = nowIso;
  player.solved = player.solved || {};
  player.attempts = player.attempts || {};
  player.submissions = player.submissions || [];

  registry.players[player.id] = player;
  saveRegistry(registry);

  console.log("Cuenta de administrador lista.");
  console.log(`  usuario:    ${handle}`);
  console.log(`  contraseña: ${password}`);
  console.log(`  correo:     ${email}`);
  console.log(`  rol:        admin`);
  console.log(`  archivo:    ${REGISTRY_FILE}`);
  console.log("");
  console.log("Inicia sesión con ese usuario y contraseña: entra directo, sin código de correo.");
}

main();
