@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo WISPR CTF - terminal web Kali
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20+ no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker Desktop no esta instalado o no esta en el PATH.
  pause
  exit /b 1
)

docker version >nul 2>nul
if errorlevel 1 (
  echo ERROR: Docker Desktop no esta iniciado.
  pause
  exit /b 1
)

if not exist "node_modules\node-pty" (
  echo Instalando dependencias de la terminal web...
  call npm install
  if errorlevel 1 (
    echo ERROR: no se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Abre http://127.0.0.1:8787
echo La primera conexion construira la imagen Kali y puede tardar varios minutos.
echo No cierres esta ventana mientras uses la plataforma.
echo.
npm start
pause
