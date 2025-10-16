const soap = require('soap');
const config = require('../config/mni.config');

class TabelaClient {
    constructor() {
        this.wsdlUrl = 'https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl';
        this.endpoint = 'https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=consultarTabela';
        this.client = null;
    }

    /**
     * Inicializa o cliente SOAP para consulta de tabelas
     */
    async initialize() {
        if (this.client) return this.client;

        try {
            const options = {
                timeout: 60000
            };

            this.client = await soap.createClientAsync(this.wsdlUrl, options);

            // Configurar endpoint manualmente
            if (this.client) {
                this.client.setEndpoint(this.endpoint);
            }

            if (config.debugMode) {
                console.log('[TABELA] Cliente SOAP inicializado');
                console.log('[TABELA] Endpoint configurado:', this.endpoint);
                console.log('[TABELA] Métodos disponíveis:', Object.keys(this.client).filter(k => typeof this.client[k] === 'function'));
            }

            return this.client;
        } catch (error) {
            console.error('[TABELA] Erro ao inicializar cliente SOAP:', error.message);
            throw new Error(`Falha ao conectar com o serviço de tabelas: ${error.message}`);
        }
    }

    /**
     * Consultar tabela específica
     *
     * @param {string} nomeTabela - Nome da tabela a consultar
     * Exemplos:
     * - TipoDocumento
     * - ClasseProcessual
     * - AssuntoProcessual
     * - MovimentoProcessual
     * - OrgaoJulgador
     * - etc.
     */
    async consultarTabela(nomeTabela) {
        try {
            await this.initialize();

            const args = {
                nomeTabela: nomeTabela
            };

            if (config.debugMode) {
                console.log('[TABELA] Consultando tabela:', nomeTabela);
            }

            // Tentar diferentes formas de chamar o método
            let result;

            // 1. consultarDadosAsync (nome real do WSDL do TJSP)
            if (typeof this.client.consultarDadosAsync === 'function') {
                [result] = await this.client.consultarDadosAsync(args);
                if (config.debugMode) {
                    console.log('[TABELA] Método usado: consultarDadosAsync');
                }
            }
            // 2. consultarDados (versão callback)
            else if (typeof this.client.consultarDados === 'function') {
                result = await new Promise((resolve, reject) => {
                    this.client.consultarDados(args, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
                if (config.debugMode) {
                    console.log('[TABELA] Método usado: consultarDados');
                }
            }
            // 3. consultarTabelaAsync (nome padrão esperado)
            else if (typeof this.client.consultarTabelaAsync === 'function') {
                [result] = await this.client.consultarTabelaAsync(args);
            }
            // 4. consultarTabela (versão callback padrão)
            else if (typeof this.client.consultarTabela === 'function') {
                result = await new Promise((resolve, reject) => {
                    this.client.consultarTabela(args, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
            }
            // 5. Método não encontrado
            else {
                const availableMethods = Object.keys(this.client).filter(k => typeof this.client[k] === 'function');
                console.error('[TABELA] Métodos disponíveis:', availableMethods);
                throw new Error(`Método de consulta não encontrado. Métodos disponíveis: ${availableMethods.join(', ')}`);
            }

            return this.parseTabela(result);

        } catch (error) {
            console.error('[TABELA] Erro ao consultar tabela:', error.message);
            throw new Error(error.message || 'Erro ao consultar tabela');
        }
    }

    /**
     * Parse da resposta da tabela
     */
    parseTabela(result) {
        const registros = [];

        try {
            // Formato TJSP: result.tabela.linha[]
            if (result && result.tabela && result.tabela.linha) {
                const linhas = result.tabela.linha;

                if (!Array.isArray(linhas) || linhas.length === 0) {
                    console.log('[TABELA] Nenhuma linha encontrada');
                    return [];
                }

                // Primeira linha contém o cabeçalho (nomes das colunas)
                const cabecalho = linhas[0].item;

                if (!Array.isArray(cabecalho)) {
                    console.log('[TABELA] Cabeçalho inválido');
                    return result;
                }

                if (config.debugMode) {
                    console.log('[TABELA] Cabeçalho:', cabecalho);
                    console.log('[TABELA] Total de registros:', linhas.length - 1);
                }

                // Encontrar índices das colunas importantes
                const indice = {
                    codigo: cabecalho.indexOf('CodTipoDocumento'),
                    descricao: cabecalho.indexOf('DesTipoDocumento'),
                    descCurta: cabecalho.indexOf('DesCurtaTipoDocumento'),
                    ativo: cabecalho.indexOf('SinAtivo')
                };

                // Processar linhas de dados (ignorar linha 0 que é o cabeçalho)
                for (let i = 1; i < linhas.length; i++) {
                    const valores = linhas[i].item;

                    if (!Array.isArray(valores)) continue;

                    // Criar objeto mapeando valores para campos
                    const registro = {
                        codigo: valores[indice.codigo] || '',
                        descricao: valores[indice.descricao] || '',
                        descricaoCurta: valores[indice.descCurta] || '',
                        ativo: valores[indice.ativo] === 'S'
                    };

                    // Adicionar todos os campos do cabeçalho
                    cabecalho.forEach((campo, idx) => {
                        registro[campo] = valores[idx];
                    });

                    registros.push(registro);
                }

                if (config.debugMode) {
                    console.log('[TABELA] Primeiros 3 registros parseados:', registros.slice(0, 3));
                }

                return registros;
            }

            // Formato padrão: result.registros
            if (result && result.registros) {
                const registrosArray = Array.isArray(result.registros)
                    ? result.registros
                    : [result.registros];

                registrosArray.forEach(registro => {
                    registros.push({
                        codigo: registro.codigo || '',
                        descricao: registro.descricao || '',
                        ativo: registro.ativo !== 'N',
                        ...registro
                    });
                });

                return registros;
            }

            // Formato alternativo: result.itens
            if (result && result.itens) {
                const itensArray = Array.isArray(result.itens)
                    ? result.itens
                    : [result.itens];

                itensArray.forEach(item => {
                    registros.push({
                        codigo: item.id || item.codigo || '',
                        descricao: item.nome || item.descricao || '',
                        ativo: true,
                        ...item
                    });
                });

                return registros;
            }

            // Se não conseguiu parsear, retornar resultado bruto
            console.log('[TABELA] Formato não reconhecido, retornando resultado bruto');
            return result;

        } catch (error) {
            console.error('[TABELA] Erro ao parsear tabela:', error);
            return result;
        }
    }

    /**
     * Consultar tipos de documento (atalho)
     */
    async consultarTiposDocumento() {
        return await this.consultarTabela('TipoDocumento');
    }

    /**
     * Consultar classes judiciais (atalho)
     */
    async consultarClassesJudiciais() {
        return await this.consultarTabela('ClasseJudicial');
    }

    /**
     * Consultar assuntos judiciais (atalho)
     */
    async consultarAssuntosJudiciais() {
        return await this.consultarTabela('AssuntoJudicial');
    }

    /**
     * Consultar movimentos processuais (atalho)
     */
    async consultarMovimentosProcessuais() {
        return await this.consultarTabela('MovimentoProcessual');
    }

    /**
     * Consultar localidades judiciais / comarcas (atalho)
     */
    async consultarLocalidades() {
        return await this.consultarTabela('LocalidadeJudicial');
    }

    /**
     * Consultar órgãos (atalho)
     */
    async consultarOrgaos() {
        return await this.consultarTabela('Orgao');
    }

    /**
     * Consultar competências judiciais (atalho)
     */
    async consultarCompetenciasJudiciais() {
        return await this.consultarTabela('CompetenciaJudicial');
    }

    /**
     * Listar tabelas disponíveis
     */
    async listarTabelas() {
        try {
            await this.initialize();

            // Tentar método listarTabelasAsync (disponível no TJSP)
            if (typeof this.client.listarTabelasAsync === 'function') {
                const [result] = await this.client.listarTabelasAsync({});

                if (config.debugMode) {
                    console.log('[TABELA] Tabelas disponíveis:', result);
                }

                // Parse do resultado
                if (Array.isArray(result)) {
                    return result;
                } else if (result && result.tabelas) {
                    return Array.isArray(result.tabelas) ? result.tabelas : [result.tabelas];
                } else if (result && result.nomes) {
                    return Array.isArray(result.nomes) ? result.nomes : [result.nomes];
                }

                return result;
            }
            // Tentar versão callback
            else if (typeof this.client.listarTabelas === 'function') {
                const result = await new Promise((resolve, reject) => {
                    this.client.listarTabelas({}, (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                });
                return result;
            }
            // Se não houver método, retornar lista comum conhecida
            else {
                console.log('[TABELA] Método listarTabelas não disponível, usando lista padrão');
                return [
                    'TipoDocumento',
                    'ClasseProcessual',
                    'AssuntoProcessual',
                    'MovimentoProcessual',
                    'OrgaoJulgador',
                    'TipoRelacionamento',
                    'TipoParte',
                    'NivelSigilo'
                ];
            }
        } catch (error) {
            console.log('[TABELA] Erro ao listar tabelas, usando lista padrão:', error.message);
            // Retornar lista padrão em caso de erro
            return [
                'TipoDocumento',
                'ClasseProcessual',
                'AssuntoProcessual',
                'MovimentoProcessual'
            ];
        }
    }
}

module.exports = new TabelaClient();
