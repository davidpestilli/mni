const soap = require('soap');
const crypto = require('crypto');
const { gerarSenhaHashMNI } = require('./hashUtils');

/**
 * ========================================
 * MNI 3.0 CLIENT
 * ========================================
 *
 * Este cliente foi criado para trabalhar com o MNI 3.0 (Modelo Nacional de Interoperabilidade).
 *
 * IMPORTANTE: O mniClient.js (MNI 2.2) continua disponível e funcionando.
 * Este arquivo (mni3Client.js) é separado para permitir:
 * - Migração gradual do 2.2 para o 3.0
 * - Fallback para 2.2 se necessário
 * - Testes paralelos entre versões
 * - Manutenção de funcionalidades legadas
 *
 * DIFERENÇAS PRINCIPAIS MNI 2.2 vs 3.0:
 * =====================================
 *
 * MNI 2.2:
 * - Tabelas genéricas (consultarTabela)
 * - Algumas tabelas retornam erro 101 (não autorizado)
 * - Não filtra classes/assuntos por contexto
 *
 * MNI 3.0:
 * - Métodos específicos por tabela (consultarClasses, consultarAssuntos)
 * - Filtragem em cascata (localidade → competência → classe → assunto)
 * - Retorna apenas opções válidas para o contexto
 * - Resolve problema de classes "principal/complementar" automaticamente
 *
 * QUANDO USAR CADA UM:
 * ====================
 * - Use MNI 3.0: Para peticionamento INICIAL (cascata de seleções)
 * - Use MNI 2.2: Para peticionamento INTERMEDIÁRIO (tipos de documento)
 */

class MNI3Client {
    constructor() {
        // Obter endpoints do gerenciador de ambiente
        const ambienteManager = require('../config/ambiente');
        const endpoints = ambienteManager.getEndpoints3_0();

        this.wsdlUrl = endpoints.wsdlUrl;
        this.endpoint = endpoints.endpoint;
        this.ambiente = endpoints.ambiente;
        this.client = null;

        // Namespaces MNI 3.0
        this.namespaces = {
            v300: 'http://www.cnj.jus.br/mni/v300/',
            tip: 'http://www.cnj.jus.br/mni/v300/tipos-servico-intercomunicacao',
            int: 'http://www.cnj.jus.br/mni/v300/intercomunicacao'
        };

        // Configurações
        this.timeout = parseInt(process.env.REQUEST_TIMEOUT) || 60000;
        this.debugMode = process.env.DEBUG_MODE === 'true';

        // Armazenar último request/response para debug
        this.lastRequestXML = null;
        this.lastResponseXML = null;
    }

    /**
     * Recarrega endpoints quando o ambiente muda (HML/PROD)
     * Limpa o cliente SOAP para forçar reinicialização com novos endpoints
     */
    reloadEndpoints() {
        try {
            const ambienteManager = require('../config/ambiente');
            const endpoints = ambienteManager.getEndpoints3_0();

            this.wsdlUrl = endpoints.wsdlUrl;
            this.endpoint = endpoints.endpoint;
            this.ambiente = endpoints.ambiente;
            this.client = null; // Forçar reinicialização na próxima chamada

            console.log('[MNI 3.0] Endpoints recarregados');
            console.log('[MNI 3.0] Novo ambiente:', this.ambiente);
            console.log('[MNI 3.0] Novo endpoint:', this.endpoint);

            return { sucesso: true, ambiente: this.ambiente, endpoint: this.endpoint };
        } catch (error) {
            console.error('[MNI 3.0] Erro ao recarregar endpoints:', error.message);
            throw error;
        }
    }

    /**
     * Inicializa o cliente SOAP MNI 3.0
     */
    async initialize() {
        if (this.client) return this.client;

        try {
            const options = {
                timeout: this.timeout,
                disableCache: true,
                // CRÍTICO: Habilitar processamento de attachments MTOM/XOP
                // Documentos podem vir como attachments, não apenas inline no XML
                parseReponseAttachments: true,
                // Usar encoding binário para attachments (não UTF-8)
                encoding: null,
                forceSoap12Headers: true
            };

            this.client = await soap.createClientAsync(this.wsdlUrl, options);

            // Configurar endpoint manualmente
            if (this.client) {
                this.client.setEndpoint(this.endpoint);

                // Interceptar e modificar requests SOAP para adicionar namespaces corretos
                // O servidor MNI 3.0 de Execução Fiscal exige namespaces específicos nos elementos

                // Usar addSoapHeader para garantir que os namespaces sejam adicionados
                this.client.addSoapHeader = function() {
                    // Não fazer nada aqui, mas manter o método
                };

                // DESABILITAR INTERCEPTOR TEMPORARIAMENTE PARA TESTAR
                // O interceptor não está funcionando corretamente
                const self = this;

                // Comentado temporariamente
                /*
                const originalRequest = this.client.httpClient.request;
                const httpClient = this.client.httpClient;

                this.client.httpClient.request = function(rurl, data, callback, exheaders, exoptions) {
                    ...interceptor code...
                };
                */
            }

            // Adicionar listener para capturar XML enviado
            this.client.on('request', (xml, eid) => {
                console.log('[MNI 3.0 EVENT] ========================================');
                console.log('[MNI 3.0 EVENT] XML REALMENTE ENVIADO (via event listener):');
                console.log(xml);
                console.log('[MNI 3.0 EVENT] ========================================');
            });

            if (this.debugMode) {
                console.log('[MNI 3.0] Cliente SOAP inicializado');
                console.log('[MNI 3.0] Endpoint:', this.endpoint);
                console.log('[MNI 3.0] Métodos disponíveis:', Object.keys(this.client).filter(k => typeof this.client[k] === 'function'));
            }

            return this.client;
        } catch (error) {
            console.error('[MNI 3.0] Erro ao inicializar cliente SOAP:', error.message);
            throw new Error(`Falha ao conectar com MNI 3.0: ${error.message}`);
        }
    }

    /**
     * Gera hash SHA256 da senha com data (formato MNI)
     * IMPORTANTE: MNI usa formato DD-MM-YYYYSenha antes de aplicar SHA256
     * ATENÇÃO: MNI 3.0 de Execução Fiscal requer hash em MINÚSCULA
     */
    hashSenha(senha) {
        // Usar o mesmo formato do MNI 2.2 (com data)
        // IMPORTANTE: Retornar em minúscula para MNI 3.0 Exec Fiscal
        return gerarSenhaHashMNI(senha).toLowerCase();
    }

    /**
     * Cria objeto de autenticação simples
     */
    criarAutenticacao(usuario, senha) {
        const senhaHash = this.hashSenha(senha);

        console.log('[MNI 3.0] ========================================');
        console.log('[MNI 3.0] Criando autenticação:');
        console.log('[MNI 3.0] Usuario:', usuario);
        console.log('[MNI 3.0] Senha hasheada (SHA256 com data):', senhaHash);
        console.log('[MNI 3.0] ========================================');

        return {
            autenticacaoSimples: {
                usuario: usuario,
                senha: senhaHash
            }
        };
    }

    /**
     * 1. CONSULTAR LOCALIDADES
     *
     * Retorna todas as localidades (comarcas) de um estado.
     *
     * @param {string} estado - Sigla do estado (ex: "SP")
     * @returns {Array} Lista de localidades com código e descrição
     */
    async consultarLocalidades(estado = 'SP') {
        try {
            await this.initialize();

            const args = {
                estado: estado
            };

            if (this.debugMode) {
                console.log('[MNI 3.0] Consultando localidades para estado:', estado);
            }

            const [result] = await this.client.consultarLocalidadesAsync(args);

            if (this.debugMode) {
                console.log('[MNI 3.0] Localidades retornadas:', result);
            }

            return this.parseLocalidades(result);

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar localidades:', error.message);
            throw new Error(`Erro ao consultar localidades: ${error.message}`);
        }
    }

    /**
     * 2. CONSULTAR COMPETÊNCIAS
     *
     * Retorna competências disponíveis para uma localidade específica.
     *
     * @param {string} codigoLocalidade - Código da localidade (ex: "0350")
     * @returns {Array} Lista de competências disponíveis
     */
    async consultarCompetencias(codigoLocalidade) {
        try {
            await this.initialize();

            const args = {
                codigoLocalidade: codigoLocalidade
            };

            if (this.debugMode) {
                console.log('[MNI 3.0] Consultando competências para localidade:', codigoLocalidade);
            }

            const [result] = await this.client.consultarCompetenciasAsync(args);

            if (this.debugMode) {
                console.log('[MNI 3.0] Competências retornadas:', result);
            }

            return this.parseCompetencias(result);

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar competências:', error.message);
            throw new Error(`Erro ao consultar competências: ${error.message}`);
        }
    }

    /**
     * 3. CONSULTAR CLASSES
     *
     * Retorna classes processuais VÁLIDAS para uma localidade e competência.
     * IMPORTANTE: Este método resolve o problema de "classes complementares"
     * pois retorna apenas as classes que podem ser usadas naquele contexto.
     *
     * @param {string} codigoLocalidade - Código da localidade
     * @param {string} codigoCompetencia - Código da competência (opcional)
     * @returns {Array} Lista de classes válidas para o contexto
     */
    async consultarClasses(codigoLocalidade, codigoCompetencia = null) {
        try {
            await this.initialize();

            const args = {
                codigoLocalidade: codigoLocalidade
            };

            if (codigoCompetencia) {
                args.codigoCompetencia = codigoCompetencia;
            }

            if (this.debugMode) {
                console.log('[MNI 3.0] Consultando classes para:', args);
            }

            const [result] = await this.client.consultarClassesAsync(args);

            if (this.debugMode) {
                console.log('[MNI 3.0] Classes retornadas:', result);
            }

            return this.parseClasses(result);

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar classes:', error.message);
            throw new Error(`Erro ao consultar classes: ${error.message}`);
        }
    }

