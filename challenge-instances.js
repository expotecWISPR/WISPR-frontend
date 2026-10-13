"use strict";

// ---------------------------------------------------------------------------
// Motor de instancias dinámicas de retos, ESCALADO POR DIFICULTAD.
//
// - La forma de resolver DEPENDE del nivel del reto:
//     Foundation -> 1 paso guiado (base64 / hex).
//     Medium     -> filtrar y decodificar, o elegir el correcto, o 2 capas.
//     Hard       -> reensamblar handshake, detectar AP impostor, XOR con clave
//                   derivada de un campo.
//     Expert     -> combinar filtrado + varias capas.
// - Cada reto es único por (jugador, reto): la flag no se puede copiar.
// - La evidencia parece captura real de wireless y cada README explica QUÉ SE
//   APRENDE. Las pistas usan comandos muy comunes de CTF, todos presentes en la
//   imagen Kali: base64, base32, xxd, strings, rev, tr (ROT13), awk, grep, sed,
//   cut, sort, tr, python3. Añade sus paquetes a CTF_TOOLS en kali/Dockerfile.
// - El artefacto descargable y el de la terminal son el MISMO (determinista).
// ---------------------------------------------------------------------------

const crypto = require("crypto");
const { REAL } = require("./pcap-challenges");

// La CLASE de ataque la fija el reto (un reto de handshake siempre es handshake);
// solo el secreto/pcap cambia por jugador. La dificultad escala el ataque real.
const KIND_TO_REAL = {
  "wpa-handshake": "wpa_handshake",
  "pmkid": "pmkid_crack",
  "deauth": "deauth_analysis"
};

function b64(text) { return Buffer.from(String(text), "utf8").toString("base64"); }
function hexOf(text) { return Buffer.from(String(text), "utf8").toString("hex"); }

