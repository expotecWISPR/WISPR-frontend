@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Diagnostico WISPR Kali
echo ==========================================
echo.

echo [1] Node.js
where node
if errorlevel 1 (
  echo RESULTADO: falta Node.js o no esta en PATH.
) else (
  node --version
)
echo.

echo [2] Docker CLI
where docker
if errorlevel 1 (
  echo RESULTADO: falta Docker o no esta en PATH.
) else (
  docker --version
)
echo.

echo [3] Docker Engine
docker version
echo.

echo [4] Puerto 8787
netstat -ano | findstr :8787
echo Si no aparece nada, el backend no esta arrancado todavia.
echo.

echo [5] Contenedores WISPR (uno por jugador)
docker ps -a --filter "name=wispr-"
echo.

echo [6] Imagen Kali local
docker images wispr-ctf-kali:local
echo.

pause
