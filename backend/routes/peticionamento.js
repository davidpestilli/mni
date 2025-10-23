const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const { gerarSenhaHashMNI } = require('../services/hashUtils');

/**
 * Função auxiliar: Extrair credenciais do header Authorization
 * Formato: Bearer <token_base64>
 * Token: cpfSigla:senha (em base64)
 */
function extrairCredenciaisDoHeader(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Header Authorization ausente ou inválido');
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        // Decodificar credenciais: formato "cpfSigla:senha"
        // A senha pode conter ":" então usar indexOf para encontrar o primeiro ":"
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) {
            throw new Error('Token mal formatado');
        }
        const cpfSigla = decoded.substring(0, colonIndex);
        const senha = decoded.substring(colonIndex + 1);

        if (!cpfSigla || !senha) {
            throw new Error('Token inválido ou mal formatado');
        }

        return { cpfSigla, senha };
    } catch (error) {
        throw new Error('Erro ao decodificar token: ' + error.message);
    }
}

/**
 * POST /api/peticionamento/inicial
 * Realizar peticionamento inicial (criar novo processo)
 *
 * ATUALIZAÇÃO: Credenciais (CPF/Sigla e Senha) agora vêm do header Authorization
 * Não é mais necessário fornecer essas informações no corpo da requisição
 */
router.post('/inicial', async (req, res) => {
    try {
        // Extrair credenciais do header Authorization
        let cpfSigla, senha;
        try {
            const creds = extrairCredenciaisDoHeader(req);
            cpfSigla = creds.cpfSigla;
            senha = creds.senha;
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Falha na autenticação: ' + error.message
            });
        }

        const {
            codigoLocalidade,
            classeProcessual,
            assunto,
            valorCausa,
            competencia,
            nivelSigilo,
            poloAtivo,
            poloPassivo,
            signatario,
            documentos
        } = req.body;

        // Validar campos obrigatórios
        if (!codigoLocalidade || !classeProcessual) {
            return res.status(400).json({
                success: false,
                message: 'Código de localidade e classe processual são obrigatórios'
            });
        }

        if (!poloAtivo || !Array.isArray(poloAtivo) || poloAtivo.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'É necessário informar ao menos uma parte no polo ativo'
            });
        }

        if (!poloPassivo || !Array.isArray(poloPassivo) || poloPassivo.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'É necessário informar ao menos uma parte no polo passivo'
            });
        }

        if (!documentos || !Array.isArray(documentos) || documentos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'É necessário anexar ao menos um documento (Petição Inicial)'
            });
        }

        if (!signatario || signatario.replace(/\D/g, '').length !== 11) {
            return res.status(400).json({
                success: false,
                message: 'CPF do signatário é obrigatório e deve ser válido'
            });
        }

        // Gerar hash SHA256 da senha
        const senhaHash = gerarSenhaHashMNI(senha);

        console.log(`[PETICIONAMENTO] Processando petição inicial para: ${cpfSigla}`);
        console.log(`[PETICIONAMENTO] Signatário: ${signatario}`);

        // Adicionar signatario a todos os documentos
        const documentosComSignatario = documentos.map(doc => ({
            ...doc,
            signatario
        }));

        // Montar dados para peticionamento inicial
        const dadosIniciais = {
            codigoLocalidade,
            classeProcessual,
            assunto,
            valorCausa,
            competencia,
            nivelSigilo: nivelSigilo || 0,
            poloAtivo,
            poloPassivo,
            documentos: documentosComSignatario
        };

        // Realizar peticionamento inicial
        const resultado = await mniClient.peticionamentoInicial(
            cpfSigla,
            senhaHash,
            dadosIniciais
        );

        res.json({
            success: resultado.sucesso,
            message: resultado.mensagem,
            data: {
                numeroProcesso: resultado.numeroProcesso,
                protocoloRecebimento: resultado.protocoloRecebimento,
                dataOperacao: resultado.dataOperacao,
                recibo: resultado.recibo
            }
        });

    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao realizar peticionamento inicial:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao realizar peticionamento inicial'
        });
    }
});

/**
 * POST /api/peticionamento/intermediario
 * Realizar peticionamento intermediário (manifestação em processo existente)
 */
router.post('/intermediario', async (req, res) => {
    try {
        const {
            cpfSigla,
            senha,
            numeroProcesso,
            tipoDocumento,
            documento,
            nomeDocumento,
            mimetype,
            nivelSigilo,
            descricaoDocumento
        } = req.body;

        // Validar campos obrigatórios
        if (!cpfSigla || !senha) {
            return res.status(400).json({
                success: false,
                message: 'CPF/Sigla e senha são obrigatórios'
            });
        }

        if (!numeroProcesso) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo é obrigatório'
            });
        }

        if (!documento) {
            return res.status(400).json({
                success: false,
                message: 'Documento (Base64) é obrigatório'
            });
        }

        // Gerar hash SHA256 da senha
        const senhaHash = gerarSenhaHashMNI(senha);

        // Montar dados da manifestação
        const manifestacao = {
            tipoDocumento: tipoDocumento || 13, // 13 = Petição genérica
            documento,
            nomeDocumento: nomeDocumento || 'Manifestação.pdf',
            mimetype: mimetype || 'application/pdf',
            nivelSigilo: nivelSigilo || 0,
            descricaoDocumento
        };

        // Entregar manifestação
        const resultado = await mniClient.entregarManifestacao(
            cpfSigla,
            senhaHash,
            numeroProcesso,
            manifestacao
        );

        res.json({
            success: resultado.sucesso,
            message: resultado.mensagem,
            data: {
                numeroProtocolo: resultado.numeroProtocolo,
                dataProtocolo: resultado.dataProtocolo
            }
        });

    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao realizar peticionamento intermediário:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao realizar peticionamento intermediário'
        });
    }
});

/**
 * GET /api/peticionamento/tipos-documento
 * Listar tipos de documento para peticionamento
 */
router.get('/tipos-documento', async (req, res) => {
    try {
        const tabelaClient = require('../services/tabelaClient');
        const tipos = await tabelaClient.consultarTiposDocumento();

        // Filtrar apenas tipos ativos
        const tiposAtivos = tipos.filter(t => t.ativo);

        res.json({
            success: true,
            count: tiposAtivos.length,
            data: tiposAtivos
        });

    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao consultar tipos de documento:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar tipos de documento'
        });
    }
});

/**
 * GET /api/peticionamento/debug/last-soap
 * Retornar último XML SOAP enviado/recebido (para debug)
 */
router.get('/debug/last-soap', async (req, res) => {
    try {
        const soapTransaction = mniClient.getLastSoapTransaction();

        res.json({
            success: true,
            data: {
                request: soapTransaction.request || 'Nenhuma requisição SOAP ainda',
                response: soapTransaction.response || 'Nenhuma resposta SOAP ainda'
            }
        });

    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao obter logs SOAP:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter logs SOAP'
        });
    }
});

/**
 * GET /api/peticionamento/debug/soap-logs
 * Retornar histórico de transações SOAP (últimas 10)
 */
router.get('/debug/soap-logs', async (req, res) => {
    try {
        const logs = mniClient.getSoapLogs();

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao obter histórico SOAP:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter histórico SOAP'
        });
    }
});

module.exports = router;
