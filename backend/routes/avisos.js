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
 * GET /api/avisos
 * Listar avisos pendentes
 *
 * Query parameters:
 *   - status=aguardando (padrão): Retorna apenas avisos com prazo aguardando abertura
 *   - status=abertos: Retorna apenas avisos com prazo aberto
 *   - status=todos: Retorna avisos aguardando abertura E abertos
 *   - idRepresentado (opcional): CPF ou CNPJ para filtrar avisos de um representado específico
 */
router.get('/', middlewareMNI2_2Validation, extractCredentials, async (req, res) => {
    try {
        const { idConsultante, senhaConsultante } = req.credentials;
        const status = req.query.status || 'aguardando';
        const idRepresentado = req.query.idRepresentado || null;

        // Gerar hash SHA256 da senha com data
        const senhaHash = gerarSenhaHashMNI(senhaConsultante);

        // Configurar opções de acordo com o status solicitado
        const opcoes = {};
        if (status === 'abertos' || status === 'todos') {
            opcoes.todosPrazos = true;
            opcoes.informacoesDetalhadas = true;
        }

        // Passar idRepresentado se foi fornecido na query string
        const avisos = await mniClient.consultarAvisosPendentes(
            idConsultante,
            senhaHash,
            opcoes,
            idRepresentado
        );

        // Filtrar avisos conforme status solicitado
        let avisosFiltrados = avisos;
        if (status === 'aguardando') {
            avisosFiltrados = avisos.filter(a => a.status !== 'Aberto');
        } else if (status === 'abertos') {
            avisosFiltrados = avisos.filter(a => a.status === 'Aberto');
        }
        // Se status === 'todos', retorna todos

        // Obter XMLs para debug
        const xmls = mniClient.getLastXMLs();

        res.json({
            success: true,
            count: avisosFiltrados.length,
            data: avisosFiltrados,
            ...(idRepresentado && { filteredBy: idRepresentado }),
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response
            }
        });

    } catch (error) {
        console.error('[AVISOS] Erro ao listar avisos:', error.message);

        // Obter XMLs mesmo em caso de erro
        const xmls = mniClient.getLastXMLs();

        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar avisos pendentes',
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response
            }
        });
    }
});

/**
 * GET /api/avisos/:numeroProcesso/:identificadorMovimento
 * Consultar teor da comunicação
 */
router.get('/:numeroProcesso/:identificadorMovimento', middlewareMNI2_2Validation, extractCredentials, async (req, res) => {
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

        // Obter XMLs para debug
        const xmls = mniClient.getLastXMLs();

        console.log('[AVISOS - Abrir Prazo] Consultado teor com sucesso');
        console.log('[AVISOS - Abrir Prazo] Tem XML Request?', !!xmls.request);
        console.log('[AVISOS - Abrir Prazo] Tem XML Response?', !!xmls.response);
        console.log('[AVISOS - Abrir Prazo] Tamanho XML Request:', xmls.request?.length || 0);
        console.log('[AVISOS - Abrir Prazo] Tamanho XML Response:', xmls.response?.length || 0);

        res.json({
            success: true,
            data: teor,
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response
            }
        });

    } catch (error) {
        console.error('[AVISOS] Erro ao consultar teor:', error.message);

        // Obter XMLs mesmo em caso de erro
        const xmls = mniClient.getLastXMLs();

        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar teor da comunicação',
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response
            }
        });
    }
});

module.exports = router;
