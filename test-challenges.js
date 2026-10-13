"use strict";
const crypto = require("crypto");
const { REAL } = require("./pcap-challenges");

// Copia del RNG sembrado usado por el motor de instancias (determinista).
function makeRng(seedHex) {
  let counter = 0, pool = Buffer.alloc(0);
  function bytes(n) {
    while (pool.length < n) pool = Buffer.concat([pool, crypto.createHash("sha256").update(`${seedHex}:${counter++}`).digest()]);
    const out = pool.subarray(0, n); pool = pool.subarray(n); return out;
  }
  return {
    int(max) { return max <= 0 ? 0 : bytes(4).readUInt32BE(0) % max; },
    hex(n) { return bytes(n).toString("hex"); },
    pick(list) { return list[this.int(list.length)]; },
    shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  };
}
function rngFor(player, cid) {
  return makeRng(crypto.createHmac("sha256", "test").update(`${player}:${cid}`).digest("hex"));
}

const plan = [
  ["wpa_handshake", "Foundation"],
  ["wpa_handshake", "Medium"],
  ["pmkid_crack", "Hard"],
  ["wpa_handshake", "Expert"],
  ["deauth_analysis", "Medium"],
];

let ok = 0, fail = 0;
function check(name, cond) { if (cond) { ok += 1; console.log("  OK  " + name); } else { fail += 1; console.log("  FAIL " + name); } }

console.log("== Resolubilidad ciega (solve reparsea el artefacto) ==");
const flagsByCase = {};
for (const [name, level] of plan) {
  const built = REAL[name](rngFor("p-a", `c-${name}-${level}`), level);
  const solved = built.solve(built.files);
  check(`${name}/${level} resoluble -> ${solved === built.flag ? built.flag : "esperado " + built.flag + " / obtenido " + solved}`, solved === built.flag);
  check(`${name}/${level} genera .pcap`, built.files.some(f => f.name.endsWith(".pcap") && Buffer.isBuffer(f.content)));
  flagsByCase[`${name}/${level}`] = built.flag;
}

console.log("== Unicidad por jugador ==");
for (const [name, level] of plan) {
  const flags = ["p-a", "p-b", "p-c", "p-d"].map(p => REAL[name](rngFor(p, `c-${name}-${level}`), level).flag);
  check(`${name}/${level} flags únicas entre 4 jugadores`, new Set(flags).size === flags.length);
}

console.log("== Determinismo ==");
for (const [name, level] of plan) {
  const a = REAL[name](rngFor("p-a", `c-${name}-${level}`), level);
  const b = REAL[name](rngFor("p-a", `c-${name}-${level}`), level);
  const samePcap = a.files[0].content.equals(b.files[0].content);
  check(`${name}/${level} misma instancia -> mismos bytes + misma flag`, samePcap && a.flag === b.flag);
}

console.log(`\nResultado: ${ok} OK, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
