@echo off
echo ====================================
echo RESTART COMPLETO DO SERVIDOR MNI
echo ====================================
echo.

echo [1/4] Matando processos Node.js na porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Matando processo %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2/4] Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

echo.
echo [3/4] Verificando se a porta foi liberada...
netstat -ano | findstr :3000 | findstr LISTENING
if errorlevel 1 (
    echo ✅ Porta 3000 liberada!
) else (
    echo ⚠️ AVISO: Porta 3000 ainda está em uso
    echo Por favor, mate manualmente o processo usando o Gerenciador de Tarefas
    pause
    exit /b 1
)

echo.
echo [4/4] Iniciando servidor...
echo.
echo ====================================
echo SERVIDOR INICIANDO...
echo ====================================
echo.
node server.js
