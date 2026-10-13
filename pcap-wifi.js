"use strict";

// ---------------------------------------------------------------------------
// Generador de CAPTURAS .pcap REALES de Wi-Fi para WISPR.
//
// A diferencia del "sobre base64 en un .txt", esto produce tramas 802.11
// auténticas que:
//   - se abren en Wireshark y muestran beacon + 4-way handshake EAPOL (o PMKID),
//   - se crackean DE VERDAD con aircrack-ng / hcxtools + hashcat usando la
//     misma matemática (PBKDF2 -> PMK -> PTK -> MIC HMAC-SHA1) que usa el ataque
//     real. La passphrase (PSK) es la "flag".
//
// Sin dependencias externas: solo `crypto` de Node. Determinista a partir de un
// RNG sembrado -> cada jugador recibe una captura y un PSK únicos.
// ---------------------------------------------------------------------------

const crypto = require("crypto");

// ---- Criptografía WPA2 (IEEE 802.11i) -------------------------------------

// PMK = PBKDF2-HMAC-SHA1(passphrase, ssid, 4096, 32). Es, literalmente, la
// definición del PSK de WPA/WPA2. Node lo implementa de forma estándar.
function derivePmk(passphrase, ssid) {
  return crypto.pbkdf2Sync(Buffer.from(passphrase, "utf8"), Buffer.from(ssid, "utf8"), 4096, 32, "sha1");
}

function bmin(a, b) { return Buffer.compare(a, b) <= 0 ? a : b; }
function bmax(a, b) { return Buffer.compare(a, b) <= 0 ? b : a; }

// PRF-512 -> PTK. KCK = PTK[0..16) es la clave con la que se calcula el MIC.
function derivePtk(pmk, apMac, staMac, aNonce, sNonce) {
  const A = Buffer.from("Pairwise key expansion", "ascii");
  const B = Buffer.concat([bmin(apMac, staMac), bmax(apMac, staMac), bmin(aNonce, sNonce), bmax(aNonce, sNonce)]);
  let ptk = Buffer.alloc(0);
  for (let i = 0; i < 4; i += 1) {
    const h = crypto.createHmac("sha1", pmk);
    h.update(Buffer.concat([A, Buffer.from([0x00]), B, Buffer.from([i])]));
    ptk = Buffer.concat([ptk, h.digest()]);
  }
  return ptk.subarray(0, 64);
}

// MIC WPA2 (key descriptor version 2): HMAC-SHA1(KCK, trama-EAPOL-con-MIC-a-0)
// truncado a 16 bytes. Idéntico a lo que recomputa aircrack-ng por cada
// candidato del diccionario.
function eapolMic(kck, eapolFrameMicZeroed) {
  return crypto.createHmac("sha1", kck).update(eapolFrameMicZeroed).digest().subarray(0, 16);
}

// PMKID = HMAC-SHA1(PMK, "PMK Name" || AA || SPA)[0..16). Base del ataque PMKID
// (clientless). Se crackea con hashcat -m 22000.
function derivePmkid(pmk, apMac, staMac) {
  return crypto.createHmac("sha1", pmk).update(Buffer.concat([Buffer.from("PMK Name", "ascii"), apMac, staMac])).digest().subarray(0, 16);
}

// ---- Ensamblado de tramas 802.11 ------------------------------------------

const RADIOTAP = Buffer.from([0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]); // header vacío de 8 bytes
const LLC_SNAP_EAPOL = Buffer.from([0xaa, 0xaa, 0x03, 0x00, 0x00, 0x00, 0x88, 0x8e]);

function u16be(n) { const b = Buffer.alloc(2); b.writeUInt16BE(n >>> 0, 0); return b; }
function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff, 0); return b; }

