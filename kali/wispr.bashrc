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

# Atajos cómodos y sin sorpresas.
alias ll='ls -lah'
alias cls='clear'

# Mensaje breve al abrir la terminal.
if [ -z "$WISPR_WELCOMED" ]; then
  export WISPR_WELCOMED=1
  printf '\e[1;36mWISPR\e[0m · escribe \e[1;32mhelp\e[0m para la guía del reto.\n'
fi
