const express = require('express');
const router = express.Router();
const mni3Client = require('../services/mni3Client');
const pjeAssuntoClient = require('../services/pjeAssuntoClient');
const pjeTabelaClient = require('../services/pjeTabelaClient');
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
 * Middleware para extrair credenciais do token e adicionar aos headers
 * O token é um Base64 de "usuario:senha"
 */
router.use((req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            // Decodificar token Base64
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [usuario, senha] = decoded.split(':');

            if (usuario && senha) {
                // Adicionar aos headers para que as rotas possam usar
                req.headers['x-usuario'] = usuario;
                req.headers['x-senha'] = senha;

                console.log('[MNI 3.0 MIDDLEWARE] Credenciais extraídas do token para usuário:', usuario);
            }
        } catch (error) {
            console.error('[MNI 3.0 MIDDLEWARE] Erro ao decodificar token:', error.message);
        }
    }

    next();
});

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
        const codigosBrutos = codigosMNI3.map(c => c.codigo.toString());

        // REMOVER DUPLICATAS: O MNI 3.0 pode retornar o mesmo código múltiplas vezes
        const codigosValidos = [...new Set(codigosBrutos)];

        console.log(`[MNI 3.0 HÍBRIDO] ${codigosBrutos.length} códigos retornados (${codigosValidos.length} únicos):`, codigosValidos.slice(0, 10));

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

        // Tentar enriquecer usando o mapeamento local do PJe (arquivo baixado)
        try {
            await pjeTabelaClient.init();
            const enriched = await pjeTabelaClient.enriquecerLista(codigosValidos);

            // Montar estrutura final mesclando informação original com descrição local
            // Usar apenas códigos únicos (codigosValidos) para evitar duplicatas
            const classesFormatadas = codigosValidos.map(codigoStr => {
                const found = enriched.find(e => e.codigo === codigoStr);
                return {
                    codigo: codigoStr,
                    descricao: found ? found.descricao : `Classe Processual (Código Nacional ${codigoStr})`,
                    descricaoCurta: found ? found.descricao : `Classe ${codigoStr}`,
                    ativo: true,
                    permitePeticionamentoInicial: true,
                    codigoNacional: codigoStr,
                    fonte: found ? 'PJe (arquivo local)' : 'MNI 3.0 (sem descrição local)'
                };
            });

            res.json({
                success: true,
                versao: '3.0 (enriquecido com PJe local quando disponível)',
                codigoLocalidade: codigoLocalidade,
                codigoCompetencia: codigoCompetencia,
                count: classesFormatadas.length,
                data: classesFormatadas,
                observacao: 'Retornando códigos nacionais do MNI 3.0 e, quando disponível, descrições locais obtidas do arquivo PJe baixado.' ,
                codigosNacionais: codigosValidos
            });

        } catch (err) {
            console.error('[MNI 3.0] Erro ao enriquecer classes com PJe local:', err.message);
            // Fallback para resposta genérica
            // Usar apenas códigos únicos (codigosValidos) para evitar duplicatas
            const classesFormatadas = codigosValidos.map(codigoStr => ({
                codigo: codigoStr,
                descricao: `Classe Processual (Código Nacional ${codigoStr})`,
                descricaoCurta: `Classe ${codigoStr}`,
                ativo: true,
                permitePeticionamentoInicial: true,
                codigoNacional: codigoStr,
                fonte: 'MNI 3.0 (apenas códigos nacionais - descrições localizadas indisponíveis)'
            }));

            res.json({
                success: true,
                versao: '3.0',
                codigoLocalidade: codigoLocalidade,
                codigoCompetencia: codigoCompetencia,
                count: classesFormatadas.length,
                data: classesFormatadas,
                observacao: 'Fallback: não foi possível enriquecer com PJe local.' ,
                codigosNacionais: codigosValidos
            });
        }

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

        const assuntosBrutos = await mni3Client.consultarAssuntos(codigoLocalidade, codigoClasse, codigoCompetencia);

        // Log detalhado do retorno bruto
        console.log('[DEBUG MNI3] Total de assuntos retornados:', assuntosBrutos.length);
        console.log('[DEBUG MNI3] Primeiros 3 assuntos (estrutura completa):', JSON.stringify(assuntosBrutos.slice(0, 3), null, 2));

        // REMOVER DUPLICATAS: O MNI 3.0 pode retornar o mesmo assunto múltiplas vezes
        const assuntosUnicos = Array.from(
            new Map(assuntosBrutos.map(a => {
                const codigo = a.codigo || a.codigoNacional || '';
                return [codigo, a];
            })).values()
        );

        console.log('[DEBUG MNI3] Assuntos após remoção de duplicatas:', assuntosUnicos.length, '(original:', assuntosBrutos.length, ')');

        // Enriquecer os assuntos com descrições locais
        await pjeAssuntoClient.init();

        // Exibir todos os assuntos, sem filtrar por principal
        let assuntosFormatados = [];
        if (Array.isArray(assuntosUnicos)) {
            assuntosFormatados = await Promise.all(assuntosUnicos.map(async a => {
                const codigo = a.codigo || a.codigoNacional || '';
                const descricaoEnriquecida = await pjeAssuntoClient.getDescricao(codigo);
                return {
                    ...a,  // Primeiro espalha as propriedades originais
                    codigo: codigo,  // Depois sobrescreve com valores corretos
                    descricao: descricaoEnriquecida,  // Garante que a descrição enriquecida seja usada
                    ativo: a.ativo !== 'N'
                };
            }));
        }

        res.json({
            success: true,
            versao: '3.0 (enriquecido com PJe local quando disponível)',
            codigoLocalidade: codigoLocalidade,
            codigoClasse: codigoClasse,
            codigoCompetencia: codigoCompetencia,
            count: assuntosFormatados.length,
            data: assuntosFormatados,
            observacao: 'Assuntos enriquecidos com descrições do arquivo PJe baixado.'
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
            incluirMovimentos: req.query.incluirMovimentos !== 'false',
            incluirDocumentos: req.query.incluirDocumentos === 'true'
        };

        // Adicionar dataInicial e dataFinal se fornecidas
        // Formato esperado: AAAAMMDDHHMMSS (ex: 20251031000000)
        if (req.query.dataInicial) {
            console.log('[MNI 3.0 ROUTE] Adicionando dataInicial:', req.query.dataInicial);
            options.dataInicial = req.query.dataInicial;
        }
        if (req.query.dataFinal) {
            console.log('[MNI 3.0 ROUTE] Adicionando dataFinal:', req.query.dataFinal);
            options.dataFinal = req.query.dataFinal;
        }

        // Adicionar chave de consulta se fornecida
        // Formato: <tip:parametros nome="chave" valor="..."/>
        if (req.query.chave) {
            console.log('[MNI 3.0 ROUTE] Adicionando chave:', req.query.chave);
            options.parametros = {
                attributes: {
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
            console.log('[MNI 3.0 ROUTE] Enviando estrutura RAW MNI 3.0 para o frontend');

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

/**
 * GET /api/mni3/info/rotas-peticionamento
 * Informações sobre qual rota usar para peticionamento intermediário
 * 
 * Útil para frontend determinar automaticamente qual versão usar baseado no sistema
 */
router.get('/info/rotas-peticionamento', (req, res) => {
    try {
        const { getInfoRotasPeticionamento } = require('../services/peticionamentoAuto');
        const info = getInfoRotasPeticionamento();
        
        res.json({
            success: true,
            ...info
        });
    } catch (error) {
        console.error('[MNI 3.0] Erro ao obter informações de rotas:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao obter informações de rotas'
        });
    }
});

/**
 * GET /api/mni3/descricao-classe/:codigo
 * Buscar descrição de uma classe processual por código
 */
router.get('/descricao-classe/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        await pjeTabelaClient.init();
        const descricao = await pjeTabelaClient.getDescricao(codigo);

        res.json({
            success: true,
            codigo: codigo,
            descricao: descricao || codigo,
            encontrado: !!descricao
        });
    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao buscar descrição de classe:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/mni3/descricao-assunto/:codigo
 * Buscar descrição de um assunto por código
 */
router.get('/descricao-assunto/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;

        await pjeAssuntoClient.init();
        const descricao = await pjeAssuntoClient.getDescricao(codigo);

        res.json({
            success: true,
            codigo: codigo,
            descricao: descricao || codigo,
            encontrado: descricao && descricao !== codigo && !descricao.includes('não encontrada')
        });
    } catch (error) {
        console.error('[MNI 3.0 API] Erro ao buscar descrição de assunto:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/mni3/processo/:numeroProcesso/documentos/:idDocumento
 * Consultar conteúdo de documento específico (MNI 3.0)
 */
router.get('/processo/:numeroProcesso/documentos/:idDocumento', async (req, res) => {
    try {
        const { numeroProcesso, idDocumento } = req.params;

        // Extrair credenciais dos headers (middleware já extraiu do token)
        const usuario = req.headers['x-usuario'];
        const senha = req.headers['x-senha'];

        console.log('[MNI 3.0 ROUTE] ========================================');
        console.log('[MNI 3.0 ROUTE] Requisição para documento:', idDocumento);
        console.log('[MNI 3.0 ROUTE] Processo:', numeroProcesso);
        console.log('[MNI 3.0 ROUTE] Usuario:', usuario);
        console.log('[MNI 3.0 ROUTE] ========================================');

        // Validações
        if (!usuario || !senha) {
            console.error('[MNI 3.0 ROUTE] Credenciais não fornecidas');
            return res.status(401).json({
                success: false,
                versao: '3.0',
                message: 'Credenciais não fornecidas. Token inválido ou ausente.'
            });
        }

        if (!/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                versao: '3.0',
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        if (!idDocumento || idDocumento.trim() === '') {
            return res.status(400).json({
                success: false,
                versao: '3.0',
                message: 'ID do documento não fornecido.'
            });
        }

        // Consultar documento
        const documento = await mni3Client.consultarConteudoDocumento(
            usuario,
            senha,
            numeroProcesso,
            idDocumento
        );

        console.log('[MNI 3.0 ROUTE] Documento consultado com sucesso');
        console.log('[MNI 3.0 ROUTE] Mimetype:', documento.mimetype);
        console.log('[MNI 3.0 ROUTE] Tamanho do conteúdo:', documento.conteudo?.length || 0);

        // Retornar o documento
        res.json({
            success: true,
            versao: '3.0',
            data: {
                conteudo: documento.conteudo,
                mimetype: documento.mimetype
            }
        });

    } catch (error) {
        console.error('[MNI 3.0 ROUTE] Erro ao consultar documento:', error.message);
        console.error('[MNI 3.0 ROUTE] Stack:', error.stack);

        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao consultar documento'
        });
    }
});

/**
 * POST /api/mni3/refresh-classes
 * Força recarregar o arquivo local de classes do PJe (apenas se debugMode)
 */
router.post('/refresh-classes', async (req, res) => {
    try {
        if (!config.debugMode) {
            return res.status(403).json({ success: false, message: 'Rota disponível apenas em debugMode' });
        }

        await pjeTabelaClient.refresh();

        res.json({ success: true, message: 'Refresh solicitado. Arquivo recarregado.' });
    } catch (error) {
        console.error('[MNI 3.0] Erro ao forçar refresh de classes:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/mni3/peticao
 * Realizar peticionamento intermediário (manifestação em processo existente) - MNI 3.0
 *
 * IMPORTANTE: Diferenças entre MNI 2.2 e 3.0:
 * - MNI 2.2: entregarManifestacaoProcessual (rota /api/peticionamento/intermediario)
 * - MNI 3.0: entregarPeticao (esta rota)
 * - MNI 3.0: conteúdo deve ser SHA-256 do documento (calculado automaticamente)
 * - MNI 3.0: estrutura de namespaces diferente
 *
 * Body esperado:
 * {
 *   "numeroProcesso": "60261559420258260960",
 *   "codigoTipoDocumento": "82400092",
 *   "documento": "<base64-do-pdf>",
 *   "nomeDocumento": "Petição.pdf",
 *   "mimetype": "application/pdf",
 *   "descricaoDocumento": "Descrição opcional",
 *   "cpfProcurador": "37450364840" (opcional)
 * }
 *
 * Requer autenticação via headers:
 * - X-Usuario: CPF/Sigla (extraído do token pelo middleware)
 * - X-Senha: Senha do usuário (extraída do token pelo middleware)
 */
router.post('/peticao', async (req, res) => {
    try {
        const {
            numeroProcesso,
            codigoTipoDocumento,
            documento,
            nomeDocumento,
            mimetype,
            descricaoDocumento,
            cpfProcurador
        } = req.body;

        // Extrair credenciais dos headers (middleware já extraiu do token)
        const usuario = req.headers['x-usuario'];
        const senha = req.headers['x-senha'];

        console.log('[MNI 3.0 ROUTE] ========================================');
        console.log('[MNI 3.0 ROUTE] Requisição de peticionamento intermediário');
        console.log('[MNI 3.0 ROUTE] Processo:', numeroProcesso);
        console.log('[MNI 3.0 ROUTE] Tipo documento:', codigoTipoDocumento);
        console.log('[MNI 3.0 ROUTE] Usuario:', usuario);
        console.log('[MNI 3.0 ROUTE] ========================================');

        // Validações
        if (!usuario || !senha) {
            console.error('[MNI 3.0 ROUTE] Credenciais não fornecidas');
            return res.status(401).json({
                success: false,
                versao: '3.0',
                message: 'Credenciais não fornecidas. Token inválido ou ausente.'
            });
        }

        if (!numeroProcesso || !/^\d{20}$/.test(numeroProcesso)) {
            return res.status(400).json({
                success: false,
                versao: '3.0',
                message: 'Número do processo inválido. Deve conter 20 dígitos.'
            });
        }

        if (!codigoTipoDocumento) {
            return res.status(400).json({
                success: false,
                versao: '3.0',
                message: 'Código do tipo de documento é obrigatório.'
            });
        }

        if (!documento || documento.trim() === '') {
            return res.status(400).json({
                success: false,
                versao: '3.0',
                message: 'Documento (Base64) é obrigatório.'
            });
        }

        // Montar objeto da petição
        const peticao = {
            codigoTipoDocumento: codigoTipoDocumento,
            documento: documento,
            nomeDocumento: nomeDocumento || 'Petição.pdf',
            mimetype: mimetype || 'application/pdf',
            descricaoDocumento: descricaoDocumento || '',
            cpfProcurador: cpfProcurador || null
        };

        // Entregar petição via MNI 3.0
        const resultado = await mni3Client.entregarPeticao(
            usuario,
            senha,
            numeroProcesso,
            peticao
        );

        console.log('[MNI 3.0 ROUTE] Petição entregue com sucesso!');
        console.log('[MNI 3.0 ROUTE] Protocolo:', resultado.numeroProtocolo);

        // Retornar resultado
        res.json({
            success: true,
            versao: '3.0',
            message: resultado.mensagem,
            data: {
                numeroProtocolo: resultado.numeroProtocolo,
                dataOperacao: resultado.dataOperacao,
                documentoComprovante: resultado.documentoComprovante
            }
        });

    } catch (error) {
        console.error('[MNI 3.0 ROUTE] Erro ao entregar petição:', error.message);
        console.error('[MNI 3.0 ROUTE] Stack:', error.stack);

        // Obter XMLs para debug
        const xmls = mni3Client.getLastXMLs();

        res.status(500).json({
            success: false,
            versao: '3.0',
            message: error.message || 'Erro ao entregar petição',
            debug: {
                xmlRequest: xmls.request,
                xmlResponse: xmls.response
            }
        });
    }
});

module.exports = router;
