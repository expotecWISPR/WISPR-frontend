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
