const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const { gerarSenhaHashMNI } = require('../services/hashUtils');

/**
 * Middleware para extrair credenciais do token
 */
function extractCredentials(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Token de autenticação não fornecido'
        });
    }

    try {
        const token = authHeader.substring(7);
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [idConsultante, senhaConsultante] = decoded.split(':');

        req.credentials = { idConsultante, senhaConsultante };
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
}

/**
 * GET /api/avisos
 * Listar avisos pendentes
 */
router.get('/', extractCredentials, async (req, res) => {
    try {
        const { idConsultante, senhaConsultante } = req.credentials;

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        const avisos = await mniClient.consultarAvisosPendentes(idConsultante, senhaHash);

        res.json({
            success: true,
            count: avisos.length,
            data: avisos
        });

    } catch (error) {
        console.error('[AVISOS] Erro ao listar avisos:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar avisos pendentes'
        });
    }
});

/**
 * GET /api/avisos/:numeroProcesso/:identificadorMovimento
 * Consultar teor da comunicação
 */
router.get('/:numeroProcesso/:identificadorMovimento', extractCredentials, async (req, res) => {
    try {
        const { numeroProcesso, identificadorMovimento } = req.params;
        const { idConsultante, senhaConsultante } = req.credentials;

        // Validar número do processo (20 dígitos)
        if (!/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        const teor = await mniClient.consultarTeorComunicacao(
            idConsultante,
            senhaHash,
            numeroProcesso,
            identificadorMovimento
        );

        res.json({
            success: true,
            data: teor
        });

    } catch (error) {
        console.error('[AVISOS] Erro ao consultar teor:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar teor da comunicação'
        });
    }
});

module.exports = router;
