## Reto activo — nivel Foundation (instancia personal)

Esta instancia es única para tu cuenta: la flag no coincide con la de otros jugadores.
Los archivos que descargas desde la plataforma son exactamente los que ves aquí.

### Qué aprendes
Ataque real a WPA/WPA2-PSK: se captura el 4-way handshake (EAPOL) y se recupera la passphrase por diccionario offline con aircrack-ng. La seguridad depende por completo de la fortaleza de la contraseña.

### Archivos
- `handshake-5a4fc7eb.pcap` — Captura 802.11 con el 4-way handshake de "INVITADOS-5G"
- `wordlist.txt` — Diccionario de candidatos para el ataque

### Herramientas
- wireshark
- aircrack-ng

### Pasos
1. Abre handshake-5a4fc7eb.pcap en Wireshark y filtra 'eapol': verás el handshake de 4 vías de "INVITADOS-5G".
2. Crackea la clave WPA2 con el diccionario:  aircrack-ng -w wordlist.txt handshake-5a4fc7eb.pcap
3. La KEY FOUND es la contraseña del Wi-Fi: envíala como WISPR{esa_clave}.

### Comando de referencia
```bash
aircrack-ng -w wordlist.txt handshake-5a4fc7eb.pcap
```

Cuando obtengas la flag, envíala con:
```bash
ctf submit WISPR{tu_flag}
```