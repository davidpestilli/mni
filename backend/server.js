/**
 * ========================================
 * MNI Web App - Backend Server
 * ========================================
 *
 * ⚠️ IMPORTANTE: Sistema vanilla (JavaScript puro) foi DESATIVADO
 *
 * APENAS React (Vite build) é servido. Isso evita confusão entre:
 * - /frontend (vanilla - DESATIVADO)
 * - /frontend-react (React - ATIVO)
 *
 * Se o build React não for encontrado, o servidor NÃO inicia.
 * Sempre execute "npm run build" em frontend-react antes de iniciar.
 *
 * ========================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/auth');
const avisosRoutes = require('./routes/avisos');
const avisosV3Routes = require('./routes/avisos-v3'); // MNI 3.0 para avisos
const processosRoutes = require('./routes/processos');
const tabelasRoutes = require('./routes/tabelas');
const peticionamentoRoutes = require('./routes/peticionamento');
const debugRoutes = require('./routes/debug');
const mni3Routes = require('./routes/mni3'); // MNI 3.0
const ambienteRoutes = require('./routes/ambiente'); // Gerenciador de Ambiente

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Aumentar limite para upload de PDFs
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos do frontend
// APENAS React (Vite build) - Sistema vanilla desativado
const fs = require('fs');
const reactBuildPath = path.join(__dirname, '../frontend-react/dist');

// ⚠️ VALIDAÇÃO: React build é OBRIGATÓRIO
if (!fs.existsSync(reactBuildPath)) {
    console.error('❌ ERRO FATAL: Frontend React não encontrado!');
    console.error(`   Caminho esperado: ${reactBuildPath}`);
    console.error('   Execute: npm run build (dentro de frontend-react)');
    process.exit(1);
}

console.log('📦 Servindo frontend React (Vite build) - Sistema vanilla DESATIVADO');
app.use(express.static(reactBuildPath));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/avisos-v3', avisosV3Routes); // MNI 3.0 para avisos (alternativa)
app.use('/api/processos', processosRoutes);
app.use('/api/tabelas', tabelasRoutes);
app.use('/api/mni3', mni3Routes); // MNI 3.0
app.use('/api/peticionamento', peticionamentoRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/ambiente', ambienteRoutes); // Gerenciador de Ambiente (HML/PROD)

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'MNI Web App Backend está rodando',
        version: '1.0.0',
        frontend: 'React (Vite) - Sistema vanilla DESATIVADO'
    });
});

// Rota catch-all - SPA React (todas as rotas vão para index.html)
app.get('*', (req, res) => {
    // Ignorar rotas da API (já tratadas acima)
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'Rota da API não encontrada'
        });
    }

    // Servir index.html do React
    // Isso permite que React Router lide com as rotas
    res.sendFile(path.join(reactBuildPath, 'index.html'));
});

// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
    console.error('[SERVER] Erro:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   MNI Web App Backend`);
    console.log(`   Rodando em: http://localhost:${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log('═══════════════════════════════════════════════════════════');
});