    /**
     * 4. CONSULTAR ASSUNTOS
     *
     * Retorna assuntos VÁLIDOS para uma classe e localidade.
     * Os assuntos já vêm com indicação de "principal" ou "complementar".
     *
     * @param {string} codigoLocalidade - Código da localidade
     * @param {string} codigoClasse - Código da classe
     * @param {string} codigoCompetencia - Código da competência (opcional)
     * @returns {Array} Lista de assuntos válidos com indicação principal/complementar
     */
    async consultarAssuntos(codigoLocalidade, codigoClasse, codigoCompetencia = null) {
        try {
            await this.initialize();

            const args = {
                codigoLocalidade: codigoLocalidade,
                codigoClasse: codigoClasse
            };

            if (codigoCompetencia) {
                args.codigoCompetencia = codigoCompetencia;
            }

            if (this.debugMode) {
                console.log('[MNI 3.0] Consultando assuntos para:', args);
            }

            const [result] = await this.client.consultarAssuntosAsync(args);

            console.log('[MNI 3.0] Assuntos retornados:', result);
            console.log('[MNI 3.0] result.assuntos type:', typeof result.assuntos);
            console.log('[MNI 3.0] result.assuntos is Array?:', Array.isArray(result.assuntos));
            if (result.assuntos) {
                console.log('[MNI 3.0] result.assuntos length:', Array.isArray(result.assuntos) ? result.assuntos.length : 'not an array');
                console.log('[MNI 3.0] First 3 raw assuntos:', JSON.stringify(Array.isArray(result.assuntos) ? result.assuntos.slice(0, 3) : result.assuntos, null, 2));
            }

            return this.parseAssuntos(result);

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar assuntos:', error.message);
            throw new Error(`Erro ao consultar assuntos: ${error.message}`);
        }
    }

