const express = require('express');
const router = express.Router();
const mni3Client = require('../services/mni3Client');
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
        // Decodificar credenciais: formato "idConsultante:senha"
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
 * GET /api/avisos/v3
 * Listar avisos pendentes usando MNI 3.0
 *
 * Query parameters:
 *   - status=aguardando (padrão): Retorna apenas avisos com prazo aguardando abertura
 *   - status=abertos: Retorna apenas avisos com prazo aberto
 *   - status=todos: Retorna avisos aguardando abertura E abertos
 *   - idRepresentado (opcional): CPF ou CNPJ para filtrar avisos de um representado específico
 */
router.get('/', extractCredentials, async (req, res) => {
    try {
        const { idConsultante, senhaConsultante } = req.credentials;
        const status = req.query.status || 'aguardando';
        const idRepresentado = req.query.idRepresentado || null;

        console.log('[AVISOS V3] Consultando avisos com MNI 3.0');
        console.log('[AVISOS V3] idConsultante:', idConsultante);
        console.log('[AVISOS V3] idRepresentado:', idRepresentado);

        // Preparar opções para MNI 3.0
        const opcoes = {};

        // AVISO: Segundo a documentação, idRepresentado tem erro/não funciona no MNI 3.0
        // (linha 27: "idRepresentado*: (erro – não funciona)")
        // Por enquanto, NÃO adicionar idRepresentado mesmo que fornecido
        if (idRepresentado) {
            console.log('[AVISOS V3] ⚠️ Parâmetro idRepresentado foi fornecido, MAS MNI 3.0 NÃO o suporta (bug conhecido)');
            // opcoes.idRepresentado = idRepresentado; // Comentado - não funciona no 3.0
        }

        // Adicionar tipo de pendência baseado no status solicitado
        // PC = pendente de ciência, PR = pendente de resposta, AM = ambos
        if (status === 'abertos') {
            opcoes.tipoPendencia = 'PR'; // Pendente de Resposta (prazos já abertos)
        } else if (status === 'aguardando') {
            opcoes.tipoPendencia = 'PC'; // Pendente de Ciência (aguardando abertura)
        } else if (status === 'todos') {
            opcoes.tipoPendencia = 'AM'; // Ambos
        }

        console.log('[AVISOS V3] Opções enviadas:', opcoes);

        // Chamar MNI 3.0
        const resultado = await mni3Client.consultarAvisosPendentes(
            idConsultante,
            senhaConsultante,
            opcoes
        );

        console.log('[AVISOS V3] Resultado recebido:', JSON.stringify(resultado, null, 2));

        // Verificar se há erro na resposta
        if (resultado && resultado.recibo && resultado.recibo.sucesso === false) {
            console.error('[AVISOS V3] Erro do servidor MNI 3.0:');
            if (resultado.recibo.mensagens) {
                console.error('[AVISOS V3] Mensagens:', resultado.recibo.mensagens);
            }
            return res.status(500).json({
                success: false,
                message: 'Erro ao consultar avisos no servidor MNI 3.0',
                error: resultado.recibo.mensagens,
                version: 'MNI 3.0'
            });
        }

        // Extrair avisos da resposta
        // MNI 3.0 retorna estrutura: { recibo: {...}, avisos: [...] }
        let avisos = [];

        if (resultado && resultado.avisos) {
            // avisos pode ser um objeto único ou um array
            avisos = Array.isArray(resultado.avisos) ? resultado.avisos : [resultado.avisos];
        } else if (Array.isArray(resultado)) {
            avisos = resultado;
        }

        console.log('[AVISOS V3] Total de avisos:', avisos.length);

        // Responder ao cliente
        res.json({
            success: true,
            count: avisos.length,
            data: avisos,
            version: 'MNI 3.0',
            ...(idRepresentado && { filteredBy: idRepresentado })
        });

    } catch (error) {
        console.error('[AVISOS V3] Erro ao listar avisos:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar avisos pendentes (MNI 3.0)',
            version: 'MNI 3.0'
        });
    }
});

/**
 * GET /api/avisos-v3/:numeroProcesso/:identificadorMovimento
 * Consultar teor da comunicação (MNI 3.0)
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

        console.log('[AVISOS V3] Consultando teor da comunicação com MNI 3.0');
        console.log('[AVISOS V3] idConsultante:', idConsultante);
        console.log('[AVISOS V3] numeroProcesso:', numeroProcesso);
        console.log('[AVISOS V3] identificadorMovimento:', identificadorMovimento);

        // Consultar teor da comunicação usando MNI 3.0
        const teor = await mni3Client.consultarTeorComunicacao(
            idConsultante,
            senhaConsultante,
            numeroProcesso,
            identificadorMovimento
        );

        res.json({
            success: true,
            data: teor,
            version: 'MNI 3.0'
        });

    } catch (error) {
        console.error('[AVISOS V3] Erro ao consultar teor:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar teor da comunicação',
            version: 'MNI 3.0'
        });
    }
});

module.exports = router;
