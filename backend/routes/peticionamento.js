const express = require('express');
const router = express.Router();
const mniClient = require('../services/mniClient');
const mni3Client = require('../services/mni3Client');
const { gerarSenhaHashMNI } = require('../services/hashUtils');
const { middlewareMNI2_2Validation } = require('../config/ambiente');

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
            processoOriginario,
            seqEventoAgravado,
            assunto,
            assuntosSecundarios,
            valorCausa,
            competencia,
            nivelSigilo,
            poloAtivo,
            poloPassivo,
            signatario,
            documentos,
            dadosCDA
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

        // Gerar hash SHA256 da senha no formato d-m-ySenha (padrão MNI)
        const senhaHash = gerarSenhaHashMNI(senha);

        console.log(`[PETICIONAMENTO] Processando petição inicial para: ${cpfSigla}`);
        console.log(`[PETICIONAMENTO] Signatário: ${signatario}`);
        console.log(`[PETICIONAMENTO] Classe: ${classeProcessual}`);
        if (processoOriginario) {
            console.log(`[PETICIONAMENTO] ✅ Processo Originário: ${processoOriginario}`);
        }
        if (seqEventoAgravado) {
            console.log(`[PETICIONAMENTO] ✅ Evento Agravado: ${seqEventoAgravado}`);
        }

        // Adicionar signatario a todos os documentos
        const documentosComSignatario = documentos.map(doc => ({
            ...doc,
            signatario
        }));

        // Montar dados para peticionamento inicial
        const dadosIniciais = {
            codigoLocalidade,
            classeProcessual,
            processoOriginario: processoOriginario || null,
            seqEventoAgravado: seqEventoAgravado || null,
            assunto,
            assuntosSecundarios: assuntosSecundarios || null,
            valorCausa,
            competencia,
            nivelSigilo: nivelSigilo || 0,
            poloAtivo,
            poloPassivo,
            documentos: documentosComSignatario,
            dadosCDA: dadosCDA || null  // Adicionar dados de CDA
        };

        // ⚠️ IMPORTANTE: Usar MNI 3.0 (entregarPeticaoInicial) para Execução Fiscal
        // MNI 2.2.2 (entregarManifestacaoProcessual) cria processo no Cível 1ª Instância
        // MNI 3.0 (requisicaoEntregarPeticaoInicial) cria processo na competência correta
        console.log(`[PETICIONAMENTO] 🔄 Usando MNI 3.0 para peticionamento inicial`);
        const resultado = await mni3Client.peticionamentoInicial(
            cpfSigla,
            senha,  // Passar senha original, o mni3Client irá gerar o hash
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
router.post('/intermediario', middlewareMNI2_2Validation, async (req, res) => {
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
router.get('/tipos-documento', middlewareMNI2_2Validation, async (req, res) => {
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
        console.log('[DEBUG SOAP] ========================================');
        console.log('[DEBUG SOAP] Verificando XMLs disponíveis...');
        console.log('[DEBUG SOAP] MNI 3.0 - lastRequestXML existe?', !!mni3Client.lastRequestXML);
        console.log('[DEBUG SOAP] MNI 3.0 - lastResponseXML existe?', !!mni3Client.lastResponseXML);

        // Tentar obter do MNI 3.0 primeiro, depois fallback para MNI 2.2
        let soapTransaction;
        let versao = '';

        if (mni3Client.lastRequestXML || mni3Client.lastResponseXML) {
            // MNI 3.0 tem dados (mesmo que um deles seja null)
            soapTransaction = {
                request: mni3Client.lastRequestXML,
                response: mni3Client.lastResponseXML
            };
            versao = 'MNI 3.0';
            console.log('[DEBUG SOAP] ✅ Retornando SOAP do MNI 3.0');
        } else {
            // Fallback para MNI 2.2
            soapTransaction = mniClient.getLastSoapTransaction();
            versao = 'MNI 2.2';
            console.log('[DEBUG SOAP] ✅ Retornando SOAP do MNI 2.2 (fallback)');
        }

        console.log('[DEBUG SOAP] Versão:', versao);
        console.log('[DEBUG SOAP] Request length:', soapTransaction.request?.length || 0);
        console.log('[DEBUG SOAP] Response length:', soapTransaction.response?.length || 0);
        console.log('[DEBUG SOAP] ========================================');

        res.json({
            success: true,
            versao,
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

/**
 * GET /api/peticionamento/info/rotas
 * Retorna informações sobre qual rota usar para peticionamento intermediário
 * 
 * Útil para frontend determinar automaticamente qual versão usar
 */
router.get('/info/rotas', (req, res) => {
    try {
        const { getInfoRotasPeticionamento } = require('../services/peticionamentoAuto');
        const info = getInfoRotasPeticionamento();
        
        res.json({
            success: true,
            ...info
        });
    } catch (error) {
        console.error('[PETICIONAMENTO] Erro ao obter informações de rotas:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter informações de rotas'
        });
    }
});

module.exports = router;
