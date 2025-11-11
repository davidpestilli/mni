const express = require('express');
const router = express.Router();
const ambienteManager = require('../config/ambiente');
const mniClient = require('../services/mniClient');
const mni3Client = require('../services/mni3Client');

/**
 * GET /api/ambiente
 * Obter ambiente atual e todos os endpoints ativos
 */
router.get('/', (req, res) => {
    try {
        const endpoints = ambienteManager.getEndpointsAtivos();

        res.json({
            success: true,
            data: endpoints
        });
    } catch (error) {
        console.error('[AMBIENTE] Erro ao obter ambiente:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter ambiente'
        });
    }
});

/**
 * POST /api/ambiente
 * Mudar ambiente (HML ou PROD) ou sistema (1G_CIVIL ou 1G_EXEC_FISCAL)
 * Body: { ambiente: "HML" ou "PROD" } ou { sistema: "1G_CIVIL" ou "1G_EXEC_FISCAL" }
 */
router.post('/', (req, res) => {
    try {
        const { ambiente, sistema } = req.body;

        if (!ambiente && !sistema) {
            return res.status(400).json({
                success: false,
                message: 'Campo "ambiente" ou "sistema" é obrigatório'
            });
        }

        let resultado;

        console.log('════════════════════════════════════════════════════════════');
        console.log('⚙️  MUDANÇA DE AMBIENTE/SISTEMA - BACKEND');
        console.log('════════════════════════════════════════════════════════════');
        
        // Mudar sistema se fornecido
        if (sistema) {
            resultado = ambienteManager.setSistema(sistema);
            console.log('✅ Sistema alterado:', resultado.sistema.nome);
            console.log('   Sistema ID:', resultado.sistema.sistema);
            console.log('   Ambientes disponíveis:', resultado.sistema.ambientesDisponiveis.join(', '));
        }

        // Mudar ambiente se fornecido
        if (ambiente) {
            resultado = ambienteManager.setAmbiente(ambiente);
            console.log('✅ Ambiente alterado:', resultado.ambiente);
        }

        console.log('───────────────────────────────────────────────────────────');
        console.log('📡 ENDPOINTS ATIVOS:');
        console.log('───────────────────────────────────────────────────────────');
        console.log('MNI 2.2:');
        console.log('  Endpoint:', resultado.endpoints.mni2_2.endpoint);
        console.log('  Ambiente:', resultado.endpoints.mni2_2.ambiente);
        console.log('');
        console.log('MNI 3.0:');
        console.log('  Endpoint:', resultado.endpoints.mni3_0.endpoint);
        console.log('  Ambiente:', resultado.endpoints.mni3_0.ambiente);
        console.log('  Sistema:', resultado.endpoints.mni3_0.sistema);
        console.log('═══════════════════════════════════════════════════════════');

        // Recarregar endpoints nos clientes SOAP
        // Isso força a reinicialização dos clientes com os novos endpoints
        try {
            mniClient.reloadEndpoints();
            console.log('✅ MNI 2.2 Client endpoints recarregados');
        } catch (error) {
            console.error('❌ Erro ao recarregar MNI 2.2:', error.message);
        }

        try {
            mni3Client.reloadEndpoints();
            console.log('✅ MNI 3.0 Client endpoints recarregados');
        } catch (error) {
            console.error('❌ Erro ao recarregar MNI 3.0:', error.message);
        }

        // Retornar resultado
        res.json({
            success: true,
            message: resultado.sucesso ? 'Configuração alterada com sucesso' : 'Erro ao alterar configuração',
            data: resultado
        });
    } catch (error) {
        console.error('[AMBIENTE] Erro ao mudar ambiente/sistema:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Erro ao mudar ambiente/sistema'
        });
    }
});

module.exports = router;
