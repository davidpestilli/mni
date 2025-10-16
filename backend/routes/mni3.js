const express = require('express');
const router = express.Router();
const mni3Client = require('../services/mni3Client');
const config = require('../config/mni.config');

/**
 * ========================================
 * ROTAS MNI 3.0
 * ========================================
 *
 * Estas rotas utilizam o MNI 3.0 para consultas em cascata.
 *
 * FLUXO DE PETICIONAMENTO INICIAL:
 * 1. GET /api/mni3/localidades?estado=SP
 * 2. GET /api/mni3/competencias/:codigoLocalidade
 * 3. GET /api/mni3/classes/:codigoLocalidade?competencia=X
 * 4. GET /api/mni3/assuntos/:codigoLocalidade/:codigoClasse?competencia=X
 *
 * IMPORTANTE: As rotas do MNI 2.2 continuam disponíveis em /api/tabelas
 */

/**
 * GET /api/mni3/localidades
 * Consultar localidades (comarcas) de um estado
 */
router.get('/localidades', async (req, res) => {
    try {
        const estado = req.query.estado || 'SP';

        const localidades = await mni3Client.consultarLocalidades(estado);

        res.json({
            success: true,
            versao: '3.0',
            estado: estado,
            count: Array.isArray(localidades) ? localidades.length : 0,
            data: localidades
        });

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar localidades:', error.message);
        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar localidades'
        });
    }
});

/**
 * GET /api/mni3/competencias/:codigoLocalidade
 * Consultar competências disponíveis para uma localidade
 */
router.get('/competencias/:codigoLocalidade', async (req, res) => {
    try {
        const { codigoLocalidade } = req.params;

        if (!codigoLocalidade) {
            return res.status(400).json({
                success: false,
                message: 'Código da localidade é obrigatório'
            });
        }

        const competencias = await mni3Client.consultarCompetencias(codigoLocalidade);

        res.json({
            success: true,
            versao: '3.0',
            codigoLocalidade: codigoLocalidade,
            count: Array.isArray(competencias) ? competencias.length : 0,
            data: competencias
        });

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar competências:', error.message);
        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar competências'
        });
    }
});

/**
 * GET /api/mni3/classes/:codigoLocalidade
 * Consultar classes processuais válidas para uma localidade/competência
 *
 * Query params:
 * - competencia: Código da competência (opcional)
 *
 * SOLUÇÃO HÍBRIDA MNI 3.0 + MNI 2.2:
 * - MNI 3.0: Retorna apenas CÓDIGOS válidos para o contexto (localidade + competência)
 * - MNI 2.2: Retorna DESCRIÇÕES completas de todas as classes
 * - Esta rota: Cruza os dados para retornar apenas classes válidas COM descrições
 */
router.get('/classes/:codigoLocalidade', async (req, res) => {
    try {
        const { codigoLocalidade } = req.params;
        const codigoCompetencia = req.query.competencia || null;

        if (!codigoLocalidade) {
            return res.status(400).json({
                success: false,
                message: 'Código da localidade é obrigatório'
            });
        }

        // ============================================================
        // PASSO 1: MNI 3.0 - Obter códigos válidos para este contexto
        // ============================================================
        const codigosMNI3 = await mni3Client.consultarClasses(codigoLocalidade, codigoCompetencia);

        if (!Array.isArray(codigosMNI3) || codigosMNI3.length === 0) {
            return res.json({
                success: true,
                versao: '3.0 (híbrido com 2.2)',
                codigoLocalidade: codigoLocalidade,
                codigoCompetencia: codigoCompetencia,
                count: 0,
                data: [],
                observacao: 'Nenhuma classe válida para este contexto'
            });
        }

        // Extrair apenas os códigos retornados pelo MNI 3.0
        const codigosValidos = codigosMNI3.map(c => c.codigo.toString());

        console.log(`[MNI 3.0 HÍBRIDO] ${codigosValidos.length} códigos válidos retornados:`, codigosValidos.slice(0, 10));

        // ============================================================
        // IMPORTANTE: LIMITAÇÃO DO MNI 3.0
        // ============================================================
        // O MNI 3.0 retorna apenas CÓDIGOS NACIONAIS (padrão CNJ).
        // O MNI 2.2 do TJSP retorna apenas CÓDIGOS LOCAIS do tribunal.
        // Não há correspondência direta entre eles.
        //
        // A tabela nacional "ClasseProcessual" retorna erro 101 (não autorizado)
        // no MNI 2.2 do TJSP, impossibilitando o cruzamento híbrido.
        //
        // SOLUÇÃO ATUAL: Retornar códigos com descrição genérica.
        // SOLUÇÃO FUTURA: Criar tabela de mapeamento manual ou integrar
        //                 com serviço público do CNJ para obter descrições.
        // ============================================================

        console.log('[MNI 3.0] AVISO: Retornando apenas códigos nacionais sem descrições localizadas');
        console.log('[MNI 3.0] Motivo: MNI 2.2 usa códigos locais incompatíveis com códigos nacionais do MNI 3.0');

        // Formatar resposta com códigos nacionais
        const classesFormatadas = codigosMNI3.map(classe => ({
            codigo: classe.codigo,
            descricao: `Classe Processual (Código Nacional ${classe.codigo})`,
            descricaoCurta: `Classe ${classe.codigo}`,
            ativo: true,
            permitePeticionamentoInicial: true,
            codigoNacional: classe.codigo,
            fonte: 'MNI 3.0 (apenas códigos nacionais - descrições localizadas indisponíveis)'
        }));

        res.json({
            success: true,
            versao: '3.0',
            codigoLocalidade: codigoLocalidade,
            codigoCompetencia: codigoCompetencia,
            count: classesFormatadas.length,
            data: classesFormatadas,
            observacao: 'IMPORTANTE: MNI 3.0 retorna apenas códigos nacionais. Descrições localizadas requerem tabela de mapeamento CNJ ou integração adicional. Use esses códigos para peticionamento - o sistema e-Proc reconhece os códigos nacionais.',
            aviso: 'Descrições genéricas. Para descrições completas, seria necessário: (1) tabela de mapeamento manual CNJ, ou (2) integração com serviço público CNJ, ou (3) consulta à documentação das Tabelas Processuais Unificadas do CNJ.',
            codigosNacionais: codigosValidos
        });

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar classes:', error.message);
        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar classes'
        });
    }
});

