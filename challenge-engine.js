"use strict";

const crypto = require("crypto");

const difficultyPoints = { Foundation: 120, Medium: 200, Hard: 340, Expert: 500 };

// Catálogo base: vulnerabilidades REALES de redes wireless. La CLASE de ataque
// (`kind`) decide el artefacto y la solución; el secreto/pcap es único por
// jugador (ver challenge-instances.js + pcap-challenges.js). Las descripciones
// NO contienen la solución (las pistas se piden y cuestan puntos).
const initialChallenges = [
  // ----- FOUNDATION ---------------------------------------------------------
  {
    id: "deauth-recon-foundation",
    title: "Primeros Deauth",
    category: "Deauth / DoS",
    kind: "deauth",
    difficulty: "Foundation",
    points: 120,
    description: "Una captura corta registra tramas de desautenticación contra una red Wi-Fi.",
    objective: "Abre la captura con tshark/Wireshark, filtra las tramas de management y averigua qué AP está siendo atacado.",
    flag: "WISPR{deauth_target}",
    tools: ["wireshark", "tshark"],
    hints: ["Las tramas deauth son management (subtipo 0x0c).", "La víctima es el BSSID que recibe MÁS deauth."],
    files: [{ name: "deauth.pcap", type: "pcap", desc: "Captura con tramas deauthentication" }]
  },
  {
    id: "wpa-handshake-foundation",
    title: "Handshake al Descubierto",
    category: "WPA/WPA2",
    kind: "wpa-handshake",
    difficulty: "Foundation",
    points: 120,
    description: "Capturaste el 4-way handshake de una red WPA2 con contraseña débil.",
    objective: "Abre la captura en Wireshark, confirma el handshake y recupera la contraseña del Wi-Fi.",
    flag: "WISPR{wpa_handshake}",
    tools: ["wireshark", "aircrack-ng"],
    hints: ["El handshake ya está en el .pcap; no hace falta estar cerca de la red.", "aircrack-ng prueba el diccionario contra el MIC del handshake."],
    files: [{ name: "handshake.pcap", type: "pcap", desc: "Captura 802.11 con el 4-way handshake" }]
  },
  // ----- MEDIUM -------------------------------------------------------------
  {
    id: "wpa-handshake-medium",
    title: "Clave con Sal y Pimienta",
    category: "WPA/WPA2",
    kind: "wpa-handshake",
    difficulty: "Medium",
    points: 200,
    description: "El mismo ataque, pero la contraseña mezcla mayúsculas, dígitos y un símbolo.",
    objective: "Recupera la passphrase WPA2 a partir del handshake capturado.",
    flag: "WISPR{wpa_handshake_medium}",
    tools: ["wireshark", "aircrack-ng"],
    hints: ["El método es idéntico; cambia la complejidad de la clave.", "La flag es exactamente WISPR{<KEY FOUND>}."],
    files: [{ name: "handshake.pcap", type: "pcap", desc: "Captura 802.11 con el 4-way handshake" }]
  },
  {
    id: "pmkid-capture-medium",
    title: "PMKID en un Mensaje",
    category: "PMKID",
    kind: "pmkid",
    difficulty: "Medium",
    points: 200,
    description: "Un AP filtra su PMKID en el primer EAPOL, sin necesidad de clientes conectados.",
    objective: "Extrae el PMKID de la captura, conviértelo al formato de hashcat y recupera la contraseña WPA2.",
    flag: "WISPR{pmkid_capture}",
    tools: ["wireshark", "hcxtools", "hashcat", "aircrack-ng"],
    hints: ["El PMKID va en el mensaje M1 (RSN PMKID KDE).", "hcxpcapngtool convierte el .pcap al formato 22000 de hashcat."],
    files: [{ name: "pmkid.pcap", type: "pcap", desc: "Captura con el PMKID (M1)" }]
  },
  {
    id: "deauth-storm-medium",
    title: "Tormenta de Deauth",
    category: "Deauth / DoS",
    kind: "deauth",
    difficulty: "Medium",
    points: 200,
    description: "Una captura registra una ráfaga de desautenticaciones contra la red.",
    objective: "Analiza las tramas de management y atribuye el ataque: ¿qué AP es la víctima?",
    flag: "WISPR{deauth_target}",
    tools: ["wireshark", "tshark"],
    hints: ["Las tramas deauth son management subtipo 0x0c.", "La víctima es el BSSID que recibe MÁS deauth."],
    files: [{ name: "deauth.pcap", type: "pcap", desc: "Captura con la tormenta de deauth" }]
  },
  // ----- HARD ---------------------------------------------------------------
  {
    id: "wpa-handshake-hard",
    title: "Passphrase de Dos Palabras",
    category: "WPA/WPA2",
    kind: "wpa-handshake",
    difficulty: "Hard",
    points: 340,
    description: "La red une dos palabras con un número; el handshake está capturado.",
    objective: "Recupera la passphrase WPA2 desde el handshake con un diccionario más grande.",
    flag: "WISPR{wpa_handshake_hard}",
    tools: ["wireshark", "aircrack-ng"],
    hints: ["El método es el mismo; cambia el tamaño del diccionario.", "La flag es WISPR{<KEY FOUND>}."],
    files: [{ name: "handshake.pcap", type: "pcap", desc: "Captura 802.11 con el 4-way handshake" }]
  },
  {
    id: "pmkid-clientless-hard",
    title: "PMKID sin Clientes",
    category: "PMKID",
    kind: "pmkid",
    difficulty: "Hard",
    points: 340,
    description: "Obtuviste el PMKID de un AP vulnerable en un solo mensaje, sin clientes conectados.",
    objective: "Extrae el PMKID de la captura y recupera la contraseña WPA2 offline.",
    flag: "WISPR{pmkid_clientless}",
    tools: ["wireshark", "hcxtools", "hashcat", "aircrack-ng"],
    hints: ["El PMKID viaja en el primer EAPOL (M1), en el RSN PMKID KDE.", "hcxpcapngtool convierte el .pcap al formato 22000 de hashcat."],
    files: [{ name: "pmkid.pcap", type: "pcap", desc: "Captura con el PMKID (M1)" }]
  },
  // ----- EXPERT -------------------------------------------------------------
  {
    id: "wpa-handshake-expert",
    title: "Passphrase Robusta",
    category: "WPA/WPA2",
    kind: "wpa-handshake",
    difficulty: "Expert",
    points: 500,
    description: "La red usa una contraseña larga de dos palabras, año y símbolo.",
    objective: "Recupera una passphrase WPA2 robusta desde el handshake con un diccionario grande.",
    flag: "WISPR{wpa_handshake_expert}",
    tools: ["wireshark", "aircrack-ng"],
    hints: ["Cuanto más larga la clave, más depende de un buen diccionario.", "La flag es WISPR{<KEY FOUND>}."],
    files: [{ name: "handshake.pcap", type: "pcap", desc: "Captura 802.11 con el 4-way handshake" }]
  }
];

