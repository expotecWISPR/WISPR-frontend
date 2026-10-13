"use strict";

// ---------------------------------------------------------------------------
// Arquetipos de reto REALES de redes wireless. Cada uno produce artefactos que:
//   - se abren en Wireshark (tramas 802.11 auténticas), y
//   - se resuelven en la terminal con la herramienta real del ataque.
// La "flag" es el secreto que revela el ataque (la passphrase crackeada, o el
// dato que solo el análisis correcto encuentra). Única por jugador y determinista.
// ---------------------------------------------------------------------------

const crypto = require("crypto");
const W = require("./pcap-wifi");

const SSIDS = ["WISPR-CORP", "WISPR-LAB", "AULA-401", "CEDES-WIFI", "RANGO-5G", "INVITADOS-5G"];
const WORDS = ["futbol", "cafe", "montana", "luna", "tigre", "aguila", "verde", "rojo", "azul",
  "piedra", "fuego", "viento", "nieve", "trueno", "halcon", "lobo", "zorro", "panda", "mango",
  "limon", "cereza", "roble", "cedro", "delfin", "coral", "arena", "selva", "nubes", "rayo", "perla"];
const SYMS = ["!", "#", "$", "%", "*", "@"];

function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
function macBuf(rng) { return Buffer.from(["02", rng.hex(1), rng.hex(1), rng.hex(1), rng.hex(1), rng.hex(1)].join(""), "hex"); }
function macStr(buf) { return [...buf].map(b => b.toString(16).padStart(2, "0")).join(":"); }
function nonce(rng) { return Buffer.from(rng.hex(32), "hex"); }

// Passphrase realista, >=8 chars ASCII, escalada por nivel. Determinista.
function makePass(rng, level) {
  const w1 = rng.pick(WORDS), w2 = rng.pick(WORDS), sym = rng.pick(SYMS);
  const year = 2018 + rng.int(8);
  let p;
  if (level === "Foundation") p = `${w1}${year}`;
  else if (level === "Medium") p = `${cap(w1)}${100 + rng.int(900)}${sym}`;
  else if (level === "Hard") p = `${w1}_${w2}${10 + rng.int(90)}`;
  else p = `${cap(w1)}${cap(w2)}${year}${sym}`;
  while (p.length < 8) p += rng.int(10);
  return p.slice(0, 32);
}

// Diccionario por jugador: contiene la passphrase real + N señuelos, barajado.
function makeWordlist(rng, level, real, size) {
  const set = new Set([real]);
  let guard = 0;
  while (set.size < size && guard < size * 6) {
    guard += 1;
    set.add(makePass(rng, rng.pick(["Foundation", "Medium", "Hard", "Expert"])));
  }
  return rng.shuffle([...set]).join("\n") + "\n";
}

const SIZES = { Foundation: 40, Medium: 120, Hard: 180, Expert: 300 };

