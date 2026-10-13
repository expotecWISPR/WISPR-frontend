## Reto activo — nivel Hard (instancia personal)

Esta instancia es única para tu cuenta: la flag no coincide con la de otros jugadores.
Los archivos que descargas desde la plataforma son exactamente los que ves aquí.

### Qué aprendes
Ataque PMKID (clientless) a WPA2-PSK: el AP filtra el PMKID en el primer EAPOL y se crackea offline con hcxtools + hashcat (modo 22000). No requiere capturar un handshake completo ni clientes activos.

### Archivos
- `pmkid-7a833cee.pcap` — Captura con el PMKID (M1) de "CEDES-WIFI"
- `wordlist.txt` — Diccionario de candidatos

### Herramientas
- wireshark
- hcxtools
- hashcat
- aircrack-ng

### Pasos
1. Abre pmkid-7a833cee.pcap en Wireshark: el primer mensaje EAPOL (M1) trae el PMKID en el RSN PMKID KDE.
2. Extrae el hash y crackéalo:  hcxpcapngtool -o hash.22000 pmkid-7a833cee.pcap && hashcat -m 22000 --force hash.22000 wordlist.txt
3. (Alternativa con la misma captura:  aircrack-ng -w wordlist.txt pmkid-7a833cee.pcap)
4. La contraseña recuperada es la flag: WISPR{esa_clave}.

### Comando de referencia
```bash
hcxpcapngtool -o hash.22000 pmkid-7a833cee.pcap && hashcat -m 22000 --force hash.22000 wordlist.txt
```

Cuando obtengas la flag, envíala con:
```bash
ctf submit WISPR{tu_flag}
```