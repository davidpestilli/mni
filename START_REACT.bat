@echo off
echo ===============================================
echo   MNI Web App - React + Vite + Tailwind
echo ===============================================
echo.

REM Verificar se node_modules existe
if not exist "frontend-react\node_modules" (
    echo [1/3] Instalando dependencias do frontend React...
    cd frontend-react
    call npm install
    cd ..
    echo.
) else (
    echo [1/3] Dependencias do frontend React ja instaladas
    echo.
)

if not exist "backend\node_modules" (
    echo [2/3] Instalando dependencias do backend...
    cd backend
    call npm install
    cd ..
    echo.
) else (
    echo [2/3] Dependencias do backend ja instaladas
    echo.
)

echo [3/3] Escolha o modo de execucao:
echo.
echo   1. Desenvolvimento (Frontend Dev + Backend)
echo   2. Build + Producao (Build React + Backend serve)
echo   3. Apenas Frontend Dev
echo   4. Apenas Backend
echo.
choice /C 1234 /N /M "Opcao: "

if errorlevel 4 goto backend_only
if errorlevel 3 goto frontend_only
if errorlevel 2 goto build_prod
if errorlevel 1 goto dev_mode

:dev_mode
echo.
echo Iniciando modo DESENVOLVIMENTO...
echo.
echo Terminal 1: Backend (http://localhost:3000)
echo Terminal 2: Frontend Dev (http://localhost:5173)
echo.
echo Abrindo terminals...
start cmd /k "cd backend && npm run dev"
timeout /t 2 /nobreak >nul
start cmd /k "cd frontend-react && npm run dev"
goto end

:build_prod
echo.
echo Iniciando modo PRODUCAO...
echo.
echo [1/2] Building frontend React...
cd frontend-react
call npm run build
cd ..
echo.
echo [2/2] Iniciando backend (serve build React)...
start cmd /k "cd backend && npm start"
echo.
echo Acesse: http://localhost:3000
goto end

:frontend_only
echo.
echo Iniciando apenas FRONTEND DEV...
start cmd /k "cd frontend-react && npm run dev"
echo.
echo Acesse: http://localhost:5173
goto end

:backend_only
echo.
echo Iniciando apenas BACKEND...
start cmd /k "cd backend && npm run dev"
echo.
echo Acesse: http://localhost:3000
goto end

:end
echo.
echo Pronto!
pause