// EAPOL-Key (RSN). keyInfo decide qué mensaje es (M1..M4). mic se rellena fuera.
function eapolKey({ keyInfo, replay, nonce, keyData = Buffer.alloc(0), mic = Buffer.alloc(16) }) {
  const replayBuf = Buffer.alloc(8); replayBuf.writeBigUInt64BE(BigInt(replay), 0);
  const descriptor = Buffer.concat([
    Buffer.from([0x02]),                 // descriptor type: RSN
    u16be(keyInfo),                      // key information
    u16be(16),                           // key length (CCMP)
    replayBuf,                           // replay counter
    nonce,                               // key nonce (32)
    Buffer.alloc(16),                    // key IV
    Buffer.alloc(8),                     // key RSC
    Buffer.alloc(8),                     // key ID (reservado)
    mic,                                 // key MIC (16)
    u16be(keyData.length),               // key data length
    keyData                              // key data
  ]);
  // Header EAPOL: version 2 (802.1X-2004), type 3 (EAPOL-Key), length = descriptor.
  const header = Buffer.concat([Buffer.from([0x02, 0x03]), u16be(descriptor.length)]);
  return Buffer.concat([header, descriptor]);
}

// Trama de datos 802.11 que transporta un EAPOL (QoS-less Data).
// fromDs=true  -> AP->STA (M1, M3);  fromDs=false -> STA->AP (M2, M4).
function dataFrame({ fromDs, apMac, staMac, seq, payload }) {
  const fc = fromDs ? Buffer.from([0x08, 0x02]) : Buffer.from([0x08, 0x01]);
  const addr1 = fromDs ? staMac : apMac; // receptor
  const addr2 = fromDs ? apMac : staMac; // transmisor
  const addr3 = apMac;                   // BSSID
  const seqCtl = u16le((seq & 0xfff) << 4);
  return Buffer.concat([RADIOTAP, fc, Buffer.from([0x00, 0x00]), addr1, addr2, addr3, seqCtl, LLC_SNAP_EAPOL, payload]);
}

// RSN IE mínimo (CCMP + PSK) para que el beacon/M2 se vean realistas en Wireshark.
const RSN_IE = Buffer.from([
  0x30, 0x14, 0x01, 0x00,
  0x00, 0x0f, 0xac, 0x04,             // group cipher CCMP
  0x01, 0x00, 0x00, 0x0f, 0xac, 0x04, // pairwise CCMP
  0x01, 0x00, 0x00, 0x0f, 0xac, 0x02, // AKM PSK
  0x00, 0x00
]);

// Trama de desautenticación (management subtype 0x0c). addr3 = BSSID atacado.
function deauthFrame({ apMac, clientMac, seq, reason = 0x0007 }) {
  const fc = Buffer.from([0xc0, 0x00]);
  const seqCtl = u16le((seq & 0xfff) << 4);
  return Buffer.concat([RADIOTAP, fc, Buffer.from([0x00, 0x00]), clientMac, apMac, apMac, seqCtl, u16le(reason)]);
}

function beaconFrame({ apMac, ssid, channel, seq }) {
  const fc = Buffer.from([0x80, 0x00]);
  const seqCtl = u16le((seq & 0xfff) << 4);
  const fixed = Buffer.concat([Buffer.alloc(8), u16le(0x0064), u16le(0x0431)]); // timestamp, interval, caps(ESS+Privacy)
  const ssidBuf = Buffer.from(ssid, "utf8");
  const ssidTag = Buffer.concat([Buffer.from([0x00, ssidBuf.length]), ssidBuf]);
  const ratesTag = Buffer.from([0x01, 0x08, 0x82, 0x84, 0x8b, 0x96, 0x24, 0x30, 0x48, 0x6c]);
  const dsTag = Buffer.from([0x03, 0x01, channel & 0xff]);
  const body = Buffer.concat([fixed, ssidTag, ratesTag, dsTag, RSN_IE]);
  return Buffer.concat([RADIOTAP, fc, Buffer.from([0x00, 0x00]),
    Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), apMac, apMac, seqCtl, body]);
}

// ---- Ensamblado del archivo .pcap (classic, little-endian, DLT_RADIOTAP) ---

