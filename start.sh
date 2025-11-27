#!/bin/bash

# ========================================
# Script para iniciar MNI Web App
# - Build React
# - Iniciar servidor backend
# ========================================

echo ""
echo "===== MNI Web App - Startup Script ====="
echo ""

# Verificar se está na pasta correta
if [ ! -d "frontend-react" ]; then
    echo "❌ ERRO: Pasta 'frontend-react' não encontrada!"
    echo "Execute este script da pasta raiz"
    exit 1
fi

if [ ! -d "backend" ]; then
    echo "❌ ERRO: Pasta 'backend' não encontrada!"
    echo "Execute este script da pasta raiz"
    exit 1
fi

# Step 1: Build React
echo ""
echo "[1/2] Building React application..."
echo ""
cd frontend-react

if [ ! -f "package.json" ]; then
    echo "❌ ERRO: package.json não encontrado em frontend-react"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRO ao fazer build do React!"
    exit 1
fi

echo ""
echo "✅ Build React concluído com sucesso!"
echo ""

# Step 2: Start Backend
echo "[2/2] Starting backend server..."
echo ""
cd ../backend

if [ ! -f "package.json" ]; then
    echo "❌ ERRO: package.json não encontrado em backend"
    exit 1
fi

echo ""
echo "✅ Iniciando servidor..."
echo ""
echo "📌 Acesse: http://localhost:3000"
echo "📌 Sistema: React (vanilla DESATIVADO)"
echo ""

npm start
