const soap = require('soap');
const crypto = require('crypto');
const config = require('../config/mni.config');
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

        // Armazenar último request/response para debug
        this.lastRequestXML = null;
        this.lastResponseXML = null;
    }

    /**
     * Inicializa o cliente SOAP MNI 3.0
     */
    async initialize() {
        if (this.client) return this.client;

        try {
            const options = {
                timeout: 60000,
                disableCache: true
            };

            this.client = await soap.createClientAsync(this.wsdlUrl, options);

            // Configurar endpoint manualmente
            if (this.client) {
                this.client.setEndpoint(this.endpoint);
            }

            if (config.debugMode) {
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
     */
    hashSenha(senha) {
        // Usar o mesmo formato do MNI 2.2 (com data)
        return gerarSenhaHashMNI(senha).toUpperCase();
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

            if (config.debugMode) {
                console.log('[MNI 3.0] Consultando localidades para estado:', estado);
            }

            const [result] = await this.client.consultarLocalidadesAsync(args);

            if (config.debugMode) {
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

            if (config.debugMode) {
                console.log('[MNI 3.0] Consultando competências para localidade:', codigoLocalidade);
            }

            const [result] = await this.client.consultarCompetenciasAsync(args);

            if (config.debugMode) {
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

            if (config.debugMode) {
                console.log('[MNI 3.0] Consultando classes para:', args);
            }

            const [result] = await this.client.consultarClassesAsync(args);

            if (config.debugMode) {
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

            if (config.debugMode) {
                console.log('[MNI 3.0] Consultando assuntos para:', args);
            }

            const [result] = await this.client.consultarAssuntosAsync(args);

            if (config.debugMode) {
                console.log('[MNI 3.0] Assuntos retornados:', result);
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

            if (config.debugMode) {
                console.log('[MNI 3.0] Consultando avisos pendentes para usuário:', usuario);
            }

            const [result] = await this.client.consultarAvisosPendentesAsync(args);

            if (config.debugMode) {
                console.log('[MNI 3.0] Avisos retornados:', result);
            }

            return result;

        } catch (error) {
            console.error('[MNI 3.0] Erro ao consultar avisos pendentes:', error.message);
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
            this.lastRequestXML = this.client.lastRequest;
            this.lastResponseXML = this.client.lastResponse;

            // Log do XML enviado
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML Enviado:');
            console.log(this.lastRequestXML);
            console.log('[MNI 3.0] ========================================');
            console.log('[MNI 3.0] XML Resposta:');
            console.log(this.lastResponseXML);
            console.log('[MNI 3.0] ========================================');

            console.log('[MNI 3.0] Resposta recebida:', JSON.stringify(result, null, 2));

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

            if (config.debugMode) {
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
            if (!result || !result.assuntos) {
                console.warn('[MNI 3.0] Resultado de assuntos vazio ou inválido');
                return [];
            }

            const assuntos = Array.isArray(result.assuntos)
                ? result.assuntos
                : [result.assuntos];

            // Log para debug
            if (assuntos.length > 0) {
                console.log('[MNI 3.0] Assuntos recebidos para parse:', assuntos.map(a => ({codigo: a.codigo, codigoNacional: a.codigoNacional, cod_item: a.cod_item, nome: a.nome})));
            }

            return assuntos.map(assunto => {
                // Tenta pegar o código do assunto de vários campos possíveis
                const codigo =
                    (assunto.codigo !== undefined && assunto.codigo !== null) ? assunto.codigo :
                    (assunto.codigoNacional !== undefined && assunto.codigoNacional !== null) ? assunto.codigoNacional :
                    (assunto.cod_item !== undefined && assunto.cod_item !== null) ? assunto.cod_item :
                    '';
                return {
                    codigo: String(codigo),
                    descricao: assunto.descricao,
                    principal: assunto.principal === true || assunto.principal === 'true',
                    ativo: assunto.ativo !== 'N',
                    ...assunto
                };
            });

        } catch (error) {
            console.error('[MNI 3.0] Erro ao parsear assuntos:', error);
            return result;
        }
    }
}

module.exports = new MNI3Client();
