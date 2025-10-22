const express = require('express');
const router = express.Router();
const ambienteManager = require('../config/ambiente');

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
 * Mudar ambiente (HML ou PROD)
 * Body: { ambiente: "HML" ou "PROD" }
 */
router.post('/', (req, res) => {
    try {
        const { ambiente } = req.body;

        if (!ambiente) {
            return res.status(400).json({
                success: false,
                message: 'Campo "ambiente" é obrigatório'
            });
        }

        // Atualizar ambiente
        const resultado = ambienteManager.setAmbiente(ambiente);

        // Retornar resultado
        res.json({
            success: true,
            message: `Ambiente alterado para: ${resultado.ambiente}`,
            data: resultado
        });
    } catch (error) {
        console.error('[AMBIENTE] Erro ao mudar ambiente:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Erro ao mudar ambiente'
        });
    }
});

module.exports = router;
