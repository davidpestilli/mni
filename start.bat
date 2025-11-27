@echo off
REM ========================================
REM Script para iniciar MNI Web App
REM - Build React
REM - Iniciar servidor backend
REM ========================================

echo.
echo ===== MNI Web App - Startup Script =====
echo.

REM Cores (Windows 10+)
setlocal enabledelayedexpansion

REM Verificar se está na pasta correta
if not exist "frontend-react" (
    echo ❌ ERRO: Pasta 'frontend-react' nao encontrada!
    echo Execute este script da pasta raiz (C:\Users\david\mni)
    pause
    exit /b 1
)

if not exist "backend" (
    echo ❌ ERRO: Pasta 'backend' nao encontrada!
    echo Execute este script da pasta raiz (C:\Users\david\mni)
    pause
    exit /b 1
)

REM Step 1: Build React
echo.
echo [1/2] Building React application...
echo.
cd frontend-react

if not exist "package.json" (
    echo ❌ ERRO: package.json nao encontrado em frontend-react
    pause
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo.
    echo ❌ ERRO ao fazer build do React!
    pause
    exit /b 1
)

echo.
echo ✅ Build React concluido com sucesso!
echo.

REM Step 2: Start Backend
echo [2/2] Starting backend server...
echo.
cd ..\backend

if not exist "package.json" (
    echo ❌ ERRO: package.json nao encontrado em backend
    pause
    exit /b 1
)

echo.
echo ✅ Iniciando servidor...
echo.
echo 📌 Acesse: http://localhost:3000
echo 📌 Sistema: React (vanilla DESATIVADO)
echo.

call npm start

pause