// ROT13: rotación César de 13 (comando clásico de CTF con `tr`). Es su propia
// inversa, así que el mismo pipeline codifica y decodifica.
function rot13(text) {
  return String(text).replace(/[A-Za-z]/g, ch => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// base32 (RFC 4648) — no está en Buffer, así que lo implementamos. Resuelto en
// la terminal con `base32 -d`.
const B32_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32(text) {
  const bytes = Buffer.from(String(text), "utf8");
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32_ALPHA[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32_ALPHA[(value << (5 - bits)) & 31];
  while (out.length % 8) out += "=";
  return out;
}
function b32decode(str) {
  let bits = 0, value = 0; const out = [];
  for (const ch of String(str).replace(/=+$/, "").toUpperCase()) {
    const idx = B32_ALPHA.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out).toString("utf8");
}

// Ruido binario no imprimible (evita \t \n \r) para envolver un texto y forzar
// el uso de `strings`. Determinista vía rng.
function noise(rng, n) {
  const bytes = [];
  for (let i = 0; i < n; i += 1) {
    let b = 1 + rng.int(31);            // 1..31
    if (b === 9 || b === 10 || b === 13) b = 1;  // no tab/CR/LF
    bytes.push(b);
  }
  return Buffer.from(bytes).toString("latin1");
}

function makeRng(seedHex) {
  let counter = 0;
  let pool = Buffer.alloc(0);
  function bytes(n) {
    while (pool.length < n) {
      pool = Buffer.concat([pool, crypto.createHash("sha256").update(`${seedHex}:${counter++}`).digest()]);
    }
    const out = pool.subarray(0, n);
    pool = pool.subarray(n);
    return out;
  }
  return {
    int(max) { return max <= 0 ? 0 : bytes(4).readUInt32BE(0) % max; },
    hex(nBytes) { return bytes(nBytes).toString("hex"); },
    pick(list) { return list[this.int(list.length)]; },
    shuffle(list) {
      const arr = list.slice();
      for (let i = arr.length - 1; i > 0; i -= 1) { const j = this.int(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    },
    mac() { return `02:${this.hex(1)}:${this.hex(1)}:${this.hex(1)}:${this.hex(1)}:${this.hex(1)}`; }
  };
}

const HEADER = "# WISPR - evidencia sintetica de practica (solo offline; no es una red real).";
const SSIDS = ["WISPR-CORP", "WISPR-LAB", "AULA-401", "CEDES-WIFI", "RANGO-5G"];

function decoy(rng) {
  const w = ["signal", "beacon", "probe", "nonce", "frame", "cipher", "relay"];
  return `WISPR{senuelo_${rng.pick(w)}_${rng.hex(3)}}`;
}
function b64chunks(text, parts) {
  const size = Math.max(1, Math.ceil(text.length / parts));
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// ARQUETIPOS por nivel. Cada uno: (rng, flag) -> {artifact, tools, command,
// steps, hints, learn, solve}. `solve` emula el pipeline (para el autotest).
// Todas las pistas y comandos van ANCLADOS a las líneas de datos (^prefijo)
// para no chocar con los comentarios.
// ---------------------------------------------------------------------------
const A = {
  // ---------------- FOUNDATION ----------------
  beacon_b64(rng, flag) {
    const ssid = rng.pick(SSIDS);
    const artifact = [
      HEADER,
      `# Captura de una baliza (beacon) del AP ssid="${ssid}".`,
      "# El dato oculto 'vendor_data' esta en base64. Decodificalo para leer la flag.",
      "# Pista:  grep '^vendor_data=' <archivo> | cut -d= -f2- | base64 -d",
      `beacon bssid=${rng.mac()} ssid="${ssid}" channel=6`,
      `vendor_data=${b64(flag)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "base64"],
      command: "grep '^vendor_data=' <archivo> | cut -d= -f2- | base64 -d",
      steps: ["Aisla el valor de vendor_data.", "Decodificalo con base64 -d."],
      hints: ["El valor es base64 estandar.", "Comando: base64 -d"],
      learn: "Los AP incluyen campos 'vendor specific' en sus balizas; aqui practicas extraer y decodificar uno en base64.",
      solve(c) { const m = c.match(/^vendor_data=(.*)$/m); return m ? Buffer.from(m[1], "base64").toString("utf8") : null; }
    };
  },
  probe_hex(rng, flag) {
    const ssid = rng.pick(SSIDS);
    const artifact = [
      HEADER,
      `# Respuesta a un probe request para ssid="${ssid}".`,
      "# El campo 'ie_hex' esta en hexadecimal. Conviertelo a texto para leer la flag.",
      "# Pista:  grep '^ie_hex=' <archivo> | cut -d= -f2- | xxd -r -p",
      `probe_response bssid=${rng.mac()} ssid="${ssid}"`,
      `ie_hex=${hexOf(flag)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "xxd"],
      command: "grep '^ie_hex=' <archivo> | cut -d= -f2- | xxd -r -p",
      steps: ["Aisla el valor de ie_hex.", "Conviertelo de hex a texto con xxd -r -p."],
      hints: ["Es hexadecimal, no base64.", "xxd -r -p convierte hex a texto."],
      learn: "Los 'information elements' (IE) suelen leerse en hex; aqui practicas convertir hex a texto.",
      solve(c) { const m = c.match(/^ie_hex=([0-9a-fA-F]+)/m); return m ? Buffer.from(m[1], "hex").toString("utf8") : null; }
    };
  },

  // ---------------- MEDIUM ----------------
  pmkid_by_ssid(rng, flag) {
    const target = rng.pick(SSIDS);
    const others = SSIDS.filter(s => s !== target);
    const rows = [
      `ap bssid=${rng.mac()} ssid="${rng.pick(others)}" pmkid_data=${b64(decoy(rng))}`,
      `ap bssid=${rng.mac()} ssid="${target}" pmkid_data=${b64(flag)}`,
      `ap bssid=${rng.mac()} ssid="${rng.pick(others)}" pmkid_data=${b64(decoy(rng))}`
    ];
    const artifact = [
      HEADER,
      "# Volcado de PMKID de varios AP capturados en la zona.",
      `# OBJETIVO: el AP con ssid="${target}". Filtra SU linea y decodifica pmkid_data (base64).`,
      `# Pista:  grep '^ap ' <archivo> | grep 'ssid=\"${target}\"' | sed 's/.*pmkid_data=//' | base64 -d`,
      ...rng.shuffle(rows)
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sed", "base64"],
      command: `grep '^ap ' <archivo> | grep 'ssid="${target}"' | sed 's/.*pmkid_data=//' | base64 -d`,
      steps: [`Filtra la linea del AP objetivo (ssid="${target}").`, "Decodifica su pmkid_data con base64 -d."],
      hints: ["Hay varios AP; solo te interesa el objetivo.", `Filtra por ssid="${target}".`, "Luego base64 -d."],
      learn: "En un ataque PMKID capturas muchos AP; aqui practicas AISLAR el objetivo correcto antes de procesarlo.",
      solve(c) {
        const line = c.split("\n").find(l => /^ap /.test(l) && l.includes(`ssid="${target}"`));
        const m = line && line.match(/pmkid_data=(\S+)/);
        return m ? Buffer.from(m[1], "base64").toString("utf8") : null;
      }
    };
  },
  wps_marked(rng, flag) {
    const rows = [
      `msg paso=M3 estado=fail token=${b64(decoy(rng))}`,
      `msg paso=M5 estado=fail token=${b64(decoy(rng))}`,
      `msg paso=M7 estado=OK token=${b64(flag)}`
    ];
    const artifact = [
      HEADER,
      "# Intercambio WPS (mensajes M1..M8). Solo el mensaje con estado=OK trae el token valido.",
      "# Pista:  grep '^msg ' <archivo> | grep 'estado=OK' | sed 's/.*token=//' | base64 -d",
      ...rng.shuffle(rows)
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sed", "base64"],
      command: "grep '^msg ' <archivo> | grep 'estado=OK' | sed 's/.*token=//' | base64 -d",
      steps: ["Encuentra el mensaje con estado=OK.", "Decodifica su token con base64 -d."],
      hints: ["Los mensajes con estado=fail son señuelos.", "Solo estado=OK lleva el token real."],
      learn: "En WPS, no todos los mensajes valen: aqui practicas identificar el paso correcto del intercambio.",
      solve(c) {
        const line = c.split("\n").find(l => /^msg /.test(l) && /estado=OK/.test(l));
        const m = line && line.match(/token=(\S+)/);
        return m ? Buffer.from(m[1], "base64").toString("utf8") : null;
      }
    };
  },
  two_layer(rng, flag) {
    const artifact = [
      HEADER,
      "# El campo 'payload' tiene DOS capas: primero hexadecimal, y dentro base64.",
      "# Deshaz las capas en ese orden (hex -> base64).",
      "# Pista:  grep '^payload=' <archivo> | cut -d= -f2- | xxd -r -p | base64 -d",
      `capture_id=${rng.hex(3)}`,
      `payload=${hexOf(b64(flag))}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "xxd", "base64"],
      command: "grep '^payload=' <archivo> | cut -d= -f2- | xxd -r -p | base64 -d",
      steps: ["Aisla payload.", "Conviertelo de hex a bytes (xxd -r -p).", "El resultado es base64: decodificalo."],
      hints: ["Dos capas: hex por fuera, base64 por dentro.", "xxd -r -p primero.", "base64 -d despues."],
      learn: "Los datos suelen venir en varias capas; aqui practicas ENCADENAR herramientas en el orden correcto.",
      solve(c) { const m = c.match(/^payload=([0-9a-fA-F]+)/m); if (!m) return null; return Buffer.from(Buffer.from(m[1], "hex").toString("utf8"), "base64").toString("utf8"); }
    };
  },

  // ---------------- HARD ----------------
  handshake_reassemble(rng, flag) {
    const chunks = b64chunks(b64(flag), 4);
    const rows = chunks.map((d, i) => `eapol msg=${String(i + 1).padStart(2, "0")} chunk=${d}`);
    const dup = rows[rng.int(rows.length)];
    const artifact = [
      HEADER,
      "# Handshake EAPOL capturado FUERA DE ORDEN y con una retransmision repetida.",
      "# Ordena por numero de mensaje (msg), quita el duplicado, une los 'chunk' y decodifica base64.",
      "# Pista:  grep '^eapol ' <archivo> | sort -u | sed 's/.*chunk=//' | tr -d '\\n' | base64 -d",
      ...rng.shuffle([...rows, dup])
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sort", "sed", "tr", "base64"],
      command: "grep '^eapol ' <archivo> | sort -u | sed 's/.*chunk=//' | tr -d '\\n' | base64 -d",
      steps: ["Ordena las lineas eapol (el msg va con dos digitos, asi que 'sort' basta).", "Quita el duplicado con sort -u.", "Une los chunk en orden y decodifica base64."],
      hints: ["El orden lo da msg.", "sort -u ordena y elimina el repetido.", "Une los chunk sin saltos de linea y usa base64 -d."],
      learn: "Un handshake 4-way llega desordenado y con retransmisiones; aqui practicas reordenar y deduplicar antes de reconstruir.",
      solve(c) {
        const seen = new Set(); const rows2 = [];
        c.split("\n").forEach(l => { const m = l.match(/^eapol msg=(\d+) chunk=(\S+)/); if (!m) return; const k = `${m[1]}:${m[2]}`; if (seen.has(k)) return; seen.add(k); rows2.push({ n: Number(m[1]), d: m[2] }); });
        rows2.sort((a, b) => a.n - b.n);
        return Buffer.from(rows2.map(r => r.d).join(""), "base64").toString("utf8");
      }
    };
  },
  rogue_channel(rng, flag) {
    const ssid = rng.pick(SSIDS);
    const legit = [ `beacon bssid=${rng.mac()} ssid="${ssid}" channel=6 data=${b64(decoy(rng))}`,
                    `beacon bssid=${rng.mac()} ssid="${ssid}" channel=6 data=${b64(decoy(rng))}` ];
    const rogueCh = rng.pick([1, 9, 11]);
    const rogue = `beacon bssid=${rng.mac()} ssid="${ssid}" channel=${rogueCh} data=${b64(flag)}`;
    const artifact = [
      HEADER,
      `# Dos radios anuncian ssid="${ssid}". El AP legitimo transmite en channel=6.`,
      "# El IMPOSTOR usa otro canal. Encuentra la baliza que NO esta en channel=6 y decodifica su data.",
      "# Pista:  grep '^beacon ' <archivo> | grep -v 'channel=6' | sed 's/.*data=//' | base64 -d",
      ...rng.shuffle([...legit, rogue])
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sed", "base64"],
      command: "grep '^beacon ' <archivo> | grep -v 'channel=6' | sed 's/.*data=//' | base64 -d",
      steps: ["Quedate con las balizas que NO estan en channel=6.", "Esa es la del impostor: decodifica su data (base64)."],
      hints: ["El legitimo esta en channel=6.", "grep -v 'channel=6' descarta al legitimo.", "Decodifica el data restante."],
      learn: "Un 'evil twin' clona el SSID pero suele delatarse por otro canal o BSSID; aqui practicas detectar la anomalia.",
      solve(c) {
        const line = c.split("\n").find(l => /^beacon /.test(l) && !/channel=6\b/.test(l));
        const m = line && line.match(/data=(\S+)/);
        return m ? Buffer.from(m[1], "base64").toString("utf8") : null;
      }
    };
  },
  xor_derived(rng, flag) {
    const last = rng.hex(1);                 // ultimo octeto del BSSID
    const key = parseInt(last, 16);
    const bssid = `02:${rng.hex(1)}:${rng.hex(1)}:${rng.hex(1)}:${rng.hex(1)}:${last}`;
    const cipher = Buffer.from(String(flag), "utf8").map(x => x ^ key);
    const artifact = [
      HEADER,
      "# 'cipher_hex' esta cifrado con XOR de un byte.",
      "# La CLAVE es el ultimo octeto del bssid, interpretado como numero hexadecimal.",
      "# Pista (python3):  toma la clave del bssid y aplica XOR a cada byte de cipher_hex.",
      `bssid=${bssid}`,
      `cipher_hex=${Buffer.from(cipher).toString("hex")}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "python3"],
      command: "python3 -c \"import re;d=open('<archivo>').read();k=int(re.search(r'bssid=..:..:..:..:..:(..)',d)[1],16);c=bytes.fromhex(re.search(r'cipher_hex=(\\w+)',d)[1]);print(bytes(b^k for b in c).decode())\"",
      steps: ["Lee el ultimo octeto del bssid y pasalo a numero (hex).", "Convierte cipher_hex de hex a bytes.", "Aplica XOR de cada byte con esa clave."],
      hints: ["La clave no esta escrita como numero: sale del bssid.", "El ultimo par del bssid es la clave (en hex).", "XOR byte a byte con esa clave."],
      learn: "A veces la clave esta 'a la vista' pero hay que derivarla de otro campo; aqui practicas eso + XOR de un byte.",
      solve(c) {
        const kk = c.match(/bssid=..:..:..:..:..:(..)/); const cc = c.match(/cipher_hex=([0-9a-fA-F]+)/);
        if (!kk || !cc) return null;
        const key = parseInt(kk[1], 16); const bytes = Buffer.from(cc[1], "hex");
        return Buffer.from(bytes.map(b => b ^ key)).toString("utf8");
      }
    };
  },

  // ---------------- EXPERT ----------------
  filter_two_layer(rng, flag) {
    const target = rng.pick(SSIDS);
    const others = SSIDS.filter(s => s !== target);
    const rows = [
      `ap bssid=${rng.mac()} ssid="${rng.pick(others)}" payload=${hexOf(b64(decoy(rng)))}`,
      `ap bssid=${rng.mac()} ssid="${target}" payload=${hexOf(b64(flag))}`,
      `ap bssid=${rng.mac()} ssid="${rng.pick(others)}" payload=${hexOf(b64(decoy(rng)))}`
    ];
    const artifact = [
      HEADER,
      "# Volcado de varios AP. Combina DOS tecnicas para resolverlo:",
      `#  1) aisla el AP objetivo: ssid="${target}".`,
      "#  2) su 'payload' tiene dos capas (hex, luego base64).",
      `# Pista:  grep '^ap ' <archivo> | grep 'ssid=\"${target}\"' | sed 's/.*payload=//' | xxd -r -p | base64 -d`,
      ...rng.shuffle(rows)
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sed", "xxd", "base64"],
      command: `grep '^ap ' <archivo> | grep 'ssid="${target}"' | sed 's/.*payload=//' | xxd -r -p | base64 -d`,
      steps: [`Filtra el AP objetivo (ssid="${target}").`, "Su payload es hex: conviertelo con xxd -r -p.", "El resultado es base64: decodificalo."],
      hints: [`Primero aisla ssid="${target}".`, "Luego xxd -r -p.", "Y por ultimo base64 -d."],
      learn: "Los retos reales combinan pasos: aqui unes FILTRADO por objetivo + decodificacion en varias capas.",
      solve(c) {
        const line = c.split("\n").find(l => /^ap /.test(l) && l.includes(`ssid="${target}"`));
        const m = line && line.match(/payload=([0-9a-fA-F]+)/);
        if (!m) return null;
        return Buffer.from(Buffer.from(m[1], "hex").toString("utf8"), "base64").toString("utf8");
      }
    };
  },
  fragment_two_layer(rng, flag) {
    const inner = hexOf(b64(flag));          // dos capas: al reensamblar queda hex(base64(flag))
    const chunks = b64chunks(inner, 4);
    const rows = chunks.map((d, i) => `frag n=${String(i + 1).padStart(2, "0")} data=${d}`);
    const artifact = [
      HEADER,
      "# Fragmentos BLE desordenados. Al unirlos EN ORDEN obtienes una cadena hex,",
      "# y esa cadena es base64 por dentro (hex -> base64).",
      "# Pista:  grep '^frag ' <archivo> | sort | sed 's/.*data=//' | tr -d '\\n' | xxd -r -p | base64 -d",
      ...rng.shuffle(rows)
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "sort", "sed", "tr", "xxd", "base64"],
      command: "grep '^frag ' <archivo> | sort | sed 's/.*data=//' | tr -d '\\n' | xxd -r -p | base64 -d",
      steps: ["Ordena los fragmentos por n.", "Une los data en ese orden (queda una cadena hex).", "Conviertela con xxd -r -p y decodifica el base64 resultante."],
      hints: ["Primero reensambla en orden (sort).", "Lo unido es hex: xxd -r -p.", "Y por ultimo base64 -d."],
      learn: "Combinas REENSAMBLADO de fragmentos con decodificacion multicapa: el flujo tipico de un analisis real.",
      solve(c) {
        const rows2 = c.split("\n").map(l => l.match(/^frag n=(\d+) data=(\S+)/)).filter(Boolean).map(m => ({ n: Number(m[1]), d: m[2] }));
        rows2.sort((a, b) => a.n - b.n);
        const hex = rows2.map(r => r.d).join("");
        return Buffer.from(Buffer.from(hex, "hex").toString("utf8"), "base64").toString("utf8");
      }
    };
  },

  // ---------------- FOUNDATION (comandos CTF clásicos) ----------------
  rot13_note(rng, flag) {
    const ssid = rng.pick(SSIDS);
    const artifact = [
      HEADER,
      `# Nota del vendor del AP ssid="${ssid}", codificada con ROT13 (cesar de 13).`,
      "# Vuelve a rotar 13 posiciones para leer la flag. Un clasico de CTF con 'tr'.",
      "# Pista:  grep '^vendor_note=' <archivo> | cut -d= -f2- | tr 'A-Za-z' 'N-ZA-Mn-za-m'",
      `vendor_note=${rot13(flag)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "tr"],
      command: "grep '^vendor_note=' <archivo> | cut -d= -f2- | tr 'A-Za-z' 'N-ZA-Mn-za-m'",
      steps: ["Aisla el valor de vendor_note.", "Rota 13 posiciones con tr para recuperar el texto."],
      hints: ["No es base64: las letras estan desplazadas 13 (ROT13).", "tr 'A-Za-z' 'N-ZA-Mn-za-m' deshace ROT13."],
      learn: "ROT13 es una de las codificaciones mas vistas en CTF; aqui practicas reconocerla y deshacerla con 'tr'.",
      solve(c) { const m = c.match(/^vendor_note=(.*)$/m); return m ? rot13(m[1]) : null; }
    };
  },
  base32_ie(rng, flag) {
    const ssid = rng.pick(SSIDS);
    const artifact = [
      HEADER,
      `# Information Element del AP ssid="${ssid}" en base32 (ojo: NO es base64).`,
      "# Decodificalo con base32 -d para leer la flag.",
      "# Pista:  grep '^ie_b32=' <archivo> | cut -d= -f2- | base32 -d",
      `ie_b32=${b32(flag)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "base32"],
      command: "grep '^ie_b32=' <archivo> | cut -d= -f2- | base32 -d",
      steps: ["Aisla el valor de ie_b32.", "Decodificalo con base32 -d (no base64)."],
      hints: ["Solo usa A-Z y 2-7: eso es base32, no base64.", "base32 -d hace la conversion."],
      learn: "base32 se confunde con base64; aqui practicas distinguirla (alfabeto A-Z2-7) y usar 'base32 -d'.",
      solve(c) { const m = c.match(/^ie_b32=(\S+)/m); return m ? b32decode(m[1]) : null; }
    };
  },

  // ---------------- MEDIUM (strings / rev) ----------------
  strings_grep(rng, flag) {
    // El patron de la pista usa clases [{] [}] (no {}) para no auto-coincidir
    // con su propia linea de comentario al ejecutar el grep sobre el archivo.
    const artifact = [
      HEADER,
      "# Volcado crudo del firmware del controlador wireless.",
      "# La flag esta entre datos binarios: extrae las cadenas imprimibles y filtrala.",
      "# Pista:  strings <archivo> | grep -oE 'WISPR[{][A-Za-z0-9_]+[}]'",
      `blob=${noise(rng, 20)}${flag}${noise(rng, 20)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["strings", "grep"],
      command: "strings <archivo> | grep -oE 'WISPR[{][A-Za-z0-9_]+[}]'",
      steps: ["Extrae las cadenas imprimibles con strings.", "Filtra la que tiene forma WISPR{...} con grep -oE."],
      hints: ["El archivo tiene bytes binarios: 'strings' saca solo lo legible.", "grep -oE 'WISPR[{][A-Za-z0-9_]+[}]' aisla la flag."],
      learn: "'strings | grep' es el reflejo mas basico en forense de CTF: recuperar texto legible de un binario.",
      solve(c) { const m = c.match(/WISPR\{[A-Za-z0-9_]+\}/); return m ? m[0] : null; }
    };
  },
  reversed_field(rng, flag) {
    const artifact = [
      HEADER,
      "# El campo 'ssid_note' quedo escrito al reves en la captura.",
      "# Invierte la cadena para leer la flag.",
      "# Pista:  grep '^ssid_note=' <archivo> | cut -d= -f2- | rev",
      `ssid_note=${String(flag).split("").reverse().join("")}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "rev"],
      command: "grep '^ssid_note=' <archivo> | cut -d= -f2- | rev",
      steps: ["Aisla ssid_note.", "Invierte la cadena con rev."],
      hints: ["Fijate: la cadena empieza por '}' y termina por 'RPSIW'.", "'rev' invierte cada linea."],
      learn: "Invertir cadenas ('rev') es un truco recurrente de CTF cuando el dato viene volteado.",
      solve(c) { const m = c.match(/^ssid_note=(.*)$/m); return m ? m[1].split("").reverse().join("") : null; }
    };
  },

  // ---------------- HARD (awk) ----------------
  awk_column(rng, flag) {
    const rows = [
      `sta ${rng.mac()} ${b64(decoy(rng))} IDLE`,
      `sta ${rng.mac()} ${b64(flag)} ASSOC`,
      `sta ${rng.mac()} ${b64(decoy(rng))} PROBE`
    ];
    const artifact = [
      HEADER,
      "# Tabla de estaciones (sta): columnas -> sta | mac | data(base64) | estado.",
      "# Solo la estacion con estado ASSOC trae la flag. Saca su 3a columna y decodificala.",
      "# Pista:  awk '$4==\"ASSOC\"{print $3}' <archivo> | base64 -d",
      ...rng.shuffle(rows)
    ].join("\n") + "\n";
    return {
      artifact, tools: ["awk", "base64"],
      command: "awk '$4==\"ASSOC\"{print $3}' <archivo> | base64 -d",
      steps: ["Con awk, quedate con la fila cuyo campo 4 sea ASSOC.", "Imprime su campo 3 y decodifica base64."],
      hints: ["Cada linea 'sta' tiene 4 campos separados por espacios.", "awk '$4==\"ASSOC\"{print $3}' saca la columna correcta.", "Luego base64 -d."],
      learn: "awk por campos es basico en CTF para extraer justo la columna util de un volcado tabular.",
      solve(c) {
        const line = c.split("\n").find(l => /^sta /.test(l) && /\bASSOC$/.test(l.trim()));
        if (!line) return null;
        const cols = line.trim().split(/\s+/);
        return Buffer.from(cols[2], "base64").toString("utf8");
      }
    };
  },

  // ---------------- EXPERT (cadenas de comandos comunes) ----------------
  rot13_b64(rng, flag) {
    const artifact = [
      HEADER,
      "# El campo 'payload' tiene DOS capas: base64 por fuera y ROT13 por dentro.",
      "# Decodifica base64 y luego rota 13 (base64 -> ROT13).",
      "# Pista:  grep '^payload=' <archivo> | cut -d= -f2- | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m'",
      `payload=${b64(rot13(flag))}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["grep", "base64", "tr"],
      command: "grep '^payload=' <archivo> | cut -d= -f2- | base64 -d | tr 'A-Za-z' 'N-ZA-Mn-za-m'",
      steps: ["Aisla payload y decodifica base64.", "El texto resultante esta en ROT13: deshazlo con tr."],
      hints: ["Primero base64 -d.", "Lo que sale sigue ilegible: es ROT13.", "tr 'A-Za-z' 'N-ZA-Mn-za-m' lo termina."],
      learn: "Encadenar base64 + ROT13 imita retos reales donde combinas varias codificaciones comunes.",
      solve(c) { const m = c.match(/^payload=(\S+)/m); return m ? rot13(Buffer.from(m[1], "base64").toString("utf8")) : null; }
    };
  },
  strings_then_b64(rng, flag) {
    const marker = `flag_b64:${b64(flag)}`;
    const artifact = [
      HEADER,
      "# Volcado binario. Entre el ruido hay una cadena marcada 'flag_b64:'.",
      "# Extrae las cadenas, quedate con esa y decodifica su base64.",
      "# Pista:  strings <archivo> | grep '^flag_b64:' | cut -d: -f2- | base64 -d",
      `blob=${noise(rng, 16)}${marker}${noise(rng, 16)}`
    ].join("\n") + "\n";
    return {
      artifact, tools: ["strings", "grep", "base64"],
      command: "strings <archivo> | grep '^flag_b64:' | cut -d: -f2- | base64 -d",
      steps: ["Saca las cadenas legibles con strings.", "Filtra la que empieza por 'flag_b64:'.", "Decodifica su base64."],
      hints: ["strings recupera 'flag_b64:...' de entre el binario.", "grep '^flag_b64:' la aisla.", "cut -d: -f2- deja el base64; luego base64 -d."],
      learn: "Combina el reflejo forense (strings/grep) con una decodificacion: un flujo muy tipico de CTF.",
      solve(c) { const m = c.match(/flag_b64:([A-Za-z0-9+/=]+)/); return m ? Buffer.from(m[1], "base64").toString("utf8") : null; }
    };
  }
};

// Pools por dificultad (con variedad dentro de cada nivel).
const POOLS = {
  Foundation: ["beacon_b64", "probe_hex", "rot13_note", "base32_ie"],
  Medium: ["pmkid_by_ssid", "wps_marked", "two_layer", "strings_grep", "reversed_field"],
  Hard: ["handshake_reassemble", "rogue_channel", "xor_derived", "awk_column"],
  Expert: ["filter_two_layer", "fragment_two_layer", "rot13_b64", "strings_then_b64"]
};
const ALL = Object.keys(A);

function instanceFlag(baseFlag, rng) {
  const inner = String(baseFlag || "WISPR{wireless}").replace(/^WISPR\{/, "").replace(/\}$/, "");
  const stem = inner.replace(/_[0-9a-f]{6,}(_lab)?$/i, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 140) || "wireless";
  return `WISPR{${stem}_${rng.hex(3)}}`;
}

function pickArchetype(difficulty, rng) {
  const pool = POOLS[difficulty] || POOLS.Medium || ALL;
  return rng.pick(pool);
}

// --- Ajuste de ancho del README -------------------------------------------
// El README se lee con `cat` en la terminal, que NO reajusta el texto: una
// línea más ancha que la terminal la envuelve xterm justo pasado el borde y
// queda cortada contra la barra de scroll. Por eso ajustamos cada línea a un
// ancho conservador. La prosa se parte por palabras (con sangría colgante); los
// comandos dentro de ```bash se cortan con '\' de continuación, que bash
// entiende, para que se puedan copiar y ejecutar igual.
const README_WIDTH = 72;

function wrapProseLine(line, width) {
  const m = line.match(/^(\s*(?:[-*]\s+|\d+\.\s+)?)/);
  const lead = m ? m[1] : "";
  const hang = " ".repeat(lead.length);
  const words = line.slice(lead.length).split(/\s+/).filter(Boolean);
  const out = [];
  let cur = lead;
  for (const w of words) {
    const atStart = cur === lead || cur === hang;
    const candidate = atStart ? cur + w : cur + " " + w;
    if (candidate.length > width && cur.trim() !== "") { out.push(cur); cur = hang + w; }
    else cur = candidate;
  }
  if (cur.trim() !== "") out.push(cur);
  return out.length ? out : [line];
}

function wrapCodeLine(line, width) {
  if (line.length <= width) return [line];
  // No partimos comandos con comillas: cortar dentro de una cadena entre
  // comillas rompería el comando. Se deja tal cual (xterm lo reajusta).
  if (/["']/.test(line)) return [line];
  const parts = line.split(" ");
  const out = [];
  let cur = "";
  for (const p of parts) {
    const candidate = cur ? cur + " " + p : p;
    if (candidate.length > width - 2 && cur) { out.push(cur + " \\"); cur = "  " + p; }
    else cur = candidate;
  }
  if (cur) out.push(cur);
  return out;
}

function wrapReadme(md, width = README_WIDTH) {
  const out = [];
  let inCode = false;
  for (const raw of md.split("\n")) {
    if (/^\s*```/.test(raw)) { inCode = !inCode; out.push(raw); continue; }
    if (raw.length <= width) { out.push(raw); continue; }
    if (inCode) out.push(...wrapCodeLine(raw, width));
    else out.push(...wrapProseLine(raw, width));
  }
  return out.join("\n");
}

function materializeInstance({ player, challengeId, baseFlag, fileName, category, difficulty, kind, seedSecret }) {
  const seed = crypto.createHmac("sha256", String(seedSecret || "wispr-local")).update(`${player}:${challengeId}`).digest("hex");
  const rng = makeRng(seed);
  const level = POOLS[difficulty] ? difficulty : "Medium";

  const realName = KIND_TO_REAL[kind];
  let built, flag, archetype, files, solveFn;

  if (realName && REAL[realName]) {
    // --- Reto REAL: captura .pcap + solución con herramienta real ---
    built = REAL[realName](rng, level);
    flag = built.flag;
    archetype = realName;
    files = built.files.map(f => ({ name: f.name, content: f.content, binary: Boolean(f.binary), type: f.type || "file", desc: f.desc || "" }));
    solveFn = () => built.solve(built.files);
  } else {
    // --- Respaldo: arquetipos de decodificación (texto) ---
    flag = instanceFlag(baseFlag, rng);
    archetype = pickArchetype(level, rng);
    built = A[archetype](rng, flag);
    const artifactName = fileName && /\.[a-z0-9]+$/i.test(fileName) ? fileName : "evidence.txt";
    files = [{ name: artifactName, content: built.artifact, binary: false, type: "trace", desc: "Evidencia sintética única de tu instancia" }];
    solveFn = () => built.solve(built.artifact);
  }

  const fileLines = files.map(f => `- \`${f.name}\`${f.desc ? ` — ${f.desc}` : ""}`).join("\n");
  const readme = [
    `## Reto activo — nivel ${level} (instancia personal)`,
    "",
    "Esta instancia es única para tu cuenta: la flag no coincide con la de otros jugadores.",
    "Los archivos que descargas desde la plataforma son exactamente los que ves aquí.",
    "",
    "### Qué aprendes",
    built.learn,
    "",
    "### Archivos",
    fileLines,
    "",
    "### Herramientas",
    built.tools.map(t => `- ${t}`).join("\n"),
    "",
    "### Pasos",
    built.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    "",
    "### Comando de referencia",
    "```bash",
    built.command,
    "```",
    "",
    "Cuando obtengas la flag, envíala con:",
    "```bash",
    "ctf submit WISPR{tu_flag}",
    "```"
  ].join("\n");
  const readmeWrapped = wrapReadme(readme);

  return {
    flag, archetype, level,
    tools: built.tools, hints: built.hints, command: built.command, steps: built.steps, learn: built.learn,
    files, readme: readmeWrapped,
    _solve: solveFn
  };
}

module.exports = { materializeInstance, archetypes: A, POOLS };

// --- autotest: node challenge-instances.js --selftest -----------------------
if (require.main === module && process.argv.includes("--selftest")) {
  const players = ["p-a", "p-b", "p-c", "p-d"];
  const cases = [
    // Retos REALES (captura .pcap + herramienta real)
    { id: "c-hs-found", flag: "WISPR{x}", file: "cap.pcap", difficulty: "Foundation", kind: "wpa-handshake" },
    { id: "c-hs-med", flag: "WISPR{x}", file: "cap.pcap", difficulty: "Medium", kind: "wpa-handshake" },
    { id: "c-pmkid", flag: "WISPR{x}", file: "cap.pcap", difficulty: "Hard", kind: "pmkid" },
    { id: "c-hs-exp", flag: "WISPR{x}", file: "cap.pcap", difficulty: "Expert", kind: "wpa-handshake" },
    { id: "c-deauth", flag: "WISPR{x}", file: "cap.pcap", difficulty: "Medium", kind: "deauth" },
    // Respaldo (decodificación en texto)
    { id: "c-fallback", flag: "WISPR{legacy_decode}", file: "cap.txt", difficulty: "Hard" }
  ];
  let total = 0, passed = 0; const seen = {}; const hits = {};
  for (const p of players) for (const c of cases) {
    const inst = materializeInstance({ player: p, challengeId: c.id, baseFlag: c.flag, fileName: c.file, difficulty: c.difficulty, kind: c.kind, seedSecret: "test-secret" });
    total += 1;
    if (inst._solve() === inst.flag) passed += 1; else console.log(`FAIL ${p} ${c.id} [${inst.archetype}] esperado=${inst.flag} recuperado=${inst._solve()}`);
    hits[inst.archetype] = (hits[inst.archetype] || 0) + 1;
    seen[`${p}|${c.id}`] = inst.flag;
    const again = materializeInstance({ player: p, challengeId: c.id, baseFlag: c.flag, fileName: c.file, difficulty: c.difficulty, kind: c.kind, seedSecret: "test-secret" });
    if (again.flag !== inst.flag) console.log(`FAIL determinismo ${p} ${c.id}`);
  }
  let uniqueOk = true;
  for (const c of cases) { const f = players.map(p => seen[`${p}|${c.id}`]); if (new Set(f).size !== f.length) { uniqueOk = false; console.log(`FAIL unicidad ${c.id}`); } }
  console.log(`\nSolucionables: ${passed}/${total}`);
  console.log(`Flags unicas por jugador: ${uniqueOk ? "OK" : "FALLO"}`);
  console.log(`Arquetipos: ${JSON.stringify(hits)}`);
  process.exit(passed === total && uniqueOk ? 0 : 1);
}
