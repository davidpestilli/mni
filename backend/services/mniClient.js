const soap = require('soap');
const xml2js = require('xml2js');
const config = require('../config/mni.config');

class MNIClient {
    constructor() {
        this.config = config;
        this.client = null;
        this.lastRequest = null;
        this.lastResponse = null;
        this.soapLogs = []; // Histórico de requisições/respostas
    }

    /**
     * Inicializa o cliente SOAP
     */
    async initialize() {
        if (this.client) return this.client;

        try {
            // Validar configurações
            if (!this.config.wsdlUrl || !this.config.endpoint) {
                throw new Error('WSDL URL ou Endpoint não configurado no arquivo .env');
            }

            const options = {
                timeout: this.config.timeout
            };

            this.client = await soap.createClientAsync(this.config.wsdlUrl, options);

            // IMPORTANTE: Configurar o endpoint manualmente
            // O WSDL pode ter um endpoint diferente do desejado
            if (this.client && this.config.endpoint) {
                this.client.setEndpoint(this.config.endpoint);
            }

            // Adicionar interceptor para capturar requisições e respostas SOAP
            this.client.on('request', (xml, eid) => {
                this.lastRequest = xml;
                if (this.config.debugMode) {
                    console.log('[MNI] ===== SOAP REQUEST =====');
                    console.log(xml);
                    console.log('[MNI] ==========================');
                }
            });

            this.client.on('response', (body, response, eid) => {
                this.lastResponse = body;

                // Adicionar ao histórico
                this.soapLogs.push({
                    timestamp: new Date().toISOString(),
                    request: this.lastRequest,
                    response: body,
                    statusCode: response.statusCode
                });

                // Manter apenas últimos 10 logs
                if (this.soapLogs.length > 10) {
                    this.soapLogs.shift();
                }

                if (this.config.debugMode) {
                    console.log('[MNI] ===== SOAP RESPONSE =====');
                    console.log(body);
                    console.log('[MNI] Status:', response.statusCode);
                    console.log('[MNI] ===========================');
                }
            });

            if (this.config.debugMode) {
                console.log('[MNI] Cliente SOAP inicializado');
                console.log('[MNI] Endpoint configurado:', this.config.endpoint);
                console.log('[MNI] Métodos disponíveis:', Object.keys(this.client));
            }

            return this.client;
        } catch (error) {
            console.error('[MNI] Erro ao inicializar cliente SOAP:', error.message);
            throw new Error(`Falha ao conectar com o serviço MNI: ${error.message}`);
        }
    }