    /**
     * 5. CONSULTAR AVISOS PENDENTES
     *
     * Consulta avisos pendentes para um usuário.
     *
     * @param {string} usuario - CPF/Sigla do usuário
     * @param {string} senha - Senha do usuário (será hasheada)
     * @param {object} options - Opções adicionais (dataInicial, dataFinal, etc.)
     * @returns {object} Lista de avisos pendentes
     */
    async consultarAvisosPendentes(usuario, senha, options = {}) {
        try {
            await this.initialize();

            const args = {
                consultante: this.criarAutenticacao(usuario, senha)
            };

            // Adicionar parâmetros opcionais
            if (options.idRepresentado) args.idRepresentado = options.idRepresentado;
            if (options.dataInicial) args.dataInicial = options.dataInicial;
            if (options.dataFinal) args.dataFinal = options.dataFinal;
            if (options.tipoPendencia) args.tipoPendencia = options.tipoPendencia;
            if (options.tiposAviso) args.tiposAviso = options.tiposAviso;
            if (options.outroParametro) args.outroParametro = options.outroParametro;

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] Usuário:', usuario);
            console.log('[MNI 3.0] Senha hasheada (SHA256 com data):', this.criarAutenticacao(usuario, senha).autenticacaoSimples.senha);
            console.log('[MNI 3.0] Args completo:', JSON.stringify(args, null, 2));
            console.log('[MNI 3.0] ========================================');

            const [result] = await this.client.consultarAvisosPendentesAsync(args);

            // Armazenar XMLs para debug
            this.lastRequestXML = this.client.lastRequest;
            this.lastResponseXML = this.client.lastResponse;

            // Log do XML enviado
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML ENVIADO PARA MNI 3.0:');
            console.log(this.lastRequestXML);
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML RESPOSTA MNI 3.0:');
            console.log(this.lastResponseXML);
            console.log('[MNI 3.0] ========================================');

            if (this.debugMode) {
                console.log('[MNI 3.0] Avisos retornados (JSON):', JSON.stringify(result, null, 2));
            }

            return result;

        } catch (error) {
            // Armazenar XMLs mesmo em caso de erro
            if (this.client) {
                this.lastRequestXML = this.client.lastRequest;
                this.lastResponseXML = this.client.lastResponse;
            }

            console.error('[MNI 3.0] ========================================');
            console.error('[MNI 3.0] ERRO ao consultar avisos pendentes:', error.message);
            console.error('[MNI 3.0] Stack:', error.stack);
            if (this.lastRequestXML) {
                console.error('[MNI 3.0] XML Request que causou erro:');
                console.error(this.lastRequestXML);
            }
            if (this.lastResponseXML) {
                console.error('[MNI 3.0] XML Response:');
                console.error(this.lastResponseXML);
            }
            console.error('[MNI 3.0] ========================================');
            throw new Error(`Erro ao consultar avisos: ${error.message}`);
        }
    }

    /**
     * 6. CONSULTAR PROCESSO
     *
     * Consulta informações detalhadas de um processo.
     *
     * @param {string} usuario - CPF/Sigla do usuário
     * @param {string} senha - Senha do usuário (será hasheada)
     * @param {string} numeroProcesso - Número do processo (20 dígitos)
     * @param {object} options - Opções de inclusão (cabecalho, partes, movimentos, etc.)
     * @returns {object} Dados completos do processo
     */
    async consultarProcesso(usuario, senha, numeroProcesso, options = {}) {
        try {
            await this.initialize();

            const args = {
                consultante: this.criarAutenticacao(usuario, senha),
                numeroProcesso: numeroProcesso
            };

            // Adicionar opções de inclusão
            if (options.dataInicial) args.dataInicial = options.dataInicial;
            if (options.dataFinal) args.dataFinal = options.dataFinal;
            if (options.incluirCabecalho !== undefined) args.incluirCabecalho = options.incluirCabecalho;
            if (options.incluirPartes !== undefined) args.incluirPartes = options.incluirPartes;
            if (options.incluirEnderecos !== undefined) args.incluirEnderecos = options.incluirEnderecos;
            if (options.incluirMovimentos !== undefined) args.incluirMovimentos = options.incluirMovimentos;
            if (options.incluirDocumentos !== undefined) args.incluirDocumentos = options.incluirDocumentos;
            if (options.parametros) args.parametros = options.parametros;

            // SEMPRE fazer log para debug
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] Consultando processo:', numeroProcesso);
            console.log('[MNI 3.0] Usuário:', usuario);
            console.log('[MNI 3.0] Args completo:', JSON.stringify(args, null, 2));
            console.log('[MNI 3.0] ========================================');

            // Obter o XML que será enviado
            const lastRequest = () => this.client.lastRequest;

            const [result] = await this.client.consultarProcessoAsync(args);

            // Armazenar XMLs para debug
            this.lastRequestXML = this.lastRequestXMLModified || this.client.lastRequest;
            this.lastResponseXML = this.client.lastResponse;

            // Log do XML enviado (usar o modificado se disponível)
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML Enviado (com modificações do interceptor):');
            console.log(this.lastRequestXML);
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML Resposta:');
            console.log(this.lastResponseXML);
            console.log('[MNI 3.0] ========================================');

            console.log('[MNI 3.0] Resposta recebida:', JSON.stringify(result, null, 2));

            // IMPORTANTE: Retornar a estrutura RAW do MNI 3.0
            // O frontend renderizarProcesso() já está preparado para lidar com a estrutura raw
            // Não precisamos parsear/transformar a estrutura aqui
            return result;

        } catch (error) {
            // Armazenar XMLs mesmo em caso de erro
            if (this.client) {
                this.lastRequestXML = this.client.lastRequest;
                this.lastResponseXML = this.client.lastResponse;
            }

            console.error('[MNI 3.0] ========================================');
            console.error('[MNI 3.0] ERRO ao consultar processo:', error.message);
            console.error('[MNI 3.0] Stack:', error.stack);
            if (this.lastRequestXML) {
                console.error('[MNI 3.0] XML Request que causou erro:');
                console.error(this.lastRequestXML);
            }
            if (this.lastResponseXML) {
                console.error('[MNI 3.0] XML Response:');
                console.error(this.lastResponseXML);
            }
            console.error('[MNI 3.0] ========================================');
            throw new Error(`Erro ao consultar processo: ${error.message}`);
        }
    }

    /**
     * Retorna os XMLs da última requisição (para debug)
     */
    getLastXMLs() {
        return {
            request: this.lastRequestXML,
            response: this.lastResponseXML
        };
    }

    // ========================================
    // MÉTODOS DE PARSE
    // ========================================

    /**
     * Parse de localidades
     */
    parseLocalidades(result) {
        try {
            if (!result || !result.localidades) {
                console.warn('[MNI 3.0] Resultado de localidades vazio ou inválido');
                return [];
            }

            const localidades = Array.isArray(result.localidades)
                ? result.localidades
                : [result.localidades];

            return localidades.map(loc => ({
                codigo: loc.codigo || loc.codigoLocalidade,
                descricao: loc.descricao || loc.nome,
                estado: loc.estado || 'SP',
                ...loc
            }));

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear localidades:', error);
            return result;
        }
    }

    /**
     * Parse de competências
     */
    parseCompetencias(result) {
        try {
            if (!result || !result.competencias) {
                console.warn('[MNI 3.0] Resultado de competências vazio ou inválido');
                return [];
            }

            const competencias = Array.isArray(result.competencias)
                ? result.competencias
                : [result.competencias];

            return competencias.map(comp => ({
                codigo: comp.codigo,
                descricao: comp.descricao,
                ...comp
            }));

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear competências:', error);
            return result;
        }
    }

    /**
     * Parse de classes
     *
     * IMPORTANTE: MNI 3.0 retorna apenas CÓDIGOS, não descrições!
     * Formato: <ns2:codigosClasse>7</ns2:codigosClasse>
     */
    parseClasses(result) {
        try {
            // MNI 3.0 retorna apenas códigos no campo "codigosClasse"
            if (!result || !result.codigosClasse) {
                console.warn('[MNI 3.0] Nenhum código de classe retornado');
                return [];
            }

            // Pode vir como array ou valor único
            const codigos = Array.isArray(result.codigosClasse)
                ? result.codigosClasse
                : [result.codigosClasse];

            if (this.debugMode) {
                console.log(`[MNI 3.0] ${codigos.length} códigos de classe retornados:`, codigos);
            }

            // Retornar apenas os códigos
            // A descrição será buscada do MNI 2.2 na camada de rota
            return codigos.map(codigo => ({
                codigo: codigo.toString(),
                // Descrição será preenchida pela rota usando MNI 2.2
                permitePeticionamentoInicial: true
            }));

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear classes:', error);
            return [];
        }
    }

    /**
     * Parse de assuntos
     */
    parseAssuntos(result) {
        try {
            console.log('[DEBUG parseAssuntos] ========================================');
            console.log('[DEBUG parseAssuntos] RECEBIDO result:', JSON.stringify(result, null, 2).substring(0, 2000));
            console.log('[DEBUG parseAssuntos] ========================================');
            
            if (!result || !result.assuntos) {
                console.warn('[MNI 3.0] Resultado de assuntos vazio ou inválido');
                return [];
            }

            console.log('[DEBUG parseAssuntos] result.assuntos é array?', Array.isArray(result.assuntos));
            console.log('[DEBUG parseAssuntos] Tipo de result.assuntos:', typeof result.assuntos);
            
            // Normalizar para array (mas nunca embrulhar array em array)
            let assuntos;
            if (Array.isArray(result.assuntos)) {
                assuntos = result.assuntos;
            } else if (result.assuntos && typeof result.assuntos === 'object') {
                // Se é um objeto único, colocar em array
                assuntos = [result.assuntos];
            } else {
                console.warn('[MNI 3.0] result.assuntos não é array nem objeto:', result.assuntos);
                return [];
            }
            
            console.log('[DEBUG parseAssuntos] assuntos após normalização:', assuntos.length, 'itens');

            // Log para debug - estrutura completa
            if (assuntos.length > 0) {
                console.log('[DEBUG parseAssuntos] Total de assuntos recebidos:', assuntos.length);
                console.log('[DEBUG parseAssuntos] Primeiro assunto (completo):', JSON.stringify(assuntos[0], null, 2));
                console.log('[DEBUG parseAssuntos] Chaves do primeiro assunto:', Object.keys(assuntos[0]));
            }

            const parsedAssuntos = assuntos.map((assunto, index) => {
                // IMPORTANTE: A resposta MNI 3.0 vem com estrutura:
                // { attributes: { principal: "S" }, codigoNacional: "4939" }
                // Ou seja, codigoNacional vem direto no objeto, mas principal vem em attributes
                
                const attrs = assunto.attributes || assunto.$ || assunto.$attributes || {};
                
                // O código SEMPRE vem em codigoNacional na raiz do objeto
                // Extrair de múltiplas possíveis localizações
                let codigo = '';
                if (assunto.codigoNacional) {
                    codigo = assunto.codigoNacional;
                } else if (assunto.codigo) {
                    codigo = assunto.codigo;
                } else if (attrs.codigoNacional) {
                    codigo = attrs.codigoNacional;
                } else if (attrs.codigo) {
                    codigo = attrs.codigo;
                }
                
                // Log se não encontrou código (para debug)
                if (!codigo) {
                    console.warn('[MNI 3.0] Assunto sem código na posição', index, ':', JSON.stringify(assunto));
                }
                
                // O flag principal vem em attributes.principal
                // Aceitar: "S", "true", true, "True", "TRUE"
                const principalStr = String(attrs.principal || assunto.principal || 'false').toLowerCase();
                const principal = principalStr === 's' || principalStr === 'true';
                
                return {
                    codigo: String(codigo),
                    codigoNacional: String(codigo),  // Manter ambos para compatibilidade
                    descricao: assunto.descricao || attrs.descricao || `Assunto ${codigo}`,
                    principal: principal,
                    ativo: assunto.ativo !== 'N' && attrs.ativo !== 'N'
                };
            });

            console.log('[DEBUG parseAssuntos] ========================================');
            console.log('[DEBUG parseAssuntos] RETORNANDO:', parsedAssuntos.length, 'assuntos');
            console.log('[DEBUG parseAssuntos] Primeiros 3 após parse:', JSON.stringify(parsedAssuntos.slice(0, 3), null, 2));
            
            // Verificar se há assuntos com código vazio
            const semCodigo = parsedAssuntos.filter(a => !a.codigo || a.codigo === '');
            if (semCodigo.length > 0) {
                console.error('[DEBUG parseAssuntos] ATENÇÃO:', semCodigo.length, 'assuntos sem código!');
                console.error('[DEBUG parseAssuntos] Primeiros 3 sem código:', JSON.stringify(semCodigo.slice(0, 3), null, 2));
            }
            
            console.log('[DEBUG parseAssuntos] ========================================');
            
            return parsedAssuntos;

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear assuntos:', error);
            console.error('[MNI 3.0] Stack trace:', error.stack);
            // IMPORTANTE: Retornar array vazio em caso de erro, não o objeto result
            // Retornar result causaria erro pois o código espera um array
            return [];
        }
    }

    /**
     * CONSULTAR TEOR DA COMUNICAÇÃO
     *
     * Consulta o teor (conteúdo) de uma comunicação específica de um processo.
     * IMPORTANTE: MNI 3.0 requer apenas numeroProcesso (sem identificadorMovimento)
     *
     * @param {string} usuario - CPF/Sigla do usuário
     * @param {string} senha - Senha do usuário (será hasheada)
     * @param {string} numeroProcesso - Número do processo (20 dígitos)
     * @param {string} identificadorMovimento - Identificador do movimento (IGNORADO no MNI 3.0)
     * @returns {Object} Teor da comunicação
     */
    async consultarTeorComunicacao(usuario, senha, numeroProcesso, identificadorMovimento) {
        try {
            await this.initialize();

            // MNI 3.0 não usa identificadorMovimento na requisição consultarTeorComunicacao
            // Apenas consultante e numeroProcesso são necessários
            const args = {
                consultante: this.criarAutenticacao(usuario, senha),
                numeroProcesso: numeroProcesso
            };

            if (this.debugMode) {
                console.log('[MNI 3.0] ========================================');
                console.log('[MNI 3.0] Consultando teor da comunicação');
                console.log('[MNI 3.0] Número do processo:', numeroProcesso);
                console.log('[MNI 3.0] Args:', JSON.stringify(args, null, 2));
                console.log('[MNI 3.0] ========================================');
            }

            const [result] = await this.client.consultarTeorComunicacaoAsync(args);

            if (this.debugMode) {
                console.log('[MNI 3.0] ========================================');
                console.log('[MNI 3.0] Teor retornado (bruto):', JSON.stringify(result, null, 2));
                console.log('[MNI 3.0] ========================================');
            }

            return this.parseTeorComunicacao(result);

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar teor:', error.message);
            throw new Error(`Erro ao consultar teor da comunicação: ${error.message}`);
        }
    }

    /**
     * Parse do teor da comunicação MNI 3.0
     *
     * Estrutura esperada:
     * {
     *   recibo: { sucesso: true/false, mensagens: [...] },
     *   comunicacoes: [
     *     {
     *       id, processo, destinatario, remetente,
     *       tipoComunicacao, tipoPrazo, dataReferencia,
     *       prazo, teor, nivelSigilo
     *     }
     *   ]
     * }
     */
    parseTeorComunicacao(result) {
        try {
            // Verificar recibo
            const recibo = result.recibo || {};
            const sucesso = recibo.sucesso;

            if (!sucesso) {
                const mensagens = recibo.mensagens || [];
                const mensagemErro = Array.isArray(mensagens) && mensagens.length > 0
                    ? mensagens[0].descritivo
                    : 'Erro ao consultar teor da comunicação';
                throw new Error(mensagemErro);
            }

            // Extrair comunicações
            let comunicacoes = result.comunicacoes || [];

            // Se comunicacoes for um objeto único, transformar em array
            if (!Array.isArray(comunicacoes)) {
                comunicacoes = [comunicacoes];
            }

            // Retornar estrutura parseada
            return {
                sucesso: true,
                recibo: recibo,
                comunicacoes: comunicacoes.map(com => {
                    // Calcular inicioPrazo e finalPrazo se prazo existir
                    const prazosCalculados = this.calcularPrazos(
                        com.dataReferencia,
                        com.prazo,
                        com.tipoPrazo
                    );

                    return {
                        id: com.id || '',
                        numeroProcesso: com.processo?.numero || '',
                        classeProcessual: com.processo?.classeProcessual || '',
                        orgaoJulgador: com.processo?.orgaoJulgador?.nome || '',
                        codigoOrgao: com.processo?.orgaoJulgador?.codigo || '',
                        destinatario: com.destinatario?.nome || '',
                        documentoDestinatario: com.destinatario?.numeroDocumentoPrincipal || '',
                        remetente: com.remetente?.nome || '',
                        codigoRemetente: com.remetente?.codigo || '',
                        tipoComunicacao: com.tipoComunicacao || '',
                        tipoPrazo: com.tipoPrazo || null,
                        dataReferencia: com.dataReferencia || '',
                        prazo: com.prazo || null,
                        teor: com.teor || '',
                        nivelSigilo: com.nivelSigilo || '0',
                        // Adicionar campos calculados
                        ...prazosCalculados
                    };
                })
            };

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear teor:', error);
            return result; // Retornar bruto em caso de erro
        }
    }

    /**
     * Calcular inicioPrazo e finalPrazo baseado na dataReferencia e prazo
     * MNI 3.0 não retorna esses campos, precisamos calcular
     *
     * @param {string} dataReferencia - Data de referência (formato ISO ou AAAAMMDDHHMMSS)
     * @param {number} prazo - Número de dias do prazo
     * @param {string} tipoPrazo - Tipo do prazo (DATA_CERTA, etc)
     * @returns {object} { inicioPrazo, finalPrazo } em formato AAAAMMDDHHMMSS
     */
    calcularPrazos(dataReferencia, prazo, tipoPrazo) {
        if (!dataReferencia || !prazo) {
            return {};
        }

        try {
            // Converter dataReferencia para Date
            let dataInicio;
            if (dataReferencia.includes('T')) {
                // Formato ISO
                dataInicio = new Date(dataReferencia);
            } else if (dataReferencia.length >= 14) {
                // Formato AAAAMMDDHHMMSS
                const ano = dataReferencia.substring(0, 4);
                const mes = parseInt(dataReferencia.substring(4, 6)) - 1;
                const dia = dataReferencia.substring(6, 8);
                const hora = dataReferencia.substring(8, 10);
                const minuto = dataReferencia.substring(10, 12);
                const segundo = dataReferencia.substring(12, 14);
                dataInicio = new Date(ano, mes, dia, hora, minuto, segundo);
            } else {
                return {};
            }

            // Início do prazo: dia seguinte à data de referência às 00:00:00
            const inicioPrazoDate = new Date(dataInicio);
            inicioPrazoDate.setDate(inicioPrazoDate.getDate() + 1);
            inicioPrazoDate.setHours(0, 0, 0, 0);

            // Final do prazo: inicioPrazo + prazo dias às 23:59:59
            const finalPrazoDate = new Date(inicioPrazoDate);
            finalPrazoDate.setDate(finalPrazoDate.getDate() + prazo);
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

            return {
                inicioPrazo: formatarData(inicioPrazoDate),
                finalPrazo: formatarData(finalPrazoDate)
            };

        } catch (error) {
            console.error('[MNI 3.0] Erro ao calcular prazos:', error);
            return {};
        }
    }

    /**
     * Parse da resposta de consultarProcesso do MNI 3.0
     *
     * Estrutura esperada:
     * {
     *   recibo: { sucesso, mensagens },
     *   processo: {
     *     dadosBasicos: {
     *       dadosBasicos: { numero, classeProcessual, orgaoJulgador },
     *       polo: [ { parte, ... } ],
     *       assunto: [ { codigoNacional } ],
     *       outroParametro: [ { nome, valor } ]
     *     },
     *     movimento: [ { dataHora, movimentoLocal, ... } ],
     *     documento: [ { idDocumento, descricao, ... } ]
     *   }
     * }
     */
    parseProcesso(result) {
        // NOTA: Esta função não está sendo usada atualmente
        // O frontend renderizarProcesso() espera a estrutura RAW do MNI
        // Mantida para referência futura se precisar de parsing customizado

        try {
            // Verificar recibo
            const recibo = result.recibo || {};
            const sucesso = recibo.sucesso;

            if (!sucesso) {
                const mensagens = recibo.mensagens || [];
                const mensagemErro = Array.isArray(mensagens) && mensagens.length > 0
                    ? mensagens[0].descritivo
                    : 'Erro ao consultar processo';
                console.error('[MNI 3.0] Erro ao consultar processo:', mensagemErro);
                return result; // Retornar bruto para que a rota trate
            }

            // Extrair processo
            const processo = result.processo || {};
            const dadosBasicos = processo.dadosBasicos || {};

            // Normalizar estrutura
            const processoParsed = {
                recibo: recibo,
                processo: {
                    // Dados básicos
                    numero: dadosBasicos.dadosBasicos?.numero || '',
                    classeProcessual: dadosBasicos.classeProcessual || '',
                    competencia: dadosBasicos.competencia || '',
                    nivelSigilo: dadosBasicos.nivelSigilo || '0',
                    intervencaoMP: dadosBasicos.intervencaoMP || false,
                    tamanhoProcesso: dadosBasicos.tamanhoProcesso || 0,
                    dataAjuizamento: dadosBasicos.dataAjuizamento || '',
                    valorCausa: dadosBasicos.valorCausa || 0,
                    processoFisico: dadosBasicos.processoFisico || false,

                    // Órgão julgador
                    orgaoJulgador: {
                        codigo: dadosBasicos.dadosBasicos?.orgaoJulgador?.codigo ||
                                dadosBasicos.orgaoJulgador?.codigo || '',
                        nome: dadosBasicos.dadosBasicos?.orgaoJulgador?.nome ||
                              dadosBasicos.orgaoJulgador?.nome || '',
                        instancia: dadosBasicos.dadosBasicos?.orgaoJulgador?.instancia ||
                                  dadosBasicos.orgaoJulgador?.instancia || ''
                    },

                    // Polos (partes)
                    polos: this.parsePolos(dadosBasicos.polo),

                    // Assuntos
                    assuntos: this.parseAssuntosProcesso(dadosBasicos.assunto),

                    // Outros parâmetros
                    outrosParametros: this.parseOutrosParametros(dadosBasicos.outroParametro),

                    // Movimentos
                    movimentos: this.parseMovimentos(processo.movimento),

                    // Documentos
                    documentos: this.parseDocumentos(processo.documento)
                }
            };

            return processoParsed;

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear processo:', error.message);
            return result; // Retornar bruto em caso de erro
        }
    }

    /**
     * Parse dos polos do processo
     */
    parsePolos(polos) {
        if (!polos) return [];

        const polosArray = Array.isArray(polos) ? polos : [polos];

        return polosArray.map(polo => ({
            tipo: polo.$attributes?.polo || polo.attributes?.polo || '',
            partes: this.parsePartes(polo.parte)
        }));
    }

    /**
     * Parse das partes de um polo
     */
    parsePartes(partes) {
        if (!partes) return [];

        const partesArray = Array.isArray(partes) ? partes : [partes];

        return partesArray.map(parte => ({
            nome: parte.pessoa?.dadosBasicos?.nome || '',
            qualificacaoPessoa: parte.pessoa?.qualificacaoPessoa || '',
            numeroDocumento: parte.pessoa?.numeroDocumentoPrincipal || '',
            relacionamento: parte.relacionamentoProcessual || '',
            situacao: parte.situacao || ''
        }));
    }

    /**
     * Parse dos assuntos do processo
     */
    parseAssuntosProcesso(assuntos) {
        if (!assuntos) return [];

        const assuntosArray = Array.isArray(assuntos) ? assuntos : [assuntos];

        return assuntosArray.map(assunto => ({
            codigo: assunto.codigoNacional || '',
            principal: assunto.$attributes?.principal === 'true' ||
                      assunto.attributes?.principal === 'true'
        }));
    }

    /**
     * Parse dos outros parâmetros
     */
    parseOutrosParametros(parametros) {
        if (!parametros) return {};

        const parametrosArray = Array.isArray(parametros) ? parametros : [parametros];
        const resultado = {};

        parametrosArray.forEach(param => {
            const nome = param.$attributes?.nome || param.attributes?.nome || param.nome;
            const valor = param.$attributes?.valor || param.attributes?.valor || param.valor;
            if (nome) {
                resultado[nome] = valor || '';
            }
        });

        return resultado;
    }

    /**
     * Parse dos movimentos do processo
     */
    parseMovimentos(movimentos) {
        if (!movimentos) return [];

        const movimentosArray = Array.isArray(movimentos) ? movimentos : [movimentos];

        return movimentosArray.map(mov => ({
            idMovimento: mov.$attributes?.idMovimento || mov.attributes?.idMovimento || '',
            dataHora: mov.$attributes?.dataHora || mov.attributes?.dataHora || '',
            complemento: mov.complemento || '',
            descricao: mov.movimentoLocal?.descricao ||
                      mov.movimentoLocal?.$attributes?.descricao ||
                      mov.movimentoLocal?.attributes?.descricao || '',
            codigoMovimento: mov.movimentoLocal?.codigoMovimento ||
                            mov.movimentoLocal?.$attributes?.codigoMovimento ||
                            mov.movimentoLocal?.attributes?.codigoMovimento || '',
            documentosVinculados: Array.isArray(mov.idDocumentoVinculado) ?
                                 mov.idDocumentoVinculado :
                                 (mov.idDocumentoVinculado ? [mov.idDocumentoVinculado] : [])
        }));
    }

    /**
     * Parse dos documentos do processo
     */
    parseDocumentos(documentos) {
        if (!documentos) return [];

        const documentosArray = Array.isArray(documentos) ? documentos : [documentos];

        return documentosArray.map(doc => ({
            idDocumento: doc.idDocumento || '',
            codigoTipo: doc.codigoTipoDocumento || '',
            descricao: doc.descricao || '',
            dataHora: doc.dataHora || '',
            nivelSigilo: doc.nivelSigilo || '0',
            idMovimento: doc.idMovimento || '',
            tamanho: doc.tamanhoConteudo || 0,
            mimetype: doc.conteudo?.mimetype || '',
            hash: doc.conteudo?.hash?.hash || ''
        }));
    }

    /**
     * CONSULTAR CONTEÚDO DE DOCUMENTO
     *
     * MNI 3.0 tem operação ESPECÍFICA para obter conteúdo de documentos:
     * consultarDocumentosProcesso (não consultarProcesso!)
     *
     * Esta operação retorna o conteúdo dos documentos via XOP/MTOM attachments.
     *
     * IMPORTANTE: Esta função FAZ A REQUISIÇÃO SOAP MANUALMENTE
     * porque o node-soap não gera os namespaces corretos que o servidor exige.
     *
     * @param {string} usuario - CPF/Sigla do usuário
     * @param {string} senha - Senha do usuário (será hasheada)
     * @param {string} numeroProcesso - Número do processo (20 dígitos)
     * @param {string} idDocumento - ID do documento a ser recuperado
     * @returns {Object} { conteudo: base64String, mimetype: string }
     */
    async consultarConteudoDocumento(usuario, senha, numeroProcesso, idDocumento) {
        try {
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] Consultando CONTEÚDO via consultarDocumentosProcesso (MANUAL)');
            console.log('[MNI 3.0] Documento:', idDocumento);
            console.log('[MNI 3.0] Processo:', numeroProcesso);
            console.log('[MNI 3.0] ========================================');

            // Gerar hash da senha
            const senhaHash = this.hashSenha(senha);

            // Construir XML SOAP manualmente com namespaces corretos
            const soapXML = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v300="http://www.cnj.jus.br/mni/v300/" xmlns:tip="http://www.cnj.jus.br/mni/v300/tipos-servico-intercomunicacao" xmlns:int="http://www.cnj.jus.br/mni/v300/intercomunicacao">
   <soapenv:Header/>
   <soapenv:Body>
      <v300:requisicaoConsultarDocumentosProcesso>
         <tip:consultante>
            <int:autenticacaoSimples>
               <int:usuario>${usuario}</int:usuario>
               <int:senha>${senhaHash}</int:senha>
            </int:autenticacaoSimples>
         </tip:consultante>
         <tip:numeroProcesso>${numeroProcesso}</tip:numeroProcesso>
         <tip:idDocumento>${idDocumento}</tip:idDocumento>
      </v300:requisicaoConsultarDocumentosProcesso>
   </soapenv:Body>
</soapenv:Envelope>`;

            console.log('[MNI 3.0] XML SOAP Manual:');
            console.log(soapXML);

            // Fazer requisição HTTP direta
            const https = require('https');
            const { URL } = require('url');

            const url = new URL(this.endpoint);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(soapXML),
                    'SOAPAction': '',
                    'User-Agent': 'MNI-WebApp/3.0 (Node.js)'
                }
            };

            // Fazer requisição (capturar como Buffer para processar MTOM)
            const { responseData, contentType } = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    const chunks = [];
                    res.on('data', (chunk) => { chunks.push(chunk); });
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const contentType = res.headers['content-type'] || '';
                        resolve({ responseData: buffer, contentType });
                    });
                });
                req.on('error', reject);
                req.write(soapXML);
                req.end();
            });

            console.log('[MNI 3.0] Content-Type da resposta:', contentType);

            let responseXML;
            let mtomAttachments = null;

            // Verificar se é multipart/related (MTOM)
            if (contentType.includes('multipart/related')) {
                console.log('[MNI 3.0] Resposta é MTOM (multipart/related), processando...');

                // Extrair boundary
                const boundaryMatch = contentType.match(/boundary="?([^";,]+)"?/);
                if (!boundaryMatch) {
                    throw new Error('Boundary não encontrado no Content-Type MTOM');
                }
                const boundary = boundaryMatch[1];
                console.log('[MNI 3.0] Boundary:', boundary);

                // Dividir partes do multipart
                const parts = responseData.toString('binary').split(`--${boundary}`);
                console.log('[MNI 3.0] Total de partes no multipart:', parts.length);

                // Primeira parte (após o boundary inicial) é o XML SOAP
                for (let i = 1; i < parts.length - 1; i++) {
                    const part = parts[i];

                    // Dividir headers do conteúdo
                    const headerEndIndex = part.indexOf('\r\n\r\n');
                    if (headerEndIndex === -1) continue;

                    const headers = part.substring(0, headerEndIndex);
                    const content = part.substring(headerEndIndex + 4);

                    // Primeira parte é o XML
                    if (i === 1) {
                        responseXML = content.trim();
                    } else {
                        // Partes subsequentes são attachments
                        // Extrair Content-ID
                        const cidMatch = headers.match(/Content-ID:\s*<([^>]+)>/i);
                        if (cidMatch) {
                            if (!mtomAttachments) mtomAttachments = [];
                            mtomAttachments.push({
                                contentId: cidMatch[1],
                                content: content
                            });
                            console.log('[MNI 3.0] Attachment encontrado - CID:', cidMatch[1], 'Tamanho:', content.length);
                        }
                    }
                }
            } else {
                // Resposta simples (apenas XML)
                responseXML = responseData.toString('utf-8');
            }

            console.log('[MNI 3.0] XML Response Manual:');
            console.log(responseXML.substring(0, 1000)); // Primeiros 1000 chars

            // Parsear resposta XML
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
            const parsedResponse = await parser.parseStringPromise(responseXML);

            // Armazenar XMLs para debug
            this.lastRequestXML = soapXML;
            this.lastResponseXML = responseXML;

            console.log('[MNI 3.0] Resposta parseada:', JSON.stringify(parsedResponse, null, 2));

            // Extrair resultado
            const envelope = parsedResponse.Envelope;
            const body = envelope.Body;
            const response = body.respostaConsultarDocumentosProcesso;
            const result = {
                recibo: response.recibo,
                documentos: response.documentos,
                mtomAttachments: mtomAttachments // Adicionar attachments processados
            };

            // Verificar sucesso
            const recibo = result.recibo || {};
            const sucesso = recibo.sucesso === true || recibo.sucesso === 'true';

            if (!sucesso) {
                const mensagens = recibo.mensagens || [];
                const mensagemErro = Array.isArray(mensagens) && mensagens.length > 0
                    ? mensagens[0].descritivo
                    : 'Erro ao consultar documento';
                throw new Error(mensagemErro);
            }

            // Extrair documentos da resposta
            // Pode vir como array ou objeto único
            const documentos = result.documentos
                ? (Array.isArray(result.documentos) ? result.documentos : [result.documentos])
                : [];

            console.log('[MNI 3.0] Total de documentos retornados:', documentos.length);

            if (documentos.length === 0) {
                throw new Error('Nenhum documento retornado na resposta');
            }

            // Pegar o primeiro documento (já que pedimos apenas um)
            const doc = documentos[0];

            console.log('[MNI 3.0] Documento recebido:', {
                idDocumento: doc.idDocumento,
                mimetype: doc.mimetype,
                temConteudo: !!doc.conteudo
            });

            // Extrair conteúdo usando a função especializada
            // Aqui o conteúdo VEM como XOP attachment
            const conteudoBase64 = this.extrairConteudoDocumento(doc, result);

            // Mimetype
            const mimetype = doc.mimetype || 'application/pdf';

            console.log('[MNI 3.0] Mimetype:', mimetype);
            console.log('[MNI 3.0] Tamanho do conteúdo base64:', conteudoBase64.length);

            if (!conteudoBase64 || conteudoBase64.length === 0) {
                console.error('[MNI 3.0] ERRO: Conteúdo do documento está vazio');
                console.error('[MNI 3.0] Estrutura do doc:', JSON.stringify(doc, null, 2));
                console.error('[MNI 3.0] Attachments disponíveis:', !!this.client.lastResponseAttachments);
                throw new Error('Conteúdo do documento está vazio');
            }

            return {
                conteudo: conteudoBase64,
                mimetype: mimetype
            };

        } catch (error) {
            console.error('[MNI 3.0] ========================================');
            console.error('[MNI 3.0] ERRO ao consultar documento:', error.message);
            console.error('[MNI 3.0] Stack:', error.stack);
            console.error('[MNI 3.0] ========================================');
            throw new Error(`Erro ao consultar documento: ${error.message}`);
        }
    }

    /**
     * Extrai conteúdo de documento de várias possíveis localizações
     * Suporta: inline base64, XOP Include references, MTOM attachments
     *
     * Baseado na implementação do MNI 2.2
     */
    extrairConteudoDocumento(doc, result) {
        console.log('[MNI 3.0] Extraindo conteúdo do documento...');
        console.log('[MNI 3.0] Estrutura doc.conteudo:', JSON.stringify(doc.conteudo, null, 2));

        // 1. Verificar se é uma referência XOP Include
        // Formato: <xop:Include href="cid:urn:uuid:..."/>
        if (doc.conteudo && typeof doc.conteudo === 'object') {
            console.log('[MNI 3.0] Verificando referência XOP Include...');

            // XOP Include pode estar em diferentes propriedades
            const xopInclude = doc.conteudo.Include || doc.conteudo.include || doc.conteudo.xopInclude;

            if (xopInclude) {
                console.log('[MNI 3.0] Referência XOP encontrada:', xopInclude);

                // Extrair o CID (Content-ID) da referência
                let cid = null;
                if (typeof xopInclude === 'string') {
                    cid = xopInclude;
                } else if (xopInclude.href) {
                    // Caso mais comum: xopInclude.href contém a string
                    cid = xopInclude.href;
                } else if (xopInclude.$ && typeof xopInclude.$ === 'object' && xopInclude.$.href) {
                    // xml2js parser: xopInclude.$ é um objeto de atributos
                    cid = xopInclude.$.href;
                } else if (xopInclude.attributes && xopInclude.attributes.href) {
                    // Alternativa: attributes.href
                    cid = xopInclude.attributes.href;
                }

                if (cid && typeof cid === 'string') {
                    console.log('[MNI 3.0] CID extraído:', cid);

                    // Extrair de attachments usando o CID
                    const attachments = result.mtomAttachments || (this.client && this.client.lastResponseAttachments);
                    if (attachments) {
                        console.log('[MNI 3.0] Buscando attachment com CID:', cid);
                        return this.extrairDeAttachmentsPorCID(attachments, cid);
                    }
                } else {
                    console.warn('[MNI 3.0] CID não é uma string válida:', cid);
                }
            }
        }

        // 2. Tentar pegar do campo conteudo direto (inline base64)
        if (doc.conteudo) {
            console.log('[MNI 3.0] Tentando extrair conteúdo inline...');

            if (typeof doc.conteudo === 'string') {
                console.log('[MNI 3.0] Conteúdo é string direta');
                return doc.conteudo;
            }

            if (typeof doc.conteudo === 'object') {
                // Tentar várias propriedades conhecidas do node-soap
                const conteudo = doc.conteudo.$value || doc.conteudo._ || doc.conteudo.value || '';
                if (conteudo && typeof conteudo === 'string' && conteudo.length > 50) {
                    console.log('[MNI 3.0] Conteúdo extraído de propriedade especial');
                    return conteudo;
                }

                // Procurar primeira string longa nos valores
                const valores = Object.values(doc.conteudo);
                const primeiraString = valores.find(v => typeof v === 'string' && v.length > 50);
                if (primeiraString) {
                    console.log('[MNI 3.0] Conteúdo encontrado como string longa no objeto');
                    return primeiraString;
                }
            }
        }

        // 3. Tentar outras localizações no documento
        console.log('[MNI 3.0] Tentando outras localizações...');
        const conteudoDocumento = doc.$value || doc._ || doc.value || doc.text;
        if (conteudoDocumento && typeof conteudoDocumento === 'string' && conteudoDocumento.length > 50) {
            console.log('[MNI 3.0] Conteúdo encontrado em localização alternativa');
            return conteudoDocumento;
        }

        // 4. Extrair de attachments MTOM/XOP (sem CID específico, pegar primeiro)
        console.log('[MNI 3.0] Tentando extrair primeiro attachment disponível...');
        const attachments = result.mtomAttachments || (this.client && this.client.lastResponseAttachments);
        if (attachments) {
            console.log('[MNI 3.0] Attachments encontrados, processando...');
            return this.extrairDeAttachments(attachments);
        }

        console.warn('[MNI 3.0] Nenhum conteúdo encontrado');
        return '';
    }

    /**
     * Extrai attachment específico usando Content-ID (CID)
     */
    extrairDeAttachmentsPorCID(attachments, cid) {
        console.log('[MNI 3.0] Procurando attachment com CID:', cid);

        if (!attachments) {
            console.warn('[MNI 3.0] Nenhum attachment disponível');
            return '';
        }

        // Validar que cid é uma string
        if (typeof cid !== 'string') {
            console.error('[MNI 3.0] CID não é uma string:', typeof cid, cid);
            console.warn('[MNI 3.0] Tentando extrair primeiro attachment disponível como fallback');
            return this.extrairDeAttachments(attachments);
        }

        // Limpar o CID (remover "cid:" se houver)
        const cidLimpo = cid.replace(/^cid:/, '').trim();
        console.log('[MNI 3.0] CID limpo:', cidLimpo);

        // Formato 1: Array de attachments (processados manualmente do MTOM)
        if (Array.isArray(attachments)) {
            console.log('[MNI 3.0] Attachments é array, total:', attachments.length);
            for (const att of attachments) {
                const attCid = (att.contentId || att.cid || '').replace(/^<|>$/g, '').trim();
                console.log('[MNI 3.0] Comparando com attachment CID:', attCid);
                if (attCid === cidLimpo || attCid === cid) {
                    console.log('[MNI 3.0] Attachment encontrado!');
                    // Se tiver propriedade content (MTOM manual), retornar diretamente como base64
                    if (att.content) {
                        console.log('[MNI 3.0] Convertendo content binário para base64');
                        return Buffer.from(att.content, 'binary').toString('base64');
                    }
                    return this.extrairDeAttachment(att);
                }
            }
        }

        // Formato 2: Objeto com propriedade 'parts' (node-soap)
        if (attachments.parts && Array.isArray(attachments.parts)) {
            console.log('[MNI 3.0] Attachments.parts é array, total:', attachments.parts.length);
            for (const att of attachments.parts) {
                const attCid = (att.contentId || att.cid || '').replace(/^<|>$/g, '').trim();
                console.log('[MNI 3.0] Comparando com part CID:', attCid);
                if (attCid === cidLimpo || attCid === cid) {
                    console.log('[MNI 3.0] Part encontrado!');
                    return this.extrairDeAttachment(att);
                }
            }
        }

        console.warn('[MNI 3.0] Attachment com CID não encontrado, usando primeiro disponível');
        return this.extrairDeAttachments(attachments);
    }

    /**
     * Extrai conteúdo de attachments MTOM em diferentes formatos
     */
    extrairDeAttachments(attachments) {
        // Formato 1: Array de attachments
        if (Array.isArray(attachments) && attachments.length > 0) {
            console.log('[MNI 3.0] Processando array de attachments, total:', attachments.length);
            return this.extrairDeAttachment(attachments[0]);
        }

        // Formato 2: Objeto com propriedade 'parts'
        if (attachments.parts && Array.isArray(attachments.parts) && attachments.parts.length > 0) {
            console.log('[MNI 3.0] Processando attachments.parts, total:', attachments.parts.length);
            return this.extrairDeAttachment(attachments.parts[0]);
        }

        // Formato 3: Objeto único (attachment direto)
        console.log('[MNI 3.0] Processando attachment único');
        return this.extrairDeAttachment(attachments);
    }

    /**
     * Extrai conteúdo de um attachment individual
     * Converte Buffer para base64 se necessário
     */
    extrairDeAttachment(attachment) {
        if (!attachment) {
            console.warn('[MNI 3.0] Attachment vazio');
            return '';
        }

        // Tentar body primeiro
        if (attachment.body) {
            console.log('[MNI 3.0] Extraindo de attachment.body');
            return Buffer.isBuffer(attachment.body)
                ? attachment.body.toString('base64')
                : attachment.body;
        }

        // Alternativa: campo data
        if (attachment.data) {
            console.log('[MNI 3.0] Extraindo de attachment.data');
            return Buffer.isBuffer(attachment.data)
                ? attachment.data.toString('base64')
                : attachment.data;
        }

        console.warn('[MNI 3.0] Attachment sem body ou data');
        return '';
    }

    /**
     * ENTREGAR PETIÇÃO (Peticionamento Intermediário)
     *
     * Realiza peticionamento intermediário em processo existente.
     * No MNI 3.0, usa a operação "entregarPeticao" (não "entregarManifestacao").
     *
     * IMPORTANTE: Diferenças entre MNI 2.2 e 3.0:
     * - MNI 2.2: entregarManifestacaoProcessual
     * - MNI 3.0: entregarPeticao (requisicaoEntregarPeticao)
     * - MNI 3.0: conteúdo deve ser SHA-256 do documento (não base64 direto)
     * - MNI 3.0: estrutura de namespaces diferente
     *
     * Baseado no exemplo do ambiente Execução Fiscal (pergunta.txt).
     *
     * @param {string} usuario - CPF/Sigla do usuário (manifestante)
     * @param {string} senha - Senha do usuário (será hasheada)
     * @param {string} numeroProcesso - Número do processo (20 dígitos)
     * @param {object} peticao - Dados da petição
     * @param {string} peticao.codigoTipoDocumento - Código do tipo de documento (ex: 82400092)
     * @param {string} peticao.documento - Conteúdo do documento em base64
     * @param {string} peticao.nomeDocumento - Nome do arquivo (ex: "Petição.pdf")
     * @param {string} peticao.mimetype - Tipo MIME (default: "application/pdf")
     * @param {string} peticao.descricaoDocumento - Descrição/observação (opcional)
     * @param {string} peticao.cpfProcurador - CPF do procurador (opcional)
     * @returns {object} { sucesso, numeroProtocolo, dataOperacao, mensagem, documentoComprovante }
     */
    async entregarPeticao(usuario, senha, numeroProcesso, peticao) {
        try {
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] Entregando petição (Peticionamento Intermediário)');
            console.log('[MNI 3.0] Processo:', numeroProcesso);
            console.log('[MNI 3.0] Tipo documento:', peticao.codigoTipoDocumento);
            console.log('[MNI 3.0] Usuario:', usuario);
            console.log('[MNI 3.0] ========================================');

            // Gerar hash da senha
            const senhaHash = this.hashSenha(senha);

            // IMPORTANTE: MNI 3.0 espera SHA-256 do documento, não base64 direto
            // Converter base64 para Buffer, depois calcular SHA-256
            const crypto = require('crypto');
            const documentoBuffer = Buffer.from(peticao.documento, 'base64');
            const documentoSha256 = crypto.createHash('sha256').update(documentoBuffer).digest('hex');

            console.log('[MNI 3.0] Tamanho do documento (base64):', peticao.documento.length);
            console.log('[MNI 3.0] Tamanho do documento (bytes):', documentoBuffer.length);
            console.log('[MNI 3.0] SHA-256 do documento:', documentoSha256);

            // Construir parâmetros de identificação (fora de documentos)
            let parametrosXML = '';
            if (peticao.cpfProcurador) {
                parametrosXML = `
            <tip:parametros nome="identProcuradorRepresentacao" valor="${peticao.cpfProcurador}"/>
            <tip:parametros nome="tipoIdentProcuradorRepresentacao" valor="CPF"/>`;
                console.log('[MNI 3.0] ✅ CPF Procurador será incluído:', peticao.cpfProcurador);
            } else {
                console.log('[MNI 3.0] ⚠️ CPF Procurador não fornecido');
            }

            // Construir XML SOAP manualmente (como no exemplo do pergunta2.txt)
            const soapXML = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v300="http://www.cnj.jus.br/mni/v300/" xmlns:tip="http://www.cnj.jus.br/mni/v300/tipos-servico-intercomunicacao" xmlns:int="http://www.cnj.jus.br/mni/v300/intercomunicacao">
   <soapenv:Header/>
   <soapenv:Body>
      <v300:requisicaoEntregarPeticao>
         <tip:manifestante>
            <int:autenticacaoSimples>
               <int:usuario>${usuario}</int:usuario>
               <int:senha>${senhaHash}</int:senha>
            </int:autenticacaoSimples>
         </tip:manifestante>
         <tip:numeroProcesso>${numeroProcesso}</tip:numeroProcesso>
         <tip:documentos>
            <int:codigoTipoDocumento>${peticao.codigoTipoDocumento}</int:codigoTipoDocumento>
            <int:conteudo>
               <int:mimetype>${peticao.mimetype || 'application/pdf'}</int:mimetype>
               <int:conteudo>${documentoSha256}</int:conteudo>
            </int:conteudo>
            <int:documentoVinculado/>
            <int:outroParametro nome="NomeDocumentoUsuario" valor="${peticao.nomeDocumento || 'Petição.pdf'}"/>
            ${peticao.descricaoDocumento ? `<int:outroParametro nome="ObsDocumento" valor="${peticao.descricaoDocumento}"/>` : ''}
         </tip:documentos>${parametrosXML}
      </v300:requisicaoEntregarPeticao>
   </soapenv:Body>
</soapenv:Envelope>`;

            console.log('[MNI 3.0] XML SOAP Manual (entregarPeticao):');
            console.log(soapXML);

            // Fazer requisição HTTP direta
            const https = require('https');
            const { URL } = require('url');

            const url = new URL(this.endpoint);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(soapXML),
                    'SOAPAction': '',
                    'User-Agent': 'MNI-WebApp/3.0 (Node.js)'
                }
            };

            // Fazer requisição
            const { responseData, contentType } = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    const chunks = [];
                    res.on('data', (chunk) => { chunks.push(chunk); });
                    res.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        const contentType = res.headers['content-type'] || '';
                        resolve({ responseData: buffer, contentType });
                    });
                });
                req.on('error', reject);
                req.write(soapXML);
                req.end();
            });

            console.log('[MNI 3.0] Content-Type da resposta:', contentType);

            let responseXML;
            let mtomAttachments = null;

            // Verificar se é multipart/related (MTOM) - pode conter comprovante
            if (contentType.includes('multipart/related')) {
                console.log('[MNI 3.0] Resposta é MTOM (multipart/related), processando...');

                // Extrair boundary
                const boundaryMatch = contentType.match(/boundary="?([^";,]+)"?/);
                if (!boundaryMatch) {
                    throw new Error('Boundary não encontrado no Content-Type MTOM');
                }
                const boundary = boundaryMatch[1];
                console.log('[MNI 3.0] Boundary:', boundary);

                // Dividir partes do multipart
                const parts = responseData.toString('binary').split(`--${boundary}`);
                console.log('[MNI 3.0] Total de partes no multipart:', parts.length);

                // Primeira parte (após o boundary inicial) é o XML SOAP
                for (let i = 1; i < parts.length - 1; i++) {
                    const part = parts[i];

                    // Dividir headers do conteúdo
                    const headerEndIndex = part.indexOf('\r\n\r\n');
                    if (headerEndIndex === -1) continue;

                    const headers = part.substring(0, headerEndIndex);
                    const content = part.substring(headerEndIndex + 4);

                    // Primeira parte é o XML
                    if (i === 1) {
                        responseXML = content.trim();
                    } else {
                        // Partes subsequentes são attachments (comprovante)
                        const cidMatch = headers.match(/Content-ID:\s*<([^>]+)>/i);
                        if (cidMatch) {
                            if (!mtomAttachments) mtomAttachments = [];
                            mtomAttachments.push({
                                contentId: cidMatch[1],
                                content: content
                            });
                            console.log('[MNI 3.0] Attachment encontrado (comprovante) - CID:', cidMatch[1], 'Tamanho:', content.length);
                        }
                    }
                }
            } else {
                // Resposta simples (apenas XML)
                responseXML = responseData.toString('utf-8');
            }

            console.log('[MNI 3.0] XML Response (entregarPeticao):');
            console.log(responseXML.substring(0, 2000)); // Primeiros 2000 chars

            // Parsear resposta XML
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
            const parsedResponse = await parser.parseStringPromise(responseXML);

            // Armazenar XMLs para debug
            this.lastRequestXML = soapXML;
            this.lastResponseXML = responseXML;

            console.log('[MNI 3.0] Resposta parseada (entregarPeticao):', JSON.stringify(parsedResponse, null, 2));

            // Extrair resultado
            const envelope = parsedResponse.Envelope;
            const body = envelope.Body;
            const response = body.respostaEntregarPeticao;
            const recibo = response.recibo;

            // Verificar sucesso
            const sucesso = recibo.recibo?.sucesso === true || recibo.recibo?.sucesso === 'true';

            if (!sucesso) {
                const mensagens = recibo.recibo?.mensagens || {};
                const mensagemErro = mensagens.descritivo || 'Erro ao entregar petição';
                console.error('[MNI 3.0] Erro ao entregar petição:', mensagemErro);
                throw new Error(mensagemErro);
            }

            // Extrair dados do recibo
            const numeroProtocolo = recibo.numeroProtocolo || '';
            const dataOperacao = recibo.dataOperacao || '';
            const mensagem = recibo.recibo?.mensagens?.descritivo || 'Petição processada com sucesso.';

            // Extrair comprovante se disponível
            let documentoComprovante = null;
            if (recibo.documentoComprovante) {
                const xopInclude = recibo.documentoComprovante.Include;
                if (xopInclude && xopInclude.$ && xopInclude.$.href) {
                    const cid = xopInclude.$.href;
                    console.log('[MNI 3.0] Comprovante referenciado via XOP:', cid);

                    // Extrair comprovante dos attachments
                    if (mtomAttachments && mtomAttachments.length > 0) {
                        const cidLimpo = cid.replace(/^cid:/, '').trim();
                        const attachment = mtomAttachments.find(att => {
                            const attCid = att.contentId.replace(/^<|>$/g, '').trim();
                            return attCid === cidLimpo || attCid === cid;
                        });

                        if (attachment) {
                            documentoComprovante = Buffer.from(attachment.content, 'binary').toString('base64');
                            console.log('[MNI 3.0] Comprovante extraído, tamanho:', documentoComprovante.length);
                        }
                    }
                }
            }

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] Petição entregue com sucesso!');
            console.log('[MNI 3.0] Número do protocolo:', numeroProtocolo);
            console.log('[MNI 3.0] Data da operação:', dataOperacao);
            console.log('[MNI 3.0] ========================================');

            return {
                sucesso: true,
                numeroProtocolo: numeroProtocolo,
                dataOperacao: dataOperacao,
                mensagem: mensagem,
                documentoComprovante: documentoComprovante,
                recibo: recibo
            };

        } catch (error) {
            console.error('[MNI 3.0] ========================================');
            console.error('[MNI 3.0] ERRO ao entregar petição:', error.message);
            console.error('[MNI 3.0] Stack:', error.stack);
            console.error('[MNI 3.0] ========================================');
            throw new Error(`Erro ao entregar petição: ${error.message}`);
        }
    }

    /**
     * Peticionamento Inicial usando MNI 3.0
     * Cria novo processo judicial
     */
    async peticionamentoInicial(usuario, senha, dadosIniciais) {
        // ⚠️ LOG DE VERSÃO - SE ESTE LOG NÃO APARECER, O CÓDIGO NÃO FOI ATUALIZADO
        console.log('');
        console.log('██████████████████████████████████████████████████████████████');
        console.log('██                                                          ██');
        console.log('██  🔄 MNI 3.0 - CÓDIGO ATUALIZADO - VERSÃO 03/11/2025     ██');
        console.log('██                                                          ██');
        console.log('██████████████████████████████████████████████████████████████');
        console.log('');

        try {
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] PETICIONAMENTO INICIAL');
            console.log('[MNI 3.0] Usuário:', usuario);
            console.log('[MNI 3.0] Localidade:', dadosIniciais.codigoLocalidade);
            console.log('[MNI 3.0] Classe:', dadosIniciais.classeProcessual);
            console.log('[MNI 3.0] ========================================');

            // Construir XML das partes (polo ativo e passivo)
            let polosXML = '';

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] DEBUG - Dados dos Polos:');
            console.log('[MNI 3.0] - poloAtivo:', JSON.stringify(dadosIniciais.poloAtivo));
            console.log('[MNI 3.0] - poloPassivo:', JSON.stringify(dadosIniciais.poloPassivo));
            console.log('[MNI 3.0] ========================================');

            // Polo Ativo
            if (dadosIniciais.poloAtivo && dadosIniciais.poloAtivo.length > 0) {
                console.log('[MNI 3.0] ✓ Construindo', dadosIniciais.poloAtivo.length, 'parte(s) do polo ATIVO');
                dadosIniciais.poloAtivo.forEach(parte => {
                    polosXML += this.construirPoloXML('AT', parte);
                });
            } else {
                console.log('[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!');
            }

            // Polo Passivo
            if (dadosIniciais.poloPassivo && dadosIniciais.poloPassivo.length > 0) {
                console.log('[MNI 3.0] ✓ Construindo', dadosIniciais.poloPassivo.length, 'parte(s) do polo PASSIVO');
                dadosIniciais.poloPassivo.forEach(parte => {
                    polosXML += this.construirPoloXML('PA', parte);
                });
            } else {
                console.log('[MNI 3.0] ⚠️ ERRO: Polo Passivo vazio ou indefinido!');
            }

            if (!polosXML || polosXML.trim() === '') {
                console.error('[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!');
                throw new Error('Polo Ativo e Polo Passivo são obrigatórios para peticionamento inicial');
            }

            console.log('[MNI 3.0] ✓ XML dos polos gerado com sucesso');

            // Construir XML de assuntos
            let assuntosXML = '';
            if (dadosIniciais.assunto) {
                assuntosXML += `
                <int:assunto principal="true">
                    <int:codigoNacional>${dadosIniciais.assunto}</int:codigoNacional>
                </int:assunto>`;
            }
            
            // Assuntos secundários
            if (dadosIniciais.assuntosSecundarios && Array.isArray(dadosIniciais.assuntosSecundarios)) {
                dadosIniciais.assuntosSecundarios.forEach(codigoAssunto => {
                    assuntosXML += `
                <int:assunto principal="false">
                    <int:codigoNacional>${codigoAssunto}</int:codigoNacional>
                </int:assunto>`;
                });
            }

            // Construir XML de CDA se for Execução Fiscal
            let outrosParametrosXML = '';
            if (dadosIniciais.dadosCDA) {
                const cda = dadosIniciais.dadosCDA;
                const listaCDAXml = `&lt;ListaCDA&gt;&lt;CDA&gt;&lt;NumeroCDA&gt;${cda.numeroCDA}&lt;/NumeroCDA&gt;&lt;CodigoTributoFiscal&gt;${cda.codigoTributoFiscal}&lt;/CodigoTributoFiscal&gt;&lt;ValorCda&gt;${cda.valorCDA}&lt;/ValorCda&gt;&lt;DataApuracaoValorCDA&gt;${cda.dataApuracaoCDA}&lt;/DataApuracaoValorCDA&gt;&lt;/CDA&gt;&lt;/ListaCDA&gt;`;
                
                outrosParametrosXML += `
                <int:outroParametro nome="ListaCDA" valor="${listaCDAXml}"/>`;
                
                console.log('[MNI 3.0] CDA adicionada:', cda.numeroCDA);
            }

            // Valor da causa
            let valorCausaXML = '';
            if (dadosIniciais.valorCausa) {
                valorCausaXML = `<int:valorCausa>${dadosIniciais.valorCausa}</int:valorCausa>`;
            }

            // Construir XML dos documentos
            let documentosXML = '';
            if (dadosIniciais.documentos && dadosIniciais.documentos.length > 0) {
                dadosIniciais.documentos.forEach(doc => {
                    const dataHora = new Date().toISOString();
                    documentosXML += `
            <tip:documentos>
                <int:codigoTipoDocumento>${doc.tipoDocumento || 1}</int:codigoTipoDocumento>
                <int:dataHora>${dataHora}</int:dataHora>
                <int:conteudo>
                    <int:mimetype>${doc.mimetype || 'application/pdf'}</int:mimetype>
                    <int:conteudo>${doc.conteudo}</int:conteudo>
                    ${doc.signatario ? `<int:assinatura>
                        <int:signatarioLogin>
                            <int:identificador>${doc.signatario}</int:identificador>
                            <int:dataHora>${dataHora}</int:dataHora>
                        </int:signatarioLogin>
                    </int:assinatura>` : ''}
                </int:conteudo>
            </tip:documentos>`;
                });
            }

            // Hash da senha usando a função correta que inclui a data
            const senhaHash = gerarSenhaHashMNI(senha).toLowerCase();

            // Construir SOAP XML completo para peticionamento inicial
            const soapXML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v300="http://www.cnj.jus.br/mni/v300/" 
                  xmlns:tip="http://www.cnj.jus.br/mni/v300/tipos-servico-intercomunicacao" 
                  xmlns:int="http://www.cnj.jus.br/mni/v300/intercomunicacao">
    <soapenv:Header/>
    <soapenv:Body>
        <v300:requisicaoEntregarPeticaoInicial>
            <tip:manifestante>
                <int:autenticacaoSimples>
                    <int:usuario>${usuario}</int:usuario>
                    <int:senha>${senhaHash}</int:senha>
                </int:autenticacaoSimples>
            </tip:manifestante>
            <tip:dadosBasicos>
                <int:dadosBasicos>
                    <int:numero>00000000000000000000</int:numero>
                    <int:classeProcessual>${dadosIniciais.classeProcessual}</int:classeProcessual>
                </int:dadosBasicos>
                ${dadosIniciais.competencia ? `<int:competencia>${dadosIniciais.competencia}</int:competencia>` : ''}
                <int:classeProcessual>${dadosIniciais.classeProcessual}</int:classeProcessual>
                <int:codigoLocalidade>${dadosIniciais.codigoLocalidade}</int:codigoLocalidade>
                <int:nivelSigilo>${dadosIniciais.nivelSigilo || 0}</int:nivelSigilo>
                ${polosXML}
                ${assuntosXML}
                ${valorCausaXML}
                ${outrosParametrosXML}
            </tip:dadosBasicos>
            ${documentosXML}
            ${this.construirParametrosIdentificacao(dadosIniciais, usuario)}
        </v300:requisicaoEntregarPeticaoInicial>
    </soapenv:Body>