// Comprueba un diccionario contra un handshake tal como lo haría aircrack-ng.
function crackHandshake(wordlistText, ssid, apMac, staMac, aNonce, m2eapol) {
  const micTarget = m2eapol.subarray(81, 97);
  const zeroed = Buffer.from(m2eapol); zeroed.fill(0, 81, 97);
  for (const cand of wordlistText.split("\n")) {
    const p = cand.trim(); if (!p) continue;
    const pmk = W.derivePmk(p, ssid);
    const kck = W.derivePtk(pmk, apMac, staMac, aNonce, m2eapol.subarray(17, 49)).subarray(0, 16);
    if (W.eapolMic(kck, zeroed).equals(micTarget)) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Arquetipos. Firma: (rng, level) -> { flag, files[], tools, command, steps,
// hints, learn, solve }. `files[]` puede traer `binary:true` con un Buffer.
// ---------------------------------------------------------------------------
const REAL = {
  // ---- WPA/WPA2: captura de handshake + ataque de diccionario -------------
  wpa_handshake(rng, level) {
    const ssid = rng.pick(SSIDS);
    const pass = makePass(rng, level);
    const apMac = macBuf(rng), staMac = macBuf(rng);
    const aNonce = nonce(rng), sNonce = nonce(rng);
    const channel = rng.pick([1, 6, 11]);
    const token = rng.hex(4);
    const { pcap } = W.buildHandshakePcap({ ssid, passphrase: pass, apMac, staMac, aNonce, sNonce, channel });
    const wordlist = makeWordlist(rng, level, pass, SIZES[level] || 120);
    const capName = `handshake-${token}.pcap`;
    const command = `aircrack-ng -w wordlist.txt ${capName}`;
    return {
      flag: `WISPR{${pass}}`,
      files: [
        { name: capName, content: pcap, binary: true, type: "pcap", desc: `Captura 802.11 con el 4-way handshake de "${ssid}"` },
        { name: "wordlist.txt", content: wordlist, type: "wordlist", desc: "Diccionario de candidatos para el ataque" }
      ],
      tools: ["wireshark", "aircrack-ng"],
      command,
      steps: [
        `Abre ${capName} en Wireshark y filtra 'eapol': verás el handshake de 4 vías de "${ssid}".`,
        `Crackea la clave WPA2 con el diccionario:  ${command}`,
        "La KEY FOUND es la contraseña del Wi-Fi: envíala como WISPR{esa_clave}."
      ],
      hints: [
        "El handshake ya está capturado; no necesitas estar cerca de la red.",
        `aircrack-ng prueba cada palabra del diccionario contra el MIC del handshake.`,
        "La flag es exactamente WISPR{<KEY FOUND>}."
      ],
      learn: `Ataque real a WPA/WPA2-PSK: se captura el 4-way handshake (EAPOL) y se recupera la passphrase por diccionario offline con aircrack-ng. La seguridad depende por completo de la fortaleza de la contraseña.`,
      solve(files) {
        const cap = files.find(f => f.name.endsWith(".pcap")).content;
        const wl = files.find(f => f.name === "wordlist.txt").content;
        // Reparsea el pcap (como aircrack) y crackea.
        const p = parseHandshake(cap);
        const found = crackHandshake(wl, ssid, p.apMac, p.staMac, p.aNonce, p.m2eapol);
        return found ? `WISPR{${found}}` : null;
      }
    };
  },

  // ---- PMKID: ataque clientless (hcxtools + hashcat / aircrack) -----------
  pmkid_crack(rng, level) {
    const ssid = rng.pick(SSIDS);
    const pass = makePass(rng, level);
    const apMac = macBuf(rng), staMac = macBuf(rng);
    const aNonce = nonce(rng);
    const channel = rng.pick([1, 6, 11]);
    const token = rng.hex(4);
    const { pcap } = W.buildPmkidPcap({ ssid, passphrase: pass, apMac, staMac, aNonce, channel });
    const wordlist = makeWordlist(rng, level, pass, SIZES[level] || 180);
    const capName = `pmkid-${token}.pcap`;
    const command = `hcxpcapngtool -o hash.22000 ${capName} && hashcat -m 22000 --force hash.22000 wordlist.txt`;
    return {
      flag: `WISPR{${pass}}`,
      files: [
        { name: capName, content: pcap, binary: true, type: "pcap", desc: `Captura con el PMKID (M1) de "${ssid}"` },
        { name: "wordlist.txt", content: wordlist, type: "wordlist", desc: "Diccionario de candidatos" }
      ],
      tools: ["wireshark", "hcxtools", "hashcat", "aircrack-ng"],
      command,
      steps: [
        `Abre ${capName} en Wireshark: el primer mensaje EAPOL (M1) trae el PMKID en el RSN PMKID KDE.`,
        `Extrae el hash y crackéalo:  ${command}`,
        `(Alternativa con la misma captura:  aircrack-ng -w wordlist.txt ${capName})`,
        "La contraseña recuperada es la flag: WISPR{esa_clave}."
      ],
      hints: [
        "El PMKID se obtiene de un solo mensaje, sin clientes conectados (ataque clientless).",
        "hcxpcapngtool convierte el .pcap al formato 22000 que entiende hashcat.",
        "La flag es WISPR{<contraseña recuperada>}."
      ],
      learn: `Ataque PMKID (clientless) a WPA2-PSK: el AP filtra el PMKID en el primer EAPOL y se crackea offline con hcxtools + hashcat (modo 22000). No requiere capturar un handshake completo ni clientes activos.`,
      solve(files) {
        const cap = files.find(f => f.name.endsWith(".pcap")).content;
        const wl = files.find(f => f.name === "wordlist.txt").content;
        const info = parsePmkid(cap);
        for (const cand of wl.split("\n")) {
          const p = cand.trim(); if (!p) continue;
          const pmk = W.derivePmk(p, ssid);
          if (W.derivePmkid(pmk, info.apMac, info.staMac).equals(info.pmkid)) return `WISPR{${p}}`;
        }
        return null;
      }
    };
  },

  // ---- Deauth flood: análisis forense con tshark --------------------------
  deauth_analysis(rng, level) {
    const token = rng.hex(4);
    const victim = macBuf(rng);           // AP atacado (más deauths)
    const other = macBuf(rng);            // AP con ruido de fondo (menos deauths)
    const ssidV = rng.pick(SSIDS);
    const frames = [];
    frames.push(beacon(victim, ssidV, 6, 0));
    frames.push(beacon(other, "VECINA-2G", 11, 0));
    const victimCount = 12 + rng.int(10);
    const otherCount = 2 + rng.int(3);
    let seq = 1;
    for (let i = 0; i < victimCount; i += 1) frames.push(deauth(victim, macBuf(rng), seq++));
    for (let i = 0; i < otherCount; i += 1) frames.push(deauth(other, macBuf(rng), seq++));
    const pcap = W.pcapFile(rng.shuffle(frames));
    const capName = `deauth-${token}.pcap`;
    const vmac = macStr(victim).replace(/:/g, "");
    const command = `tshark -r ${capName} -Y wlan.fc.type_subtype==0x0c -T fields -e wlan.bssid | sort | uniq -c | sort -rn | head`;
    return {
      flag: `WISPR{deauth_${vmac}}`,
      files: [
        { name: capName, content: pcap, binary: true, type: "pcap", desc: "Captura con una tormenta de tramas deauthentication" }
      ],
      tools: ["wireshark", "tshark"],
      command,
      steps: [
        `Abre ${capName} en Wireshark y filtra 'wlan.fc.type_subtype == 0x0c' (deauth).`,
        `Cuenta los deauth por BSSID para hallar el AP atacado:  ${command}`,
        "El BSSID con MÁS deauth es la víctima. La flag es WISPR{deauth_<bssid sin dos puntos>}."
      ],
      hints: [
        "Un ataque de desautenticación inunda la red con tramas de management subtipo 0x0c.",
        "El AP víctima es el BSSID que aparece en MÁS tramas deauth.",
        "Junta los 6 bytes del BSSID en minúsculas y sin ':' → WISPR{deauth_aabbcc...}."
      ],
      learn: `Detección de ataque de deauth (denegación de servicio en Wi-Fi): se identifica por la ráfaga de tramas management subtipo 0x0c. Con tshark se cuenta por BSSID para atribuir al AP objetivo — el mismo método que usa un SOC.`,
      solve() {
        return `WISPR{deauth_${vmac}}`; // la víctima está fijada por construcción; el jugador la deriva con tshark
      }
    };
  }
};

// ---- helpers de parseo / tramas (deauth/beacon) ---------------------------
function beacon(apMac, ssid, ch, seq) { return W.beaconFrame({ apMac, ssid, channel: ch, seq }); }
function deauth(apMac, clientMac, seq) { return W.deauthFrame({ apMac, clientMac, seq }); }

function parseHandshake(pcap) {
  const frames = framesOf(pcap);
  let apMac, staMac, aNonce, m2eapol;
  for (const f of frames) {
    const d = strip(f);
    if ((d[0] & 0x0c) !== 0x08) continue;
    if (!d.subarray(24, 32).equals(Buffer.from([0xaa, 0xaa, 0x03, 0x00, 0x00, 0x00, 0x88, 0x8e]))) continue;
    const fromDs = (d[1] & 0x02) !== 0;
    const a1 = d.subarray(4, 10), a2 = d.subarray(10, 16);
    const eapol = d.subarray(32);
    const keyInfo = eapol.readUInt16BE(5);
    if (keyInfo === 0x008a) { aNonce = eapol.subarray(17, 49); apMac = fromDs ? a2 : a1; staMac = fromDs ? a1 : a2; }
    if (keyInfo === 0x010a) { m2eapol = eapol; if (!apMac) { apMac = fromDs ? a2 : a1; staMac = fromDs ? a1 : a2; } }
  }
  return { apMac, staMac, aNonce, m2eapol };
}

function parsePmkid(pcap) {
  const frames = framesOf(pcap);
  for (const f of frames) {
    const d = strip(f);
    if ((d[0] & 0x0c) !== 0x08) continue;
    if (!d.subarray(24, 32).equals(Buffer.from([0xaa, 0xaa, 0x03, 0x00, 0x00, 0x00, 0x88, 0x8e]))) continue;
    const fromDs = (d[1] & 0x02) !== 0;
    const a1 = d.subarray(4, 10), a2 = d.subarray(10, 16);
    const eapol = d.subarray(32);
    if (eapol.readUInt16BE(5) !== 0x008a) continue;
    const kdl = eapol.readUInt16BE(97);
    const kd = eapol.subarray(99, 99 + kdl);
    // dd 14 00 0f ac 04 <pmkid16>
    const idx = kd.indexOf(Buffer.from([0x00, 0x0f, 0xac, 0x04]));
    const pmkid = kd.subarray(idx + 4, idx + 20);
    return { apMac: fromDs ? a2 : a1, staMac: fromDs ? a1 : a2, pmkid };
  }
  return null;
}

function framesOf(buf) {
  const out = []; let off = 24;
  while (off + 16 <= buf.length) { const n = buf.readUInt32LE(off + 8); off += 16; out.push(buf.subarray(off, off + n)); off += n; }
  return out;
}
function strip(frame) { return frame.subarray(frame.readUInt16LE(2)); }

module.exports = { REAL, SIZES };
