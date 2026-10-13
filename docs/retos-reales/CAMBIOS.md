# WISPR — retos reales de wireless + help limpio

## Qué cambió

### 1) El comando `help`
Antes, `help` caía en el builtin de bash y volcaba decenas de comandos inútiles.
Ahora la terminal se abre con un rcfile propio que reemplaza `help` por la guía
curada de WISPR (`ctf help`), que solo muestra comandos y herramientas que
existen y funcionan, más cómo abrir la captura en Wireshark o con `tshark`.

- `kali/wispr.bashrc` (nuevo): define `help() { ctf help; }`, PS1 y atajos.
- `kali/Dockerfile`: copia el rcfile a `/etc/wispr.bashrc`.
- `server.js`: la terminal ahora arranca con `bash --rcfile /etc/wispr.bashrc -i`
  (antes `--noprofile --norc`, por eso ninguna config se cargaba).
- `kali/ctf`: `ctf help` añade la sección "Herramientas del laboratorio".

### 2) Retos reales (lo que no estábamos logrando)
Antes, todos los retos eran un `WISPR{...}` metido en base64/hex dentro de un
`.txt`: la dificultad era solo una etiqueta y no había nada que abrir en
Wireshark ni que se resolviera con herramientas reales.

Ahora cada reto genera **capturas .pcap 802.11 auténticas**, únicas por jugador,
que se abren en Wireshark **y** se resuelven con la herramienta real del ataque:

| Reto | kind | Artefacto | Solución real |
|------|------|-----------|---------------|
| Handshake WPA/WPA2 | `wpa-handshake` | `.pcap` (beacon + 4-way handshake) + `wordlist.txt` | `aircrack-ng -w wordlist.txt captura.pcap` |
| PMKID (clientless) | `pmkid` | `.pcap` (M1 con PMKID) + `wordlist.txt` | `hcxpcapngtool` → `hashcat -m 22000` (o `aircrack-ng`) |
| Deauth / DoS | `deauth` | `.pcap` (ráfaga de deauth) | `tshark` para atribuir el AP víctima |

- La **flag es el secreto que revela el ataque** (la passphrase crackeada, o el
  BSSID atacado). No hay texto codificado.
- La **dificultad escala de verdad**: la complejidad de la passphrase y el tamaño
  del diccionario crecen de Foundation a Expert.
- El MIC del handshake se calcula con la criptografía real de WPA2
  (PBKDF2 → PMK → PTK → HMAC-SHA1), verificada contra los vectores del estándar
  (`password`/`IEEE`) y contra la captura `Induction`/`Coherer` de Wireshark.

Archivos:
- `pcap-wifi.js` (nuevo): criptografía WPA2 y ensamblado de tramas/.pcap.
- `pcap-challenges.js` (nuevo): arquetipos reales (handshake, PMKID, deauth).
- `challenge-engine.js`: catálogo base y retos generados = ataques reales (`kind`).
- `challenge-instances.js`: usa los arquetipos reales, archivos binarios y flag
  derivada del ataque.
- `server.js`: escribe y sirve `.pcap` como binario; descarga por nombre de archivo.

## Cómo verificarlo tú mismo
En las muestras (`muestras/`) la flag está escrita para que compruebes el crack:

```bash
cd muestras/wpa-handshake-foundation
aircrack-ng -w wordlist.txt handshake-*.pcap     # debe encontrar la KEY
```

Las capturas también se abren en Wireshark (filtro `eapol` para el handshake,
`wlan.fc.type_subtype==0x0c` para deauth).

## Pruebas
```bash
node test-pcap.js             # 12/12 — criptografía y estructura del .pcap
node test-challenges.js       # 20/20 — resolubilidad, unicidad, determinismo
node challenge-instances.js --selftest   # 24/24 a través del motor completo
```

## Pendiente (siguiente incremento)
Faltan como ataques reales: Evil Twin / Rogue AP (detección con tshark) y WPS
pixie-dust (`pixiewps` offline). Siguen el mismo patrón; dime cuál priorizo.