// Plantillas para retos de continuación (generados): todas son ataques reales.
// [category, family, kind, tools]
const templates = [
  ["WPA/WPA2", "Handshake Capture", "wpa-handshake", ["wireshark", "aircrack-ng"]],
  ["PMKID", "Clientless PMKID", "pmkid", ["wireshark", "hcxtools", "hashcat"]],
  ["Deauth / DoS", "Deauth Storm", "deauth", ["wireshark", "tshark"]]
];

function safeText(value, max = 500) {
  return String(value || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

function publicChallenge(challenge) {
  return {
    id: challenge.id,
    title: challenge.title,
    category: challenge.category,
    kind: challenge.kind || null,
    difficulty: challenge.difficulty,
    points: challenge.points,
    description: challenge.description,
    objective: challenge.objective,
    tools: [...challenge.tools],
    hints: [...challenge.hints],
    files: challenge.files.map(file => ({ name: file.name, type: file.type, desc: file.desc })),
    generated: Boolean(challenge.generated),
    generator: challenge.generator || "curriculum"
  };
}

const KNOWN_KINDS = ["wpa-handshake", "pmkid", "deauth"];

function validateGeneratedChallenge(raw, sequence) {
  if (!raw || typeof raw !== "object") throw new Error("El generador devolvió un reto vacío.");
  const title = safeText(raw.title, 90);
  const category = safeText(raw.category, 40);
  const difficulty = ["Foundation", "Medium", "Hard", "Expert"].includes(raw.difficulty) ? raw.difficulty : "Hard";
  const kind = KNOWN_KINDS.includes(raw.kind) ? raw.kind : null;
  const flag = safeText(raw.flag, 200);
  if (!title || !category || !/^WISPR\{[^{}\r\n]{3,180}\}$/.test(flag)) {
    throw new Error("El generador devolvió un reto fuera del esquema permitido.");
  }
  const token = crypto.randomBytes(4).toString("hex");
  const stem = safeText(raw.artifactStem || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), 40).replace(/^-+|-+$/g, "") || "wireless";
  // Para ataques reales, el artefacto es un .pcap materializado por jugador.
  const pcapFile = { name: `${stem}-${token}.pcap`, type: "pcap", desc: "Captura 802.11 única de tu instancia" };
  return {
    id: `ai-${sequence}-${token}`,
    title,
    category,
    kind,
    difficulty,
    points: Number.isFinite(raw.points) ? Math.max(100, Math.min(700, Math.round(raw.points))) : difficultyPoints[difficulty],
    description: safeText(raw.description, 500) || "Reto inalámbrico generado para el laboratorio aislado.",
    objective: safeText(raw.objective, 500) || "Analiza la captura y recupera el secreto con la herramienta real desde Kali.",
    flag,
    tools: Array.isArray(raw.tools) ? raw.tools.map(tool => safeText(tool, 32)).filter(Boolean).slice(0, 8) : ["wireshark", "aircrack-ng"],
    hints: Array.isArray(raw.hints) ? raw.hints.map(hint => safeText(hint, 260)).filter(Boolean).slice(0, 3) : ["Empieza abriendo la captura en Wireshark.", "La flag sale de ejecutar el ataque real, no de decodificar texto."],
    files: [pcapFile],
    generated: true,
    generator: raw.generator || "ai"
  };
}

class TemplateChallengeGenerator {
  async generate({ sequence }) {
    const [category, family, kind, tools] = templates[sequence % templates.length];
    const difficulty = sequence % 4 === 0 ? "Expert" : sequence % 3 === 0 ? "Hard" : sequence % 2 === 0 ? "Medium" : "Foundation";
    const title = `${family} ${["Vector", "Drift", "Pulse", "Orbit", "Relay"][sequence % 5]}`;
    const stem = kind;
    // La flag base se sustituye por jugador; aquí solo cumple el esquema.
    const flag = `WISPR{${kind.replace(/-/g, "_")}_${crypto.randomBytes(3).toString("hex")}}`;
    return validateGeneratedChallenge({
      title, category, kind, difficulty,
      points: difficultyPoints[difficulty],
      description: `Reto de continuación: ${category} en el laboratorio aislado.`,
      objective: "Abre la captura, ejecuta el ataque real con la herramienta indicada y recupera el secreto.",
      flag,
      tools,
      hints: ["Abre la captura en Wireshark para orientarte.", "Usa la herramienta real del ataque (no decodifiques texto).", "La flag es el secreto que revela el ataque."],
      artifactStem: stem,
      generator: "template"
    }, sequence);
  }
}

class ExternalAiChallengeGenerator {
  constructor(endpoint, token) {
    this.endpoint = endpoint;
    this.token = token;
  }

  async generate({ sequence, solvedChallenge }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({
          purpose: "Generate one safe, offline wireless-security CTF challenge spec.",
          constraints: [
            "Return JSON with title, category, kind, difficulty, description, objective, flag, tools, hints.",
            "kind must be one of: wpa-handshake, pmkid, deauth.",
            "The real .pcap artifact is generated by the platform; do not include artifact bytes.",
            "The flag must use WISPR{...}."
          ],
          sequence,
          previousCategory: solvedChallenge.category
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Proveedor IA respondió ${response.status}.`);
      return validateGeneratedChallenge(await response.json(), sequence);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createChallengeGenerator() {
  if (process.env.AI_CHALLENGE_ENDPOINT) {
    return new ExternalAiChallengeGenerator(process.env.AI_CHALLENGE_ENDPOINT, process.env.AI_CHALLENGE_TOKEN || "");
  }
  return new TemplateChallengeGenerator();
}

module.exports = { initialChallenges, publicChallenge, createChallengeGenerator };