/**
 * GET /api/mni3/assuntos/:codigoLocalidade/:codigoClasse
 * Consultar assuntos válidos para uma classe/localidade
 *
 * Query params:
 * - competencia: Código da competência (opcional)
 */
router.get('/assuntos/:codigoLocalidade/:codigoClasse', async (req, res) => {
    try {
        const { codigoLocalidade, codigoClasse } = req.params;
        const codigoCompetencia = req.query.competencia || null;

        if (!codigoLocalidade || !codigoClasse) {
            return res.status(400).json({
                success: false,
                message: 'Código da localidade e classe são obrigatórios'
            });
        }

        const assuntos = await mni3Client.consultarAssuntos(codigoLocalidade, codigoClasse, codigoCompetencia);

        res.json({
            success: true,
            versao: '3.0',
            codigoLocalidade: codigoLocalidade,
            codigoClasse: codigoClasse,
            codigoCompetencia: codigoCompetencia,
            count: Array.isArray(assuntos) ? assuntos.length : 0,
            data: assuntos,
            observacao: 'Assuntos incluem indicação de principal/complementar'
        });

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar assuntos:', error.message);
        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar assuntos'
        });
    }
});

/**
 * GET /api/mni3/avisos
 * Consultar avisos pendentes
 *
 * Requer autenticação via headers:
 * - X-Usuario: CPF/Sigla
 * - X-Senha: Senha do usuário
 */
router.get('/avisos', async (req, res) => {
    try {
        const usuario = req.headers['x-usuario'];
        const senha = req.headers['x-senha'];

        if (!usuario || !senha) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais não fornecidas. Use headers X-Usuario e X-Senha'
            });
        }

        const options = {
            dataInicial: req.query.dataInicial,
            dataFinal: req.query.dataFinal,
            tipoPendencia: req.query.tipoPendencia,
            tiposAviso: req.query.tiposAviso
        };

        const avisos = await mni3Client.consultarAvisosPendentes(usuario, senha, options);

        res.json({
            success: true,
            versao: '3.0',
            data: avisos
        });

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar avisos:', error.message);
        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar avisos pendentes'
        });
    }
});

/**
 * GET /api/mni3/processo/:numeroProcesso
 * Consultar dados de um processo
 *
 * Requer autenticação via headers:
 * - X-Usuario: CPF/Sigla
 * - X-Senha: Senha do usuário
 *
 * Query params opcionais:
 * - incluirCabecalho, incluirPartes, incluirMovimentos, incluirDocumentos, etc.
 */
