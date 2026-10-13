"use strict";
// Verificación independiente: parseamos el .pcap generado y recomputamos el MIC
// como lo haría aircrack-ng. Si coincide con la passphrase correcta (y NO con una
// incorrecta), el handshake es crackeable de verdad.
const crypto = require("crypto");
const W = require("./pcap-wifi");

function parsePcap(buf) {
  if (buf.readUInt32LE(0) !== 0xa1b2c3d4) throw new Error("magic pcap inválido");
  const linktype = buf.readUInt32LE(20);
  const frames = [];
  let off = 24;
  while (off + 16 <= buf.length) {
    const inclen = buf.readUInt32LE(off + 8);
    off += 16;
    frames.push(buf.subarray(off, off + inclen));
    off += inclen;
  }
  return { linktype, frames };
}

// Quita radiotap (len en bytes 2-3 LE) y devuelve la trama 802.11.
function strip80211(frame) {
  const rtlen = frame.readUInt16LE(2);
  return frame.subarray(rtlen);
}

function isEapol(dot11) {
  // data frame (0x08..) + LLC/SNAP 88:8e tras cabecera de 24 bytes
  if ((dot11[0] & 0x0c) !== 0x08) return false;
  const snap = dot11.subarray(24, 32);
  return snap.equals(Buffer.from([0xaa, 0xaa, 0x03, 0x00, 0x00, 0x00, 0x88, 0x8e]));
}

function parseEapolKey(dot11) {
  const fromDs = (dot11[1] & 0x02) !== 0;
  const addr1 = dot11.subarray(4, 10), addr2 = dot11.subarray(10, 16);
  const eapol = dot11.subarray(32); // tras LLC/SNAP
  const keyInfo = eapol.readUInt16BE(5);
  const nonce = eapol.subarray(17, 49);
  const mic = eapol.subarray(81, 97);
  const apMac = fromDs ? addr2 : addr1;
  const staMac = fromDs ? addr1 : addr2;
  return { fromDs, keyInfo, nonce, mic, apMac, staMac, eapol };
}

// Recomputa el MIC de M2 con una passphrase candidata (lo que hace el cracker).
function crackVerify(ssid, candidate, apMac, staMac, aNonce, m2) {
  const pmk = W.derivePmk(candidate, ssid);
  const ptk = W.derivePtk(pmk, apMac, staMac, aNonce, m2.nonce);
  const kck = ptk.subarray(0, 16);
  const zeroed = Buffer.from(m2.eapol);
  zeroed.fill(0, 81, 97); // MIC a cero
  const mic = W.eapolMic(kck, zeroed);
  return mic.equals(m2.mic);
}

let ok = 0, fail = 0;
function check(name, cond) { if (cond) { ok += 1; console.log("  OK  " + name); } else { fail += 1; console.log("  FAIL " + name); } }

console.log("== Handshake WPA2 ==");
const apMac = Buffer.from("02aabbcc1001", "hex");
const staMac = Buffer.from("02dd112233ff", "hex");
const aNonce = crypto.createHash("sha256").update("a").digest();
const sNonce = crypto.createHash("sha256").update("s").digest();
const SSID = "WISPR-LAB", PASS = "verano2024!";
const { pcap } = W.buildHandshakePcap({ ssid: SSID, passphrase: PASS, apMac, staMac, aNonce, sNonce, channel: 6 });

const parsed = parsePcap(pcap);
check("linktype RADIOTAP (127)", parsed.linktype === 127);
check("beacon + 4 EAPOL = 5 tramas", parsed.frames.length === 5);

const keys = parsed.frames.map(strip80211).filter(isEapol).map(parseEapolKey);
check("se detectan 4 mensajes EAPOL", keys.length === 4);
const m1 = keys.find(k => k.keyInfo === 0x008a);
const m2 = keys.find(k => k.keyInfo === 0x010a);
check("M1 con ANonce presente", !!m1);
check("M2 con MIC presente", !!m2 && !m2.mic.equals(Buffer.alloc(16)));

check("passphrase CORRECTA verifica el MIC (aircrack la aceptaría)", crackVerify(SSID, PASS, m1.apMac, m1.staMac, m1.nonce, m2));
check("passphrase INCORRECTA NO verifica", !crackVerify(SSID, "clavemala1", m1.apMac, m1.staMac, m1.nonce, m2));
check("ANonce de M1 == SNonce? (no, deben diferir)", !m1.nonce.equals(m2.nonce));

console.log("== Determinismo / unicidad ==");
const a = W.buildHandshakePcap({ ssid: SSID, passphrase: PASS, apMac, staMac, aNonce, sNonce, channel: 6 }).pcap;
const b = W.buildHandshakePcap({ ssid: SSID, passphrase: PASS, apMac, staMac, aNonce, sNonce, channel: 6 }).pcap;
check("mismo input -> mismo .pcap (determinista)", a.equals(b));
const c = W.buildHandshakePcap({ ssid: SSID, passphrase: "otra_clave9", apMac, staMac, aNonce, sNonce, channel: 6 }).pcap;
check("otra passphrase -> .pcap distinto", !a.equals(c));

console.log("== PMKID ==");
const r = W.buildPmkidPcap({ ssid: SSID, passphrase: PASS, apMac, staMac, aNonce, channel: 6 });
const pp = parsePcap(r.pcap);
const m1p = pp.frames.map(strip80211).filter(isEapol).map(parseEapolKey)[0];
// recomputa PMKID con passphrase correcta
const pmkGood = W.derivePmk(PASS, SSID);
const pmkidGood = W.derivePmkid(pmkGood, m1p.apMac, m1p.staMac);
const pmkBad = W.derivePmk("incorrecta7", SSID);
const pmkidBad = W.derivePmkid(pmkBad, m1p.apMac, m1p.staMac);
check("PMKID correcto == el embebido", pmkidGood.equals(r.pmkid));
check("PMKID incorrecto != el embebido", !pmkidBad.equals(r.pmkid));

console.log(`\nResultado: ${ok} OK, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
