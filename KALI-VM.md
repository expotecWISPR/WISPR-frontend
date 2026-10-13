# WISPR — terminal Kali aislada

La terminal de WISPR es una shell Linux real en el navegador, no un emulador de comandos:

`xterm.js → WebSocket local → node-pty → docker exec → contenedor Kali por jugador`

Cada navegador recibe un identificador de sesión aleatorio y el servidor prepara un contenedor y red interna dedicados. El servicio HTTP se limita a `127.0.0.1`.

## Uso dentro del reto

Al elegir **Resolver en Kali**, el backend prepara el artefacto y lo deja disponible en el contenedor:

```bash
ctf show
ctf files
cd "$(ctf open)"
ls -la
cat README.md
ctf submit WISPR{tu_flag}
```

`ctf submit` no comprueba la respuesta dentro del contenedor. Escribe un pequeño registro de envío en `/workspace`; el servidor local valida el valor contra el catálogo privado y actualiza el score. Por eso modificar archivos en la shell no concede puntos ni revela flags del backend.

## Aislamiento aplicado

| Control | Aplicación |
| --- | --- |
| Proceso | Un contenedor Kali por jugador, ejecutado como usuario `kali` (UID 1000). |
| Privilegios | `--cap-drop ALL` y `no-new-privileges:true`. |
| Sistema de archivos | Raíz de solo lectura; `/tmp` y el home son `tmpfs`. |
| Datos del reto | `/lab/challenges` se monta en solo lectura. |
| Escritura | Solo `/workspace`, un directorio de sesión limitado que el backend trata como entrada no confiable. |
| Red | Red Docker `--internal` por jugador; solo alcanza a su contenedor `target` sintético. |
| Recursos | Límites de pids, CPU y memoria para Kali y para el objetivo. |

El objetivo `target` solo expone banners de práctica para ejercicios de reconocimiento. No contiene flags ni representa un servicio real.

## Límites deliberados

No se pasa una tarjeta Wi‑Fi, modo monitor, capacidades de red cruda ni la red del host al contenedor. Herramientas como `tshark`, `hashcat`, `aircrack-ng`, `hcxtools`, `reaver` o `pixiewps` se usan exclusivamente sobre archivos entregados por el reto. No pueden capturar ni inyectar tráfico inalámbrico real desde WISPR.

La imagen incluye las herramientas habituales de análisis de artefactos wireless. Si una lección necesita una herramienta adicional, añádela en `CTF_TOOLS` de `kali/Dockerfile`, reconstruye la imagen y conserva el mismo modelo de aislamiento.

## Operación

- **Conectar:** arranca o reutiliza el contenedor aislado del jugador.
- **Desconectar:** cierra la shell PTY, no destruye el entorno.
- **Detener entorno:** detiene Kali y elimina el objetivo sintético de esa sesión.

Para eliminar contenedores o redes de forma manual, hazlo desde Docker Desktop cuando no haya una competición activa. No es necesario exponer Docker ni el puerto de WISPR fuera de tu equipo.