router.get('/processo/:numeroProcesso', async (req, res) => {
    try {
        const { numeroProcesso } = req.params;
        const usuario = req.headers['x-usuario'];
        const senha = req.headers['x-senha'];

        console.log('[MNI 3.0 ROUTE] ========================================');
        console.log('[MNI 3.0 ROUTE] Recebida requisição para processo:', numeroProcesso);
        console.log('[MNI 3.0 ROUTE] Headers:', { usuario, senha: senha ? '***' : undefined });
        console.log('[MNI 3.0 ROUTE] Query params:', req.query);
        console.log('[MNI 3.0 ROUTE] ========================================');

        if (!usuario || !senha) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais não fornecidas. Use headers X-Usuario e X-Senha'
            });
        }

        if (!numeroProcesso || numeroProcesso.length !== 20) {
            return res.status(400).json({
                success: false,
                message: 'Número do processo inválido. Deve ter 20 dígitos'
            });
        }

        const options = {
            incluirCabecalho: req.query.incluirCabecalho !== 'false',
            incluirPartes: req.query.incluirPartes !== 'false',
            incluirEnderecos: req.query.incluirEnderecos === 'true',
            incluirMovimentos: req.query.incluirMovimentos === 'true',
            incluirDocumentos: req.query.incluirDocumentos === 'true'
        };

        // Adicionar chave de consulta se fornecida
        // Formato: <tip:parametros nome="chave" valor="..."/>
        if (req.query.chave) {
            console.log('[MNI 3.0 ROUTE] Adicionando chave:', req.query.chave);
            options.parametros = {
                $attributes: {
                    nome: 'chave',
                    valor: req.query.chave
                }
            };
        }

        console.log('[MNI 3.0 ROUTE] Options montado:', JSON.stringify(options, null, 2));

        const resultado = await mni3Client.consultarProcesso(usuario, senha, numeroProcesso, options);

        console.log('[MNI 3.0 ROUTE] Resultado recebido do cliente');
        console.log('[MNI 3.0 ROUTE] Tem recibo?', !!resultado?.recibo);
        console.log('[MNI 3.0 ROUTE] Sucesso?', resultado?.recibo?.sucesso);
        console.log('[MNI 3.0 ROUTE] Tipo do sucesso:', typeof resultado?.recibo?.sucesso);

        // Verificar sucesso da operação
        // Resposta MNI 3.0: { recibo: { sucesso, mensagens }, processo: { dadosBasicos, ... } }
        // IMPORTANTE: sucesso pode vir como string "true" ou boolean true
        const sucesso = resultado?.recibo?.sucesso === true || resultado?.recibo?.sucesso === 'true';

        // Obter XMLs para debug
        const xmls = mni3Client.getLastXMLs();

        if (resultado && resultado.recibo && sucesso) {
            console.log('[MNI 3.0 ROUTE] Consulta bem sucedida!');
            res.json({
                success: true,
                versao: '3.0',
                numeroProcesso: numeroProcesso,
                data: resultado.processo || resultado,
                recibo: resultado.recibo,
                debug: {
                    xmlRequest: xmls.request,
                    xmlResponse: xmls.response
                }
            });
        } else {
            const mensagem = resultado?.recibo?.mensagens?.descritivo || 'Erro desconhecido ao consultar processo';
            console.log('[MNI 3.0 ROUTE] Consulta falhou:', mensagem);
            console.log('[MNI 3.0 ROUTE] Recibo completo:', JSON.stringify(resultado?.recibo, null, 2));
            res.json({
                success: false,
                versao: '3.0',
                numeroProcesso: numeroProcesso,
                message: mensagem,
                recibo: resultado?.recibo,
                resultadoCompleto: resultado, // Para debug
                debug: {
                    xmlRequest: xmls.request,
                    xmlResponse: xmls.response
                }
            });
        }

    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao consultar processo:', error.message);

        // Obter XMLs mesmo em caso de erro
        const xmls = mni3Client.getLastXMLs();

        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar processo',
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response,
                erro: error.stack
            }
        });
    }
});

/**
 * GET /api/mni3/test
 * Endpoint de teste para verificar se o cliente SOAP está funcionando
 */
router.get('/test', async (req, res) => {
    try {
        const testResult = {
            clienteInicializado: false,
            wsdlCarregado: false,
            metodos: [],
            erro: null
        };

        try {
            await mni3Client.initialize();
            testResult.clienteInicializado = true;
            testResult.wsdlCarregado = !!mni3Client.client;

            if (mni3Client.client) {
                testResult.metodos = Object.keys(mni3Client.client)
                    .filter(k => typeof mni3Client.client[k] === 'function' && k.includes('Async'))
                    .slice(0, 10); // Primeiros 10 métodos
            }
        } catch (error) {
            testResult.erro = error.message;
        }

        res.json({
            success: true,
            versao: '3.0',
            teste: testResult,
            config: {
                wsdlUrl: mni3Client.wsdlUrl,
                endpoint: mni3Client.endpoint
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
 * GET /api/mni3/info
 * Informações sobre a API MNI 3.0
 */
router.get('/info', (req, res) => {
    res.json({
        success: true,
        versao: '3.0',
        ambiente: 'HOMOLOGAÇÃO',
        endpoints: {
            localidades: 'GET /api/mni3/localidades?estado=SP',
            competencias: 'GET /api/mni3/competencias/:codigoLocalidade',
            classes: 'GET /api/mni3/classes/:codigoLocalidade?competencia=X',
            assuntos: 'GET /api/mni3/assuntos/:codigoLocalidade/:codigoClasse?competencia=X',
            avisos: 'GET /api/mni3/avisos (requer headers X-Usuario e X-Senha)',
            processo: 'GET /api/mni3/processo/:numeroProcesso (requer headers X-Usuario e X-Senha)'
        },
        fluxoPeticionamentoInicial: [
            '1. Consultar localidades (estado)',
            '2. Consultar competências (localidade)',
            '3. Consultar classes (localidade + competência)',
            '4. Consultar assuntos (localidade + classe)'
        ],
        diferencasMNI22: {
            vantagens: [
                'Filtragem em cascata (apenas opções válidas)',
                'Resolve problema de classes complementares automaticamente',
                'Assuntos já indicam se são principal ou complementar',
                'Métodos específicos por tipo de consulta'
            ],
            manterMNI22Para: [
                'Peticionamento intermediário (TipoDocumento)',
                'Funcionalidades já estáveis'
            ]
        }
    });
});

module.exports = router;
