# WISPR · configuración de la shell interactiva del laboratorio.
# Se carga con  bash --rcfile /etc/wispr.bashrc -i.

# Prompt a color estilo bash, TODO coloreado (incluido el @):
#   kali = verde brillante · @ = amarillo · wispr = cian · ruta = azul.
# Mostramos "kali@wispr" fijo (no el id del contenedor tipo e9d53ee3e0a2).
export PS1="\[\e[1;92m\]kali\[\e[1;93m\]@\[\e[1;96m\]wispr\[\e[0m\]:\[\e[1;94m\]\w\[\e[0m\]\$ "

# El prompt siempre en una línea nueva y legible. Un `cat` de un archivo
# binario (un .pcap, un .png) tiene dos efectos:
#   1. su salida no termina en salto de línea y el prompt quedaba pegado al
#      final de la basura;
#   2. algunos bytes cambian el juego de caracteres de la terminal (SO, ESC ( 0)
#      y el texto siguiente sale como símbolos raros.
# Antes de cada prompt se restablece el juego de caracteres y los colores, y se
# imprime una línea de espacios del ancho de la terminal seguida de \r: si el
# cursor estaba al inicio de la línea, los espacios caben y \r vuelve al mismo
# lugar; si no, desbordan a la línea siguiente y el prompt empieza ahí (es el
# mismo truco que usa zsh).
shopt -s checkwinsize
__wispr_prompt_reset() { printf '\e(B\x0f\e[0m%*s\r' "${COLUMNS:-80}" ''; }
PROMPT_COMMAND="__wispr_prompt_reset${PROMPT_COMMAND:+; $PROMPT_COMMAND}"

# `help` por defecto vuelca TODOS los builtins de bash (ruido inútil para el
# jugador). Lo reemplazamos por la guía curada de WISPR, que solo muestra
# comandos y herramientas que existen y funcionan en este laboratorio.
help() { command ctf help; }

# Los retos nombran a Wireshark, pero es una aplicación gráfica y aquí no hay
# pantalla: en vez de "command not found", se explica qué usar.
wireshark() {
  printf 'Wireshark es gráfico y no corre en esta terminal. Usa\n'
  printf '\e[1;32mtshark\e[0m, la misma herramienta en texto:\n'
  printf '  tshark -r challenge/<archivo>.pcap\n'
  printf 'O descarga el archivo desde la web y ábrelo en tu computadora.\n'
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
    printf '\n\e[1;33mhashcat se quedó sin memoria.\e[0m Compilar en la CPU pide\n'
    printf 'más RAM de la que tiene este laboratorio. Usa aircrack-ng,\n'
    printf 'que rompe el handshake y el PMKID:\n'
    printf '  aircrack-ng -w challenge/wordlist.txt challenge/<archivo>\n'
  fi
  return "$rc"
}

# Captura en vivo: la terminal no tiene permisos de red cruda, a propósito
# (nadie puede espiar ni falsificar tráfico desde aquí). Sin esto, tshark
# soltaba un mensaje enorme de dumpcap que pedía sudo (aquí no existe) y se
# salía de la terminal. Leer un archivo con -r funciona normal.
__wispr_lee_archivo() {
  local arg
  for arg in "$@"; do
    case "$arg" in
      -r|-r?*|--read-file|--read-file=*|-h|--help|-v|--version|-D|--list-interfaces|-G|-G?*) return 0 ;;
    esac
  done
  return 1
}
__wispr_sin_captura() {
  printf '\e[1;33mLa captura en vivo no está disponible:\e[0m por seguridad,\n'
  printf 'esta terminal no tiene permisos de red. Analiza el archivo\n'
  printf 'del reto:\n'
  printf '  %s -r challenge/<archivo>.pcap\n' "$1"
  return 1
}
tshark() { if __wispr_lee_archivo "$@"; then command tshark "$@"; else __wispr_sin_captura tshark; fi; }
tcpdump() { if __wispr_lee_archivo "$@"; then command tcpdump "$@"; else __wispr_sin_captura tcpdump; fi; }

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