</soapenv:Envelope>`;

            console.log('[MNI 3.0] XML SOAP (Peticionamento Inicial):');
            console.log(soapXML);

            // Armazenar para debug
            this.lastRequestXML = soapXML;

            // Enviar requisição SOAP
            const https = require('https');
            const url = require('url');
            
            // Usar this.endpoint ao invés de this.config.wsdlUrl
            const endpointUrl = this.endpoint || this.wsdlUrl;
            console.log('[MNI 3.0] Endpoint:', endpointUrl);
            
            const parsedUrl = url.parse(endpointUrl);

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(soapXML),
                    'User-Agent': 'MNI-Client/3.0 Node.js'
                },
                rejectUnauthorized: false
            };

            const responseXML = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => { resolve(data); });
                });
                req.on('error', reject);
                req.write(soapXML);
                req.end();
            });

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] RESPOSTA BRUTA (primeiros 500 chars):');
            console.log(responseXML.substring(0, 500));
            console.log('[MNI 3.0] ========================================');

            // Armazenar para debug
            this.lastResponseXML = responseXML;

            // ⚠️ CORREÇÃO: Resposta pode vir em formato MTOM (multipart com PDF anexado)
            // Precisamos extrair apenas a parte XML (SOAP Envelope)
            let xmlPart = responseXML;
            
            // Se a resposta contém boundary (MTOM), extrair apenas o XML
            if (responseXML.includes('Content-Type: application/xop+xml') || 
                responseXML.includes('boundary=')) {
                console.log('[MNI 3.0] Resposta MTOM detectada, extraindo XML...');
                
                // Encontrar o início do XML (<?xml ou <SOAP-ENV ou <env:Envelope)
                const xmlStartPatterns = ['<?xml', '<SOAP-ENV:', '<env:Envelope', '<soap:Envelope', '<soapenv:Envelope'];
                let xmlStartIndex = -1;
                
                for (const pattern of xmlStartPatterns) {
                    xmlStartIndex = responseXML.indexOf(pattern);
                    if (xmlStartIndex !== -1) {
                        console.log(`[MNI 3.0] XML encontrado no índice ${xmlStartIndex} com padrão: ${pattern}`);
                        break;
                    }
                }
                
                if (xmlStartIndex === -1) {
                    console.error('[MNI 3.0] ❌ Não foi possível encontrar o início do XML na resposta!');
                    throw new Error('Resposta inválida: XML não encontrado na resposta MTOM');
                }
                
                // Encontrar o fim do XML (</SOAP-ENV:Envelope> ou </env:Envelope>)
                const xmlEndPatterns = ['</SOAP-ENV:Envelope>', '</env:Envelope>', '</soap:Envelope>', '</soapenv:Envelope>'];
                let xmlEndIndex = -1;
                let endPattern = '';
                
                for (const pattern of xmlEndPatterns) {
                    const idx = responseXML.indexOf(pattern, xmlStartIndex);
                    if (idx !== -1) {
                        xmlEndIndex = idx + pattern.length;
                        endPattern = pattern;
                        console.log(`[MNI 3.0] Fim do XML encontrado no índice ${xmlEndIndex} com padrão: ${pattern}`);
                        break;
                    }
                }
                
                if (xmlEndIndex === -1) {
                    console.error('[MNI 3.0] ❌ Não foi possível encontrar o fim do XML na resposta!');
                    throw new Error('Resposta inválida: fim do XML não encontrado na resposta MTOM');
                }
                
                // Extrair apenas a parte XML
                xmlPart = responseXML.substring(xmlStartIndex, xmlEndIndex);
                
                console.log('[MNI 3.0] ✅ XML extraído com sucesso');
                console.log('[MNI 3.0] XML extraído (primeiros 500 chars):');
                console.log(xmlPart.substring(0, 500));
            }

            // Parsear resposta XML
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
            const parsedResponse = await parser.parseStringPromise(xmlPart);

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] RESPOSTA PARSEADA (JSON):');
            console.log(JSON.stringify(parsedResponse, null, 2));
            console.log('[MNI 3.0] ========================================');

            // Extrair resultado
            const envelope = parsedResponse.Envelope;
            const body = envelope.Body;
            const response = body.respostaEntregarPeticaoInicial;

            console.log('[MNI 3.0] Response object:', JSON.stringify(response, null, 2));

            // IMPORTANTE: A resposta do MNI 3.0 tem estrutura recibo.recibo
            const reciboWrapper = response.recibo || response;
            const recibo = reciboWrapper.recibo || reciboWrapper;

            console.log('[MNI 3.0] Recibo object:', JSON.stringify(recibo, null, 2));

            // Verificar sucesso
            const sucesso = recibo.sucesso === true || recibo.sucesso === 'true';
            const mensagem = recibo.mensagens?.descritivo || recibo.mensagem || 'Petição processada';

            console.log('[MNI 3.0] Sucesso:', sucesso, '(tipo:', typeof recibo.sucesso, ', valor:', recibo.sucesso, ')');
            console.log('[MNI 3.0] Mensagem:', mensagem);

            if (!sucesso) {
                console.error('[MNI 3.0] Erro no peticionamento:', mensagem);
                throw new Error(mensagem);
            }

            // Extrair número do processo de reciboDocumentos
            const reciboDocumentos = reciboWrapper.reciboDocumentos || {};
            const numeroProcesso = reciboDocumentos.numeroProcesso || '';

            // Extrair protocolo e data do wrapper (primeiro nível)
            const numeroProtocolo = reciboWrapper.numeroProtocolo || '';
            const dataOperacao = reciboWrapper.dataOperacao || '';

            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] PETICIONAMENTO REALIZADO COM SUCESSO!');
            console.log('[MNI 3.0] Número do Processo:', numeroProcesso);
            console.log('[MNI 3.0] Número do Protocolo:', numeroProtocolo);
            console.log('[MNI 3.0] Data da Operação:', dataOperacao);
            console.log('[MNI 3.0] ========================================');

            // Retornar resultado no formato esperado
            return {
                sucesso: true,
                mensagem: mensagem,
                numeroProcesso: numeroProcesso,
                protocoloRecebimento: numeroProtocolo,
                dataOperacao: dataOperacao,
                recibo: null
            };

        } catch (error) {
            console.error('[MNI 3.0] Erro no peticionamento inicial:', error.message);
            throw error;
        }
    }

    /**
     * Construir parâmetros de identificação do procurador/peticionante
     */
    construirParametrosIdentificacao(dadosIniciais, usuario) {
        // Tentar extrair CPF do primeiro documento (signatário)
        let cpfProcurador = null;

        console.log('[MNI 3.0] ========================================');
        console.log('[MNI 3.0] Construindo parâmetros de identificação...');
        console.log('[MNI 3.0] Documentos disponíveis:', dadosIniciais.documentos?.length || 0);

        if (dadosIniciais.documentos && dadosIniciais.documentos.length > 0) {
            const primeiroDoc = dadosIniciais.documentos[0];
            console.log('[MNI 3.0] Primeiro documento:', {
                signatario: primeiroDoc.signatario,
                tipoDocumento: primeiroDoc.tipoDocumento
            });
            
            if (primeiroDoc.signatario) {
                const signatario = String(primeiroDoc.signatario).replace(/\D/g, '');
                console.log('[MNI 3.0] CPF do signatário (limpo):', signatario);
                
                // Verificar se é um CPF válido (11 dígitos)
                if (signatario.length === 11) {
                    cpfProcurador = signatario;
                    console.log('[MNI 3.0] ✅ CPF válido:', cpfProcurador);
                } else {
                    console.log('[MNI 3.0] ⚠️ CPF inválido (não tem 11 dígitos):', signatario.length);
                }
            } else {
                console.log('[MNI 3.0] ⚠️ Signatário não encontrado no primeiro documento');
            }
        } else {
            console.log('[MNI 3.0] ⚠️ Nenhum documento disponível para extrair CPF');
        }

        // Se temos CPF, enviar os parâmetros
        if (cpfProcurador) {
            const parametrosXML = `<tip:parametros nome="identProcuradorRepresentacao" valor="${cpfProcurador}"/>
            <tip:parametros nome="tipoIdentProcuradorRepresentacao" valor="CPF"/>`;
            
            console.log('[MNI 3.0] ✅ Parâmetros de identificação gerados:');
            console.log(parametrosXML);
            console.log('[MNI 3.0] ========================================');
            
            return parametrosXML;
        }

        // Se não tem CPF, não enviar os parâmetros (são opcionais)
        console.log('[MNI 3.0] ⚠️ AVISO: Parâmetros de identificação do procurador NÃO serão enviados (CPF não disponível)');
        console.log('[MNI 3.0] ========================================');
        return '';
    }

    /**
     * Construir XML de polo (parte) para MNI 3.0
     */
    construirPoloXML(tipoPolo, parte) {
        // ✅ VALIDAÇÃO ADICIONADA
        if (!parte || typeof parte !== 'object') {
            console.error('[MNI 3.0] ❌ Parte inválida:', parte);
            throw new Error('Dados da parte inválidos');
        }

        // Pessoa física ou jurídica
        const isFisica = parte.tipoPessoa === 'fisica' || parte.cpf;

        // Validar e extrair documento (CPF ou CNPJ)
        let documento;
        if (isFisica) {
            documento = (parte.cpf || '').replace(/\D/g, '');
            if (!documento || documento.length !== 11) {
                console.error('[MNI 3.0] ❌ CPF inválido para parte:', parte);
                throw new Error(`CPF inválido ou vazio para a parte "${parte.nome || 'desconhecida'}" (esperado: 11 dígitos, recebido: ${documento.length})`);
            }
        } else {
            documento = (parte.cnpj || '').replace(/\D/g, '');
            if (!documento || documento.length !== 14) {
                console.error('[MNI 3.0] ❌ CNPJ inválido para parte:', parte);
                throw new Error(`CNPJ inválido ou vazio para a parte "${parte.nome || 'desconhecida'}" (esperado: 14 dígitos, recebido: ${documento.length})`);
            }
        }

        // Validar nome
        const nome = isFisica ? parte.nome : (parte.razaoSocial || parte.nome);
        if (!nome || nome.trim() === '') {
            console.error('[MNI 3.0] ❌ Nome vazio para parte:', parte);
            throw new Error('Nome da parte é obrigatório');
        }

        const qualificacao = isFisica ? 'FIS' : 'JUR';
        const tipoDoc = isFisica ? 'CPF' : 'CMF';

        // Endereço padrão (obrigatório para MNI 3.0)
        const endereco = parte.endereco || {
            logradouro: 'Rua Desconhecida',
            numero: 'S/N',
            bairro: 'Centro',
            cidade: 'São Paulo',
            uf: 'SP',
            cep: '01000000',
            codigoIBGE: '3550308'
        };

        // Limpar CEP
        const cepLimpo = (endereco.cep || '01000000').replace(/\D/g, '');

        return `
                <int:polo polo="${tipoPolo}">
                    <int:parte>
                        <int:pessoa>
                            <int:dadosBasicos>
                                <int:nome>${nome}</int:nome>
                                <int:qualificacaoPessoa>${qualificacao}</int:qualificacaoPessoa>
                                <int:numeroDocumentoPrincipal>${documento}</int:numeroDocumentoPrincipal>
                            </int:dadosBasicos>
                            <int:documento codigoDocumento="${documento}" emissorDocumento="RFB" tipoDocumento="${tipoDoc}"/>
                            <int:endereco>
                                <int:logradouro>${endereco.logradouro || 'Rua Desconhecida'}</int:logradouro>
                                <int:numero>${endereco.numero || 'S/N'}</int:numero>
                                ${endereco.complemento ? `<int:complemento>${endereco.complemento}</int:complemento>` : ''}
                                <int:bairro>${endereco.bairro || 'Centro'}</int:bairro>
                                <int:cidade>
                                    <int:municipio>${endereco.cidade || 'São Paulo'}</int:municipio>
                                    <int:unidadeFederacao>${endereco.uf || 'SP'}</int:unidadeFederacao>
                                    <int:codigoIBGE>${endereco.codigoIBGE || '3550308'}</int:codigoIBGE>
                                </int:cidade>
                                <int:unidadeFederacao>${endereco.uf || 'SP'}</int:unidadeFederacao>
                                <int:pais>BR</int:pais>
                                <int:cep>${cepLimpo}</int:cep>
                            </int:endereco>
                        </int:pessoa>
                    </int:parte>
                </int:polo>`;
    }
}

module.exports = new MNI3Client();
