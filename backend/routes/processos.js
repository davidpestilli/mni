const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const { gerarSenhaHashMNI } = require('../services/hashUtils');
const { middlewareMNI2_2Validation } = require('../config/ambiente');

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
        // Decodificar credenciais: formato "idConsultante:senha"
        // A senha pode conter ":" então usar split com limit ou usar spread operator
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) {
            throw new Error('Token mal formatado');
        }
        const idConsultante = decoded.substring(0, colonIndex);
        const senhaConsultante = decoded.substring(colonIndex + 1);

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
 * GET /api/processos/:numeroProcesso
 * Consultar dados do processo
 */
router.get('/:numeroProcesso', middlewareMNI2_2Validation, extractCredentials, async (req, res) => {
    try {
        const { numeroProcesso } = req.params;
        const { idConsultante, senhaConsultante } = req.credentials;
        const { incluirDocumentos, chave, dataReferencia } = req.query;

        // Validar número do processo (20 dígitos)
        if (!/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        // Validar data de referência se fornecida (14 dígitos: AAAAMMDDHHMMSS)
        if (dataReferencia && !/^\d{14}$/.test(dataReferencia)) {
            return res.status(400).json({
                success: false,
                message: 'Data de referência inválida. Deve conter 14 dígitos no formato AAAAMMDDHHMMSS.'
            });
        }

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        const processo = await mniClient.consultarProcesso(
            idConsultante,
            senhaHash,
            numeroProcesso,
            incluirDocumentos !== 'false',
            chave || null,
            dataReferencia || null
        );

        res.json({
            success: true,
            data: processo
        });

    } catch (error) {
        console.error('[PROCESSOS] Erro ao consultar processo:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar processo'
        });
    }
});

/**
 * GET /api/processos/:numeroProcesso/documentos/:idDocumento
 * Baixar documento do processo
 */
router.get('/:numeroProcesso/documentos/:idDocumento', middlewareMNI2_2Validation, extractCredentials, async (req, res) => {
    try {
        const { numeroProcesso, idDocumento } = req.params;
        const { idConsultante, senhaConsultante } = req.credentials;

        // Validar número do processo
        if (!/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        const documento = await mniClient.consultarConteudoDocumento(
            idConsultante,
            senhaHash,
            numeroProcesso,
            idDocumento
        );

        // Retornar o Base64 para o frontend processar
        res.json({
            success: true,
            data: {
                conteudo: documento.conteudo,
                mimetype: documento.mimetype
            }
        });

    } catch (error) {
        console.error('[PROCESSOS] Erro ao consultar documento:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar documento'
        });
    }
});

/**
 * POST /api/processos/:numeroProcesso/manifestacoes
 * Enviar manifestação processual
 */
router.post('/:numeroProcesso/manifestacoes', middlewareMNI2_2Validation, extractCredentials, async (req, res) => {
    try {
        const { numeroProcesso } = req.params;
        const { idConsultante, senhaConsultante } = req.credentials;
        const manifestacao = req.body;

        // Validações
        if (!/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        if (!manifestacao.documento || !manifestacao.nomeDocumento || !manifestacao.tipoDocumento) {
            return res.status(400).json({
                success: false,
                message: 'Documento, nome e tipo são obrigatórios'
            });
        }

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        const resultado = await mniClient.entregarManifestacao(
            idConsultante,
            senhaHash,
            numeroProcesso,
            manifestacao
        );

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('[PROCESSOS] Erro ao entregar manifestação:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao entregar manifestação'
        });
    }
});

module.exports = router;
