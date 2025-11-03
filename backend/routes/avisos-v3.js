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
        // IMPORTANTE: Testando requisição simplificada (sem tipoPendencia e outroParametro)
        // pois a requisição bem-sucedida no SoapUI não envia esses parâmetros
        const opcoes = {};

        // AVISO: Segundo a documentação, idRepresentado tem erro/não funciona no MNI 3.0
        // (linha 27: "idRepresentado*: (erro – não funciona)")
        // Por enquanto, NÃO adicionar idRepresentado mesmo que fornecido
        if (idRepresentado) {
            console.log('[AVISOS V3] ⚠️ Parâmetro idRepresentado foi fornecido, MAS MNI 3.0 NÃO o suporta (bug conhecido)');
            // opcoes.idRepresentado = idRepresentado; // Comentado - não funciona no 3.0
        }

        // COMENTADO: Enviando requisição simplificada para testar
        // A requisição que funcionou no SoapUI não inclui tipoPendencia nem outroParametro
        /*
        // Adicionar tipo de pendência baseado no status solicitado
        // PC = pendente de ciência, PR = pendente de resposta, AM = ambos
        if (status === 'abertos') {
            opcoes.tipoPendencia = 'PR'; // Pendente de Resposta (prazos já abertos)
        } else if (status === 'aguardando') {
            opcoes.tipoPendencia = 'PC'; // Pendente de Ciência (aguardando abertura)
        } else if (status === 'todos') {
            opcoes.tipoPendencia = 'AM'; // Ambos
        }

        // Adicionar parâmetros obrigatórios conforme documentação MNI 3.0
        // Esses parâmetros são necessários para retornar informações detalhadas dos avisos
        opcoes.outroParametro = [
            {
                nome: 'todosPrazos',
                valor: 'true'
            },
            {
                nome: 'informacoesDetalhadas',
                valor: 'true'
            }
        ];
        */

        console.log('[AVISOS V3] Opções enviadas (simplificada):', opcoes);

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

        console.log('[AVISOS V3] Total de avisos antes de normalizar:', avisos.length);

        // Normalizar avisos para o formato esperado pelo frontend
        const avisosNormalizados = avisos.map(aviso => normalizarAvisoMNI3(aviso));

        console.log('[AVISOS V3] Total de avisos normalizados:', avisosNormalizados.length);

        // Responder ao cliente
        res.json({
            success: true,
            count: avisosNormalizados.length,
            data: avisosNormalizados,
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

/**
 * Normalizar aviso do MNI 3.0 para o formato esperado pelo frontend
 *
 * MNI 3.0 retorna estrutura diferente do MNI 2.2:
 * - Propriedades diretas ao invés de attributes
 * - destinatario.nome ao invés de destinatario.pessoa.attributes.nome
 * - processo.orgaoJulgador.nome ao invés de processo.orgaoJulgador.attributes.nomeOrgao
 */
function normalizarAvisoMNI3(aviso) {
    try {
        // Estrutura MNI 3.0:
        // {
        //   idAviso: "202510306000131",
        //   tipoComunicacao: "INT",
        //   destinatario: {
        //     nome: "ESTADO DE SÃO PAULO",
        //     qualificacaoPessoa: "JUR",
        //     numeroDocumentoPrincipal: "46379400000150"
        //   },
        //   processo: {
        //     numero: "60002987120258260014",
        //     classeProcessual: 1116,
        //     orgaoJulgador: {
        //       codigo: "014000503",
        //       nome: "Juízo Titular III...",
        //       instancia: "ORIG"
        //     },
        //     outroParametro: [...]
        //   },
        //   dataDisponibilizacao: "2025-10-30T15:58:23-03:00",
        //   tipoPrazo: "DATA_CERTA",
        //   prazo: 15
        // }

        const destinatario = aviso.destinatario || {};
        const processo = aviso.processo || {};
        const orgaoJulgador = processo.orgaoJulgador || {};

        // Extrair outrosParametros do array outroParametro
        const outrosParametros = extrairOutrosParametrosMNI3(processo.outroParametro);

        // Objeto normalizado no formato esperado pelo frontend
        const avisoNormalizado = {
            // ID do aviso
            idAviso: aviso.idAviso || '',
            tipoComunicacao: aviso.tipoComunicacao || 'INT',

            // Dados do processo
            numeroProcesso: processo.numero || aviso.numeroProcesso || '',
            classeProcessual: processo.classeProcessual ? String(processo.classeProcessual) : '',
            competencia: processo.competencia || '',
            nivelSigilo: processo.nivelSigilo || '0',

            // Destinatário
            nomeDestinatario: destinatario.nome || '',
            documentoDestinatario: destinatario.numeroDocumentoPrincipal || '',

            // Órgão julgador
            orgaoJulgador: orgaoJulgador.nome || '',
            codigoOrgao: orgaoJulgador.codigo || '',

            // Data de disponibilização (MNI 3.0 pode vir no formato ISO)
            dataDisponibilizacao: formatarDataHoraMNI3(aviso.dataDisponibilizacao),

            // Campo identificador para consultar teor
            identificadorMovimento: aviso.idAviso || ''
        };

        // Campos de prazo (MNI 3.0 retorna direto no aviso)
        if (aviso.prazo) {
            avisoNormalizado.prazo = String(aviso.prazo);
        }

        if (aviso.tipoPrazo) {
            avisoNormalizado.tipoPrazo = aviso.tipoPrazo;
        }

        // Adicionar campos de outrosParametros se disponíveis
        if (outrosParametros) {
            // Descrição do movimento
            avisoNormalizado.descricaoMovimento = outrosParametros.descricaoMovimento ||
                (aviso.tipoComunicacao === 'INT' ? 'Intimação' : 'Citação');

            // Identificador do movimento (pode ser diferente do ID do aviso)
            if (outrosParametros.identificadorMovimento) {
                avisoNormalizado.identificadorMovimento = outrosParametros.identificadorMovimento;
            }

            // Datas do prazo
            if (outrosParametros.inicioPrazo) {
                avisoNormalizado.inicioPrazo = outrosParametros.inicioPrazo;
            }
            if (outrosParametros.finalPrazo) {
                avisoNormalizado.finalPrazo = outrosParametros.finalPrazo;
            }
        } else {
            // Fallback para descrição do movimento
            avisoNormalizado.descricaoMovimento = aviso.tipoComunicacao === 'INT' ? 'Intimação' : 'Citação';
        }

        // IMPORTANTE: MNI 3.0 não retorna inicioPrazo e finalPrazo
        // Precisamos calculá-los quando o prazo já está disponível
        if (aviso.prazo && !avisoNormalizado.inicioPrazo && !avisoNormalizado.finalPrazo) {
            const prazosCalculados = calcularPrazosMNI3(
                aviso.dataDisponibilizacao,
                aviso.prazo,
                aviso.tipoPrazo
            );

            if (prazosCalculados.inicioPrazo) {
                avisoNormalizado.inicioPrazo = prazosCalculados.inicioPrazo;
            }
            if (prazosCalculados.finalPrazo) {
                avisoNormalizado.finalPrazo = prazosCalculados.finalPrazo;
            }
        }

        return avisoNormalizado;

    } catch (error) {
        console.error('[AVISOS V3] Erro ao normalizar aviso:', error);
        return {
            numeroProcesso: '',
            dataDisponibilizacao: '',
            identificadorMovimento: '',
            descricaoMovimento: 'Erro ao parsear',
            idAviso: aviso.idAviso || ''
        };
    }
}

/**
 * Extrair outrosParametros do array outroParametro do MNI 3.0
 */
function extrairOutrosParametrosMNI3(outroParametro) {
    if (!outroParametro || !Array.isArray(outroParametro)) {
        return null;
    }

    const parametros = {};

    outroParametro.forEach(param => {
        if (param.attributes) {
            // Formato: { attributes: { nome: "prazo", valor: "15" } }
            const nome = param.attributes.nome;
            const valor = param.attributes.valor;
            if (nome) {
                parametros[nome] = valor;
            }
        } else if (param.nome) {
            // Formato direto: { nome: "prazo", valor: "15" }
            parametros[param.nome] = param.valor;
        }
    });

    return Object.keys(parametros).length > 0 ? parametros : null;
}

/**
 * Formatar data/hora do MNI 3.0
 * MNI 3.0 pode retornar no formato ISO: "2025-10-30T15:58:23-03:00"
 * ou no formato antigo: "20251030155823"
 */
function formatarDataHoraMNI3(dataHora) {
    if (!dataHora) {
        return '';
    }

    // Se já está no formato ISO, extrair apenas data e hora
    if (dataHora.includes('T')) {
        try {
            const date = new Date(dataHora);
            const dia = String(date.getDate()).padStart(2, '0');
            const mes = String(date.getMonth() + 1).padStart(2, '0');
            const ano = date.getFullYear();
            const hora = String(date.getHours()).padStart(2, '0');
            const minuto = String(date.getMinutes()).padStart(2, '0');
            const segundo = String(date.getSeconds()).padStart(2, '0');
            return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
        } catch (error) {
            console.error('[AVISOS V3] Erro ao formatar data ISO:', error);
            return dataHora;
        }
    }

    // Formato antigo: AAAAMMDDHHMMSS
    if (dataHora.length >= 14) {
        const ano = dataHora.substring(0, 4);
        const mes = dataHora.substring(4, 6);
        const dia = dataHora.substring(6, 8);
        const hora = dataHora.substring(8, 10);
        const minuto = dataHora.substring(10, 12);
        const segundo = dataHora.substring(12, 14);
        return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    }

    return dataHora;
}

/**
 * Calcular inicioPrazo e finalPrazo baseado na dataDisponibilizacao e prazo
 * MNI 3.0 não retorna esses campos, precisamos calcular
 *
 * @param {string} dataDisponibilizacao - Data de disponibilização (formato ISO ou AAAAMMDDHHMMSS)
 * @param {number} prazo - Número de dias do prazo
 * @param {string} tipoPrazo - Tipo do prazo (DATA_CERTA, etc)
 * @returns {object} { inicioPrazo, finalPrazo } em formato AAAAMMDDHHMMSS
 */
function calcularPrazosMNI3(dataDisponibilizacao, prazo, tipoPrazo) {
    if (!dataDisponibilizacao || !prazo) {
        return {};
    }

    try {
        // Converter dataDisponibilizacao para Date
        let dataInicio;
        if (dataDisponibilizacao.includes('T')) {
            // Formato ISO: "2025-10-30T15:58:23-03:00"
            dataInicio = new Date(dataDisponibilizacao);
        } else if (dataDisponibilizacao.length >= 14) {
            // Formato AAAAMMDDHHMMSS
            const ano = dataDisponibilizacao.substring(0, 4);
            const mes = parseInt(dataDisponibilizacao.substring(4, 6)) - 1;
            const dia = dataDisponibilizacao.substring(6, 8);
            const hora = dataDisponibilizacao.substring(8, 10);
            const minuto = dataDisponibilizacao.substring(10, 12);
            const segundo = dataDisponibilizacao.substring(12, 14);
            dataInicio = new Date(ano, mes, dia, hora, minuto, segundo);
        } else {
            return {};
        }

        // Início do prazo: dia seguinte à data de disponibilização às 00:00:00
        const inicioPrazoDate = new Date(dataInicio);
        inicioPrazoDate.setDate(inicioPrazoDate.getDate() + 1);
        inicioPrazoDate.setHours(0, 0, 0, 0);

        // Final do prazo: inicioPrazo + prazo dias às 23:59:59
        const finalPrazoDate = new Date(inicioPrazoDate);
        finalPrazoDate.setDate(finalPrazoDate.getDate() + parseInt(prazo));
        finalPrazoDate.setHours(23, 59, 59, 999);

        // Formatar para AAAAMMDDHHMMSS
        const formatarData = (date) => {
            const ano = date.getFullYear();
            const mes = String(date.getMonth() + 1).padStart(2, '0');
            const dia = String(date.getDate()).padStart(2, '0');
            const hora = String(date.getHours()).padStart(2, '0');
            const minuto = String(date.getMinutes()).padStart(2, '0');
            const segundo = String(date.getSeconds()).padStart(2, '0');
            return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
        };

        const inicioPrazo = formatarData(inicioPrazoDate);
        const finalPrazo = formatarData(finalPrazoDate);

        console.log('[AVISOS V3] Prazos calculados:');
        console.log('  - dataDisponibilizacao:', dataDisponibilizacao);
        console.log('  - prazo:', prazo, 'dias');
        console.log('  - inicioPrazo:', inicioPrazo);
        console.log('  - finalPrazo:', finalPrazo);

        return {
            inicioPrazo: inicioPrazo,
            finalPrazo: finalPrazo
        };

    } catch (error) {
        console.error('[AVISOS V3] Erro ao calcular prazos:', error);
        return {};
    }
}

module.exports = router;
