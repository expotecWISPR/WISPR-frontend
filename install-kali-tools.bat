@echo off
setlocal
echo La imagen instala una lista explicita de
echo herramientas (CTF_TOOLS en kali\Dockerfile): nmap, tshark, tcpdump,
echo aircrack-ng, hashcat, hcxtools, reaver, bully, mdk4, macchanger,
echo pixiewps, john, crunch y utilidades de red.
echo.
echo Para agregar mas herramientas, edita la variable CTF_TOOLS en
echo kali\Dockerfile y reconstruye la imagen:
echo   docker rm -f $(docker ps -aq --filter "name=wispr-")
echo   docker image rm wispr-ctf-kali:local
echo Despues reinicia start-wispr-kali.bat (la reconstruccion tardara
echo varios minutos la primera vez).
pause
