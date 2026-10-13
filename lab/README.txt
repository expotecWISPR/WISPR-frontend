WISPR Kali Lab

Esta carpeta se monta dentro del contenedor Kali como /lab.
Coloca aqui capturas .pcap/.pcapng, hashes .hc22000, wordlists y scripts de apoyo.

Comandos utiles desde la terminal web:

whoami
pwd
ls -la
cat /etc/os-release
tshark -v
hashcat --version
aircrack-ng --help

Para enviar una flag al CTF, usa el comando especial de la plataforma:

submit WISPR{flag}
