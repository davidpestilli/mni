const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const mni3Client = require('../services/mni3Client');
const ambienteManager = require('../config/ambiente');

/**
 * GET /api/debug/endpoints
 * Verificar endpoints atuais (para debug de ambiente)
 */
router.get('/endpoints', (req, res) => {
    try {
        const endpoints = {
            ambienteAtual: ambienteManager.getAmbienteAtual(),
            mni2_2: {
                config: mniClient.config,
                clientInitialized: mniClient.client !== null
            },
            mni3_0: {
                endpoint: mni3Client.endpoint,
                wsdlUrl: mni3Client.wsdlUrl,
                ambiente: mni3Client.ambiente,
                clientInitialized: mni3Client.client !== null
            }
        };

        res.json({
            success: true,
            data: endpoints
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/debug/soap/last
 * Obter última transação SOAP
 */
router.get('/soap/last', (req, res) => {
    try {
        const transaction = mniClient.getLastSoapTransaction();
        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/debug/soap/logs
 * Obter histórico de transações SOAP
 */
router.get('/soap/logs', (req, res) => {
    try {
        const logs = mniClient.getSoapLogs();
        res.json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/debug/soap/logs
 * Limpar logs SOAP
 */
router.delete('/soap/logs', (req, res) => {
    try {
        mniClient.clearSoapLogs();
        res.json({
            success: true,
            message: 'Logs limpos com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
