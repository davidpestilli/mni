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
 * Obter histórico de transações SOAP (MNI 2.2 e MNI 3.0 combinados)
 */
router.get('/soap/logs', (req, res) => {
    try {
        const logs22 = mniClient.getSoapLogs();
        const logs30 = mni3Client.getSoapLogs();

        // Combinar logs de ambas as versões e ordenar por timestamp
        const logsCompletos = [...logs22, ...logs30].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        res.json({
            success: true,
            count: logsCompletos.length,
            data: logsCompletos,
            sources: {
                mni22: logs22.length,
                mni30: logs30.length
            }
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
 * Limpar logs SOAP (MNI 2.2 e MNI 3.0)
 */
router.delete('/soap/logs', (req, res) => {
    try {
        mniClient.clearSoapLogs();
        mni3Client.clearSoapLogs();
        res.json({
            success: true,
            message: 'Logs limpos com sucesso (MNI 2.2 e MNI 3.0)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