function pcapFile(frames) {
  const global = Buffer.alloc(24);
  global.writeUInt32LE(0xa1b2c3d4, 0); // magic (micros)
  global.writeUInt16LE(2, 4); global.writeUInt16LE(4, 6);
  global.writeInt32LE(0, 8); global.writeUInt32LE(0, 12);
  global.writeUInt32LE(65535, 16);
  global.writeUInt32LE(127, 20); // LINKTYPE_IEEE802_11_RADIOTAP
  const records = [];
  let ts = 1700000000;
  frames.forEach((frame, i) => {
    const rec = Buffer.alloc(16);
    rec.writeUInt32LE(ts, 0); rec.writeUInt32LE(i * 1000, 4);
    rec.writeUInt32LE(frame.length, 8); rec.writeUInt32LE(frame.length, 12);
    records.push(rec, frame);
  });
  return Buffer.concat([global, ...records]);
}

// ---- Generadores de reto ---------------------------------------------------

// Un 4-way handshake WPA2 completo y crackeable. Devuelve el .pcap (Buffer).
function buildHandshakePcap({ ssid, passphrase, apMac, staMac, aNonce, sNonce, channel }) {
  const pmk = derivePmk(passphrase, ssid);
  const ptk = derivePtk(pmk, apMac, staMac, aNonce, sNonce);
  const kck = ptk.subarray(0, 16);

  const m1 = dataFrame({ fromDs: true, apMac, staMac, seq: 1,
    payload: eapolKey({ keyInfo: 0x008a, replay: 1, nonce: aNonce }) });

  // M2 lleva MIC: se calcula con MIC=0 y luego se reemplaza en la misma trama.
  const m2eapolZero = eapolKey({ keyInfo: 0x010a, replay: 1, nonce: sNonce, keyData: RSN_IE });
  const m2mic = eapolMic(kck, m2eapolZero);
  const m2eapol = eapolKey({ keyInfo: 0x010a, replay: 1, nonce: sNonce, keyData: RSN_IE, mic: m2mic });
  const m2 = dataFrame({ fromDs: false, apMac, staMac, seq: 2, payload: m2eapol });

  const m3eapolZero = eapolKey({ keyInfo: 0x13ca, replay: 2, nonce: aNonce, keyData: RSN_IE });
  const m3mic = eapolMic(kck, m3eapolZero);
  const m3eapol = eapolKey({ keyInfo: 0x13ca, replay: 2, nonce: aNonce, keyData: RSN_IE, mic: m3mic });
  const m3 = dataFrame({ fromDs: true, apMac, staMac, seq: 3, payload: m3eapol });

  const m4eapolZero = eapolKey({ keyInfo: 0x030a, replay: 2, nonce: Buffer.alloc(32) });
  const m4mic = eapolMic(kck, m4eapolZero);
  const m4eapol = eapolKey({ keyInfo: 0x030a, replay: 2, nonce: Buffer.alloc(32), mic: m4mic });
  const m4 = dataFrame({ fromDs: false, apMac, staMac, seq: 4, payload: m4eapol });

  const beacon = beaconFrame({ apMac, ssid, channel, seq: 0 });
  return { pcap: pcapFile([beacon, m1, m2, m3, m4]), pmk, kck };
}

// Un M1 con PMKID (ataque clientless). Crackeable con hashcat -m 22000.
function buildPmkidPcap({ ssid, passphrase, apMac, staMac, aNonce, channel }) {
  const pmk = derivePmk(passphrase, ssid);
  const pmkid = derivePmkid(pmk, apMac, staMac);
  // Key data con el KDE del PMKID: dd + len + 00:0f:ac + type 04 + PMKID(16).
  const pmkidKde = Buffer.concat([Buffer.from([0xdd, 0x14, 0x00, 0x0f, 0xac, 0x04]), pmkid]);
  const m1 = dataFrame({ fromDs: true, apMac, staMac, seq: 1,
    payload: eapolKey({ keyInfo: 0x008a, replay: 1, nonce: aNonce, keyData: pmkidKde }) });
  const beacon = beaconFrame({ apMac, ssid, channel, seq: 0 });
  return { pcap: pcapFile([beacon, m1]), pmk, pmkid };
}

module.exports = {
  derivePmk, derivePtk, eapolMic, derivePmkid,
  buildHandshakePcap, buildPmkidPcap, pcapFile,
  beaconFrame, deauthFrame,
};
