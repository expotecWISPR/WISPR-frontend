# WISPR · configuración de la shell interactiva del laboratorio.
# Se carga con  bash --rcfile /etc/wispr.bashrc -i.

# Prompt a color estilo bash, TODO coloreado (incluido el @):
#   kali = verde brillante · @ = amarillo · wispr = cian · ruta = azul.
# Mostramos "kali@wispr" fijo (no el id del contenedor tipo e9d53ee3e0a2).
export PS1="\[\e[1;92m\]kali\[\e[1;93m\]@\[\e[1;96m\]wispr\[\e[0m\]:\[\e[1;94m\]\w\[\e[0m\]\$ "

# `help` por defecto vuelca TODOS los builtins de bash (ruido inútil para el
# jugador). Lo reemplazamos por la guía curada de WISPR, que solo muestra
# comandos y herramientas que existen y funcionan en este laboratorio.
help() { command ctf help; }

# Los retos nombran a Wireshark, pero es una aplicación gráfica y aquí no hay
# pantalla: en vez de "command not found", se explica qué usar.
wireshark() {
  printf 'Wireshark es gráfico y no corre en esta terminal. Aquí usa \e[1;32mtshark\e[0m (la misma\n'
  printf 'herramienta en texto), por ejemplo: tshark -r challenge/<archivo>.pcap\n'
  printf 'O descarga el archivo desde la web y ábrelo en Wireshark en tu computadora.\n'
  return 1
}

# hashcat compila sus kernels con PoCL (OpenCL en la CPU) y eso pide más
# memoria de la que tiene un laboratorio (768 MB en la EC2): el kernel de Linux
# lo mata con código 137 (probado el 13 nov). En vez de un "Killed" sin
# explicación, se dice qué pasó y qué usar. --help, --show o --identify sí
# funcionan.
hashcat() {
  command hashcat "$@"
  local rc=$?
  if [ "$rc" -eq 137 ]; then
    printf '\n\e[1;33mhashcat se quedó sin memoria:\e[0m compilar sus kernels en la CPU necesita más RAM\n'
    printf 'de la que tiene este laboratorio. Usa aircrack-ng, que rompe el handshake y el PMKID:\n'
    printf '  aircrack-ng -w challenge/wordlist.txt challenge/<archivo>.pcap\n'
  fi
  return "$rc"
}

# Colores en ls/grep/ip: este archivo REEMPLAZA al .bashrc de Kali (--rcfile),
# que es donde normalmente se activan. Sin esto, carpetas, archivos y
# coincidencias salen todos en blanco.
if [ -x /usr/bin/dircolors ]; then eval "$(dircolors -b)"; fi
alias ls='ls --color=auto'
alias grep='grep --color=auto'
alias diff='diff --color=auto'
alias ip='ip --color=auto'

# Atajos cómodos y sin sorpresas.
alias ll='ls -lah'
alias cls='clear'

# Mensaje breve al abrir la terminal.
if [ -z "$WISPR_WELCOMED" ]; then
  export WISPR_WELCOMED=1
  printf '\e[1;36mWISPR\e[0m · escribe \e[1;32mhelp\e[0m para la guía del reto.\n'
fi