    /**
     * Consultar avisos pendentes
     */
    async consultarAvisosPendentes(idConsultante, senhaConsultante) {
        try {
            await this.initialize();

            const args = {
                idConsultante,
                senhaConsultante
            };

            if (this.config.debugMode) {
                console.log('[MNI] Consultando avisos pendentes para:', idConsultante);
            }

            const [result] = await this.client.consultarAvisosPendentesAsync(args);

            return this.parseAvisos(result);
        } catch (error) {
            console.error('[MNI] Erro ao consultar avisos:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Consultar teor da comunicação
     */
    async consultarTeorComunicacao(idConsultante, senhaConsultante, numeroProcesso, identificadorMovimento) {
        try {
            await this.initialize();

            const args = {
                idConsultante,
                senhaConsultante,
                numeroProcesso,
                identificadorMovimento
            };

            if (this.config.debugMode) {
                console.log('[MNI] Consultando teor da comunicação:', { numeroProcesso, identificadorMovimento });
            }

            const [result] = await this.client.consultarTeorComunicacaoAsync(args);

            return this.parseTeorComunicacao(result);
        } catch (error) {
            console.error('[MNI] Erro ao consultar teor:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Consultar processo
     */
    async consultarProcesso(idConsultante, senhaConsultante, numeroProcesso, incluirDocumentos = true, chave = null) {
        try {
            await this.initialize();

            const args = {
                idConsultante,
                senhaConsultante,
                numeroProcesso,
                incluirDocumentos
            };

            // Adicionar chave de consulta se fornecida
            // Formato correto para MNI: <parametros nome="chave" valor="..."/>
            if (chave) {
                args.parametros = {
                    attributes: {
                        nome: 'chave',
                        valor: chave
                    }
                };
            }

            if (this.config.debugMode) {
                console.log('[MNI] Consultando processo:', numeroProcesso);
                if (chave) {
                    console.log('[MNI] Com chave de consulta:', chave);
                }
            }

            const [result] = await this.client.consultarProcessoAsync(args);

            return this.parseProcesso(result);
        } catch (error) {
            console.error('[MNI] Erro ao consultar processo:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Consultar conteúdo de documento
     */
    async consultarConteudoDocumento(idConsultante, senhaConsultante, numeroProcesso, idDocumento) {
        try {
            await this.initialize();

            const args = {
                idConsultante,
                senhaConsultante,
                numeroProcesso,
                idDocumento
            };

            if (this.config.debugMode) {
                console.log('[MNI] Consultando documento:', idDocumento);
            }

            const [result] = await this.client.consultarConteudoDocumentoAsync(args);

            return this.parseDocumento(result);
        } catch (error) {
            console.error('[MNI] Erro ao consultar documento:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Entregar manifestação processual (Peticionamento Intermediário)
     */
    async entregarManifestacao(idConsultante, senhaConsultante, numeroProcesso, manifestacao) {
        try {
            await this.initialize();

            // IMPORTANTE: O MNI usa "idManifestante" e "senhaManifestante", não "idConsultante"
            const args = {
                idManifestante: idConsultante,
                senhaManifestante: senhaConsultante,
                numeroProcesso,
                documento: {
                    attributes: {
                        tipoDocumento: manifestacao.tipoDocumento,
                        mimetype: manifestacao.mimetype || 'application/pdf',
                        nivelSigilo: manifestacao.nivelSigilo || 0
                    },
                    conteudo: manifestacao.documento, // Base64
                    outroParametro: [
                        {
                            attributes: {
                                nome: 'NomeDocumentoUsuario',
                                valor: manifestacao.nomeDocumento
                            }
                        }
                    ]
                }
            };

            // Adicionar descrição se fornecida
            if (manifestacao.descricaoDocumento) {
                args.documento.outroParametro.push({
                    attributes: {
                        nome: 'ObsDocumento',
                        valor: manifestacao.descricaoDocumento
                    }
                });
            }

            if (this.config.debugMode) {
                console.log('[MNI] Entregando manifestação no processo:', numeroProcesso);
                console.log('[MNI] Tipo documento:', manifestacao.tipoDocumento);
            }

            const [result] = await this.client.entregarManifestacaoProcessualAsync(args);

            return this.parseManifestacao(result);
        } catch (error) {
            console.error('[MNI] Erro ao entregar manifestação:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Peticionamento Inicial - Criar novo processo
     *
     * @param {string} idManifestante - ID do manifestante
     * @param {string} senhaManifestante - Senha hash SHA256
     * @param {object} dadosIniciais - Dados para criação do processo
     * @returns {Promise<object>} Resultado com número do processo criado
     */
    async peticionamentoInicial(idManifestante, senhaManifestante, dadosIniciais) {
        try {
            await this.initialize();

            if (this.config.debugMode) {
                console.log('[MNI] Iniciando Peticionamento Inicial');
                console.log('[MNI] Localidade:', dadosIniciais.codigoLocalidade);
                console.log('[MNI] Classe:', dadosIniciais.classeProcessual);
            }

            // Validar campos obrigatórios
            this.validarDadosIniciais(dadosIniciais);

            // Montar estrutura de dadosBasicos
            const dadosBasicos = {
                attributes: {
                    codigoLocalidade: dadosIniciais.codigoLocalidade,
                    classeProcessual: dadosIniciais.classeProcessual,
                    nivelSigilo: dadosIniciais.nivelSigilo || 0
                }
            };

            // Adicionar polos (partes)
            const polos = [];

            // Polo Ativo
            if (dadosIniciais.poloAtivo && dadosIniciais.poloAtivo.length > 0) {
                dadosIniciais.poloAtivo.forEach(parte => {
                    polos.push(this.montarPolo('AT', parte));
                });
            }

            // Polo Passivo
            if (dadosIniciais.poloPassivo && dadosIniciais.poloPassivo.length > 0) {
                dadosIniciais.poloPassivo.forEach(parte => {
                    polos.push(this.montarPolo('PA', parte));
                });
            }

            if (polos.length > 0) {
                dadosBasicos.polo = polos;
            }

            // Adicionar assunto
            if (dadosIniciais.assunto) {
                if (this.config.debugMode) {
                    console.log('[MNI] Código do assunto:', dadosIniciais.assunto, '(tipo:', typeof dadosIniciais.assunto, ')');
                }

                dadosBasicos.assunto = {
                    attributes: {
                        principal: true
                    },
                    codigoNacional: dadosIniciais.assunto
                };
            }

            // Adicionar valor da causa
            if (dadosIniciais.valorCausa) {
                dadosBasicos.valorCausa = dadosIniciais.valorCausa;
            }

            // Adicionar competência se fornecida
            if (dadosIniciais.competencia) {
                dadosBasicos.attributes.competencia = dadosIniciais.competencia;
            }

            // Montar args completo
            const args = {
                idManifestante,
                senhaManifestante,
                dadosBasicos
            };

            // Adicionar documentos
            if (dadosIniciais.documentos && dadosIniciais.documentos.length > 0) {
                args.documento = dadosIniciais.documentos.map(doc => ({
                    attributes: {
                        tipoDocumento: doc.tipoDocumento || 1, // 1 = Petição Inicial
                        mimetype: doc.mimetype || 'application/pdf',
                        nivelSigilo: doc.nivelSigilo || 0,
                        tipoDocumentoLocal: doc.tipoDocumento || 1 // IMPORTANTE: necessário para MNI
                    },
                    conteudo: doc.conteudo, // Base64
                    outroParametro: [
                        {
                            attributes: {
                                nome: 'NomeDocumentoUsuario',
                                valor: doc.nomeDocumento || 'Petição Inicial.pdf'
                            }
                        }
                    ],
                    // Adicionar assinatura se fornecida
                    ...(doc.signatario && {
                        assinatura: {
                            signatarioLogin: {
                                attributes: {
                                    identificador: doc.signatario
                                }
                            }
                        }
                    })
                }));
            }

            if (this.config.debugMode) {
                console.log('[MNI] Args peticionamento inicial:', JSON.stringify(args, null, 2));
            }

            const [result] = await this.client.entregarManifestacaoProcessualAsync(args);

            // Parse específico para peticionamento inicial
            return this.parsePeticionamentoInicial(result);

        } catch (error) {
            console.error('[MNI] Erro ao realizar peticionamento inicial:', error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Validar dados obrigatórios para peticionamento inicial
     */
    validarDadosIniciais(dados) {
        const camposObrigatorios = ['codigoLocalidade', 'classeProcessual'];

        camposObrigatorios.forEach(campo => {
            if (!dados[campo]) {
                throw new Error(`Campo obrigatório ausente: ${campo}`);
            }
        });

        // Validar que há ao menos uma parte no polo ativo e passivo
        if (!dados.poloAtivo || dados.poloAtivo.length === 0) {
            throw new Error('É necessário informar ao menos uma parte no polo ativo');
        }

        if (!dados.poloPassivo || dados.poloPassivo.length === 0) {
            throw new Error('É necessário informar ao menos uma parte no polo passivo');
        }

        // Validar que há ao menos um documento
        if (!dados.documentos || dados.documentos.length === 0) {
            throw new Error('É necessário anexar ao menos um documento (Petição Inicial)');
        }
    }

    /**
     * Montar estrutura de polo (parte)
     */
    montarPolo(tipoPolo, parte) {
        const polo = {
            attributes: {
                polo: tipoPolo // AT = Ativo, PA = Passivo
            },
            parte: {
                pessoa: {
                    attributes: {}
                }
            }
        };

        // Pessoa física ou jurídica
        if (parte.tipoPessoa === 'fisica' || parte.cpf) {
            polo.parte.pessoa.attributes = {
                nome: parte.nome,
                sexo: parte.sexo || 'Masculino',
                dataNascimento: parte.dataNascimento,
                numeroDocumentoPrincipal: parte.cpf,
                tipoPessoa: 'fisica'
            };
        } else if (parte.tipoPessoa === 'juridica' || parte.cnpj) {
            polo.parte.pessoa.attributes = {
                razaoSocial: parte.razaoSocial || parte.nome,
                numeroDocumentoPrincipal: parte.cnpj,
                tipoPessoa: 'juridica'
            };
        }

        return polo;
    }

    /**
     * Parse específico para resposta de peticionamento inicial
     */
    parsePeticionamentoInicial(result) {
        try {
            if (this.config.debugMode) {
                console.log('[MNI] Resposta peticionamento inicial:', JSON.stringify(result, null, 2));
            }

            // Extrair número do processo gerado
            let numeroProcesso = '';

            if (result.parametro) {
                const parametros = Array.isArray(result.parametro)
                    ? result.parametro
                    : [result.parametro];

                const paramProcesso = parametros.find(p =>
                    (p.attributes && p.attributes.nome === 'numeroProcesso') ||
                    p.nome === 'numeroProcesso'
                );

                if (paramProcesso) {
                    numeroProcesso = paramProcesso.attributes?.valor || paramProcesso.valor || '';
                }
            }

            return {
                sucesso: result.sucesso || false,
                mensagem: result.mensagem || '',
                numeroProcesso: numeroProcesso, // IMPORTANTE: número do processo criado
                protocoloRecebimento: result.protocoloRecebimento || '',
                dataOperacao: this.formatarDataHora(result.dataOperacao),
                recibo: result.recibo || ''
            };
        } catch (error) {
            console.error('[MNI] Erro ao parsear resposta de peticionamento inicial:', error);
            return {
                sucesso: false,
                mensagem: 'Erro ao processar resposta',
                numeroProcesso: '',
                protocoloRecebimento: '',
                dataOperacao: '',
                recibo: ''
            };
        }
    }

    // ========== Métodos de Parse ==========

    parseAvisos(result) {
        const avisos = [];

        try {
            if (this.config.debugMode) {
                console.log('[MNI] Estrutura de avisos recebida:', JSON.stringify(result, null, 2));
            }

            // Tentar múltiplos formatos possíveis de retorno

            // Formato 1: result.avisos
            if (result && result.avisos) {
                const avisosArray = Array.isArray(result.avisos) ? result.avisos : [result.avisos];

                avisosArray.forEach(aviso => {
                    avisos.push(this.parseAviso(aviso));
                });
            }
            // Formato 2: result.aviso (singular)
            else if (result && result.aviso) {
                const avisosArray = Array.isArray(result.aviso) ? result.aviso : [result.aviso];

                avisosArray.forEach(aviso => {
                    avisos.push(this.parseAviso(aviso));
                });
            }
            // Formato 3: result direto é um array
            else if (Array.isArray(result)) {
                result.forEach(aviso => {
                    avisos.push(this.parseAviso(aviso));
                });
            }
            // Formato 4: result direto é um objeto
            else if (result && typeof result === 'object') {
                avisos.push(this.parseAviso(result));
            }

            if (this.config.debugMode) {
                console.log(`[MNI] Total de avisos parseados: ${avisos.length}`);
            }

        } catch (error) {
            console.error('[MNI] Erro ao parsear avisos:', error);
        }

        return avisos;
    }

    parseAviso(aviso) {
        try {
            // Estrutura real do TJSP:
            // <ns1:aviso idAviso="..." tipoComunicacao="INT">
            //    <ns2:destinatario>
            //       <ns2:pessoa nome="..." numeroDocumentoPrincipal="..." tipoPessoa="juridica"/>
            //    </ns2:destinatario>
            //    <ns2:processo numero="..." competencia="..." classeProcessual="..." ...>
            //       <ns2:orgaoJulgador codigoOrgao="..." nomeOrgao="..." />
            //    </ns2:processo>
            //    <ns2:dataDisponibilizacao>20251013215003</ns2:dataDisponibilizacao>
            // </ns1:aviso>

            const avisoAttrs = aviso.attributes || aviso.$attributes || {};
            const processo = aviso.processo || {};
            const processoAttrs = processo.attributes || processo.$attributes || {};
            const destinatario = aviso.destinatario || {};
            const pessoa = destinatario.pessoa || {};
            const pessoaAttrs = pessoa.attributes || pessoa.$attributes || {};
            const orgaoJulgador = processo.orgaoJulgador || {};
            const orgaoAttrs = orgaoJulgador.attributes || orgaoJulgador.$attributes || {};

            return {
                // ID do aviso
                idAviso: avisoAttrs.idAviso || '',
                tipoComunicacao: avisoAttrs.tipoComunicacao || 'INT',

                // Dados do processo
                numeroProcesso: processoAttrs.numero || '',
                classeProcessual: processoAttrs.classeProcessual || '',
                competencia: processoAttrs.competencia || '',
                nivelSigilo: processoAttrs.nivelSigilo || '0',

                // Destinatário
                nomeDestinatario: pessoaAttrs.nome || '',
                documentoDestinatario: pessoaAttrs.numeroDocumentoPrincipal || '',

                // Órgão julgador
                orgaoJulgador: orgaoAttrs.nomeOrgao || '',
                codigoOrgao: orgaoAttrs.codigoOrgao || '',

                // Data de disponibilização
                dataDisponibilizacao: this.formatarDataHora(aviso.dataDisponibilizacao),

                // Campos para compatibilidade com interface atual
                descricaoMovimento: avisoAttrs.tipoComunicacao === 'INT' ? 'Intimação' : 'Citação',
                status: 'Aberto',
                prazo: '', // Não disponível nessa estrutura

                // Campo identificador para consultar teor
                identificadorMovimento: avisoAttrs.idAviso || ''
            };
        } catch (error) {
            console.error('[MNI] Erro ao parsear aviso individual:', error);
            return {
                numeroProcesso: '',
                dataDisponibilizacao: '',
                identificadorMovimento: '',
                descricaoMovimento: 'Erro ao parsear',
                status: 'Erro'
            };
        }
    }

    parseTeorComunicacao(result) {
        // TODO: Implementar parse do teor da comunicação
        return result;
    }

    parseProcesso(result) {
        try {
            if (this.config.debugMode) {
                console.log('[MNI] Estrutura de processo recebida:', JSON.stringify(result, null, 2));
            }

            // O SOAP retorna: { sucesso, mensagem, processo: { dadosBasicos, documento, ... } }
            // Retornamos apenas a parte "processo"
            if (result && result.processo) {
                return result.processo;
            }

            // Se result já for o processo direto
            if (result && result.dadosBasicos) {
                return result;
            }

            // Fallback: retorna o que vier
            return result;
        } catch (error) {
            console.error('[MNI] Erro ao parsear processo:', error);
            return result;
        }
    }

    parseDocumento(result) {
        // Retorna o conteúdo Base64 do documento
        return {
            conteudo: result.documento || '',
            mimetype: result.mimetype || 'application/pdf'
        };
    }

    parseManifestacao(result) {
        return {
            sucesso: result.sucesso || false,
            numeroProtocolo: result.numeroProtocolo || '',
            dataProtocolo: this.formatarDataHora(result.dataProtocolo),
            mensagem: result.mensagem || ''
        };
    }

    // ========== Métodos Auxiliares ==========

    extrairParametro(objeto, nomeParametro) {
        if (!objeto || !objeto.outroParametro) return '';

        const parametros = Array.isArray(objeto.outroParametro)
            ? objeto.outroParametro
            : [objeto.outroParametro];

        const param = parametros.find(p => p.nome === nomeParametro);
        return param ? param.valor : '';
    }

    formatarDataHora(dataHora) {
        if (!dataHora) return '';

        // Formato: AAAAMMDDHHMMSS -> DD/MM/AAAA HH:MM:SS
        const str = dataHora.toString();

        if (str.length === 14) {
            return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)} ${str.substr(8, 2)}:${str.substr(10, 2)}:${str.substr(12, 2)}`;
        }

        if (str.length === 8) {
            return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)}`;
        }

        return dataHora;
    }

    handleError(error) {
        // Tratamento de erros específicos do SOAP
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            return new Error('Autenticação inválida. Verifique CPF/sigla e senha.');
        }

        if (error.message.includes('404') || error.message.includes('Not Found')) {
            return new Error('Processo não encontrado ou sem permissão de acesso.');
        }

        if (error.message.includes('timeout')) {
            return new Error('Tempo limite excedido. Tente novamente.');
        }

        return new Error(error.message || 'Erro desconhecido ao acessar o serviço MNI.');
    }

    // ========== Métodos de Debug ==========

    /**
     * Obter última requisição e resposta SOAP
     */
    getLastSoapTransaction() {
        return {
            request: this.lastRequest,
            response: this.lastResponse
        };
    }

    /**
     * Obter histórico de transações SOAP
     */
    getSoapLogs() {
        return this.soapLogs;
    }

    /**
     * Limpar logs
     */
    clearSoapLogs() {
        this.soapLogs = [];
        this.lastRequest = null;
        this.lastResponse = null;
    }
}

module.exports = new MNIClient();
