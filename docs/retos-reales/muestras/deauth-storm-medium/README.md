## Reto activo — nivel Medium (instancia personal)

Esta instancia es única para tu cuenta: la flag no coincide con la de otros jugadores.
Los archivos que descargas desde la plataforma son exactamente los que ves aquí.

### Qué aprendes
Detección de ataque de deauth (denegación de servicio en Wi-Fi): se identifica por la ráfaga de tramas management subtipo 0x0c. Con tshark se cuenta por BSSID para atribuir al AP objetivo — el mismo método que usa un SOC.

### Archivos
- `deauth-a31ed269.pcap` — Captura con una tormenta de tramas deauthentication

### Herramientas
- wireshark
- tshark

### Pasos
1. Abre deauth-a31ed269.pcap en Wireshark y filtra 'wlan.fc.type_subtype == 0x0c' (deauth).
2. Cuenta los deauth por BSSID para hallar el AP atacado:  tshark -r deauth-a31ed269.pcap -Y wlan.fc.type_subtype==0x0c -T fields -e wlan.bssid | sort | uniq -c | sort -rn | head
3. El BSSID con MÁS deauth es la víctima. La flag es WISPR{deauth_<bssid sin dos puntos>}.

### Comando de referencia
```bash
tshark -r deauth-a31ed269.pcap -Y wlan.fc.type_subtype==0x0c -T fields -e wlan.bssid | sort | uniq -c | sort -rn | head
```

Cuando obtengas la flag, envíala con:
```bash
ctf submit WISPR{tu_flag}
```