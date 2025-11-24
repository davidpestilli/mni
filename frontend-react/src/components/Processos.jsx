import { useState, useEffect, useRef } from 'react';
import { apiRequest, formatarNumeroProcesso, limparNumeroProcesso, downloadBase64File, formatarDataHoraMNI, buscarDescricaoClasse, buscarDescricaoAssunto, buscarDescricaoCompetencia, converterDataBRParaISO, converterDataBRParaMNI, useDataInputMask } from '../utils/utils';

function Processos() {
    const [numeroProcesso, setNumeroProcesso] = useState('');
    const [chaveConsulta, setChaveConsulta] = useState('');
    const [dataReferencia, setDataReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [processo, setProcesso] = useState(null);
    const [error, setError] = useState(null);
    const [processoEnriquecido, setProcessoEnriquecido] = useState(null);
    const [documentoModal, setDocumentoModal] = useState(null);
    const [soapDebug, setSoapDebug] = useState({ request: '', response: '' });
    const [soapExpanded, setSoapExpanded] = useState(false);

    // Ref para o input de data com formatação automática
    const dataInputRef = useRef(null);

    // Ativar input mask para data de referência
    useDataInputMask(dataInputRef, dataReferencia, setDataReferencia);

    /**
     * Extrai atributos de um documento com suporte a MNI 2.2 e MNI 3.0
     * MNI 2.2: doc.attributes contém id, descricao, mimetype, nivelSigilo
     * MNI 3.0: campos diretos em doc (id, descricao, conteudo.mimetype, nivelSigilo)
     */
    const extrairAtributosDocumento = (doc) => {
        const attrs = doc.attributes || {};

        return {
            id: attrs.id || attrs.idDocumento || doc.idDocumento || '',
            descricao: attrs.descricao || attrs.nome || doc.descricao || 'Documento',
            mimetype: attrs.mimetype || doc.conteudo?.mimetype || doc.mimetype || 'application/octet-stream',
            nivelSigilo: parseInt(attrs.nivelSigilo || doc.nivelSigilo || '0'),
            tamanho: attrs.tamanho || doc.tamanho || doc.tamanhoConteudo || 0,
        };
    };

    // Fechar modal com ESC
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && documentoModal) {
                setDocumentoModal(null);
            }
        };

        if (documentoModal) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [documentoModal]);

    const handleConsultar = async () => {
        try {
            setLoading(true);
            setError(null);
            setProcesso(null);

            const numeroLimpo = limparNumeroProcesso(numeroProcesso);

            if (!numeroLimpo || numeroLimpo.length !== 20) {
                setError('Número do processo deve conter 20 dígitos');
                setLoading(false);
                return;
            }

            // Determinar qual versão MNI usar baseado no sistema atual
            const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');

            console.log('[PROCESSOS] Sistema:', sistema);
            console.log('[PROCESSOS] Usar MNI 3.0:', usarMNI3);

            let url;
            const params = new URLSearchParams();

            if (usarMNI3) {
                // MNI 3.0: /api/mni3/processo/:numeroProcesso
                url = `/api/mni3/processo/${numeroLimpo}`;

                if (chaveConsulta) {
                    params.append('chave', chaveConsulta);
                }

                // MNI 3.0 usa dataInicial ao invés de dataReferencia
                if (dataReferencia) {
                    // Converter data do formato BR (DD/MM/YYYY HH:mm:ss) para ISO (YYYY-MM-DDTHH:mm:ss-03:00)
                    const dataISO = converterDataBRParaISO(dataReferencia);
                    params.append('dataInicial', dataISO);
                }

                // Sempre incluir documentos no MNI 3.0
                params.append('incluirDocumentos', 'true');
            } else {
                // MNI 2.2: /api/processos/:numeroProcesso
                url = `/api/processos/${numeroLimpo}`;

                if (chaveConsulta) {
                    params.append('chave', chaveConsulta);
                }

                if (dataReferencia) {
                    // Converter data do formato BR (DD/MM/YYYY HH:mm:ss) para AAAAMMDDHHMMSS (14 dígitos)
                    // MNI 2.2 espera este formato no backend
                    const dataMNI = converterDataBRParaMNI(dataReferencia);
                    params.append('dataReferencia', dataMNI);
                }
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('[PROCESSOS] URL final:', url);

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && data.data) {
                console.log('[PROCESSOS] Dados recebidos do backend:', data.data);
                console.log('[PROCESSOS] processo.documento existe?', data.data.documento ? 'SIM' : 'NÃO');
                console.log('[PROCESSOS] processo.documento:', data.data.documento);

                setProcesso(data.data);
                // Enriquecer dados do processo
                await enriquecerProcesso(data.data);

                // Carregar XMLs de debug se disponíveis
                if (data.debug && data.debug.xmlRequest && data.debug.xmlResponse) {
                    console.log('[PROCESSOS] XMLs disponíveis na resposta');
                    setSoapDebug({
                        request: formatarXML(data.debug.xmlRequest),
                        response: formatarXML(data.debug.xmlResponse)
                    });
                } else {
                    console.log('[PROCESSOS] XMLs não disponíveis na resposta');
                    setSoapDebug({ request: '', response: '' });
                }
            } else {
                setError(data.message || 'Erro ao consultar processo');
            }

        } catch (error) {
            console.error('Erro ao consultar processo:', error);
            setError('Erro ao conectar com o servidor: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocumento = async (documentoId, descricao, mimetype) => {
        try {
            const numeroLimpo = limparNumeroProcesso(numeroProcesso);
            const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');

            const url = usarMNI3
                ? `/api/mni3/processo/${numeroLimpo}/documentos/${documentoId}`
                : `/api/processos/${numeroLimpo}/documentos/${documentoId}`;

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && data.data.conteudo) {
                // Determinar extensão baseada no mimetype
                const mimetypeFinal = data.data.mimetype || mimetype || 'application/pdf';
                let extensao = '.bin';
                if (mimetypeFinal === 'application/pdf') extensao = '.pdf';
                else if (mimetypeFinal === 'text/html') extensao = '.html';
                else if (mimetypeFinal.startsWith('video/')) extensao = '.mp4';
                else if (mimetypeFinal.startsWith('image/png')) extensao = '.png';
                else if (mimetypeFinal.startsWith('image/jpeg') || mimetypeFinal.startsWith('image/jpg')) extensao = '.jpg';
                else if (mimetypeFinal.startsWith('image/')) extensao = '.jpg';

                const nomeArquivo = descricao
                    ? `${descricao.replace(/[^a-zA-Z0-9]/g, '_')}${extensao}`
                    : `documento_${documentoId}${extensao}`;

                downloadBase64File(data.data.conteudo, nomeArquivo, mimetypeFinal);
            }
        } catch (error) {
            console.error('Erro ao baixar documento:', error);
            alert('Erro ao baixar documento: ' + error.message);
        }
    };

    const handleVisualizarDocumento = async (documentoId, descricao, mimetype) => {
        try {
            setDocumentoModal({ loading: true, descricao });

            const numeroLimpo = limparNumeroProcesso(numeroProcesso);
            const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');

            const url = usarMNI3
                ? `/api/mni3/processo/${numeroLimpo}/documentos/${documentoId}`
                : `/api/processos/${numeroLimpo}/documentos/${documentoId}`;

            console.log('[VISUALIZAR DOCUMENTO] Sistema:', sistema);
            console.log('[VISUALIZAR DOCUMENTO] URL:', url);

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && data.data.conteudo) {
                const conteudo = data.data.conteudo;
                const mimetypeFinal = data.data.mimetype || mimetype;

                // Validações de segurança
                console.log('Conteúdo recebido - tipo:', typeof conteudo, 'tamanho:', conteudo ? conteudo.length : 0);

                // Validar que conteudo é uma string
                if (typeof conteudo !== 'string') {
                    throw new Error('Formato inválido: conteúdo do documento não é uma string');
                }

                // Validar que não está vazio
                if (!conteudo || conteudo.length === 0) {
                    throw new Error('Conteúdo do documento está vazio');
                }

                // Validar que parece ser Base64 (caracteres válidos)
                const base64Regex = /^[A-Za-z0-9+/=]+$/;
                if (!base64Regex.test(conteudo.substring(0, Math.min(100, conteudo.length)))) {
                    throw new Error('Formato inválido: conteúdo não está em Base64');
                }

                setDocumentoModal({
                    loading: false,
                    descricao,
                    conteudo: conteudo,
                    mimetype: mimetypeFinal
                });
            } else {
                throw new Error(data.message || 'Erro ao carregar documento');
            }
        } catch (error) {
            console.error('Erro ao visualizar documento:', error);
            setDocumentoModal(null);
            alert('Erro ao carregar documento: ' + error.message);
        }
    };

    const enriquecerProcesso = async (processoData) => {
        try {
            const dadosBasicosRaiz = processoData.dadosBasicos || {};
            const dadosBasicos = dadosBasicosRaiz.dadosBasicos || dadosBasicosRaiz;
            const attributes = dadosBasicos.attributes || dadosBasicos;

            // Buscar descrição da classe processual
            const codigoClasse = dadosBasicosRaiz.classeProcessual || attributes.classeProcessual || '';
            const classeProcessual = codigoClasse ? await buscarDescricaoClasse(codigoClasse) : 'N/A';

            // Buscar descrição da competência
            const codigoCompetencia = dadosBasicosRaiz.competencia || attributes.competencia || '';
            const codigoLocalidade = dadosBasicosRaiz.codigoLocalidade || attributes.codigoLocalidade || '0000';
            const competencia = codigoCompetencia ? await buscarDescricaoCompetencia(codigoCompetencia, codigoLocalidade) : 'N/A';

            // Obter rito processual
            const outrosParametros = dadosBasicosRaiz.outroParametro || dadosBasicos.outroParametro || [];
            const outrosParametrosArray = Array.isArray(outrosParametros) ? outrosParametros : [outrosParametros];
            const ritoParam = outrosParametrosArray.find(p => {
                const pAttrs = p.attributes || p;
                return pAttrs.nome === 'ritoProcessual';
            });
            const rito = ritoParam ? (ritoParam.attributes?.valor || ritoParam.valor || 'N/A') : 'N/A';

            // Data de ajuizamento
            const dataAjuizamentoRaw = dadosBasicosRaiz.dataAjuizamento || attributes.dataAjuizamento;
            const dataAjuizamento = dataAjuizamentoRaw ? formatarDataMNI(dataAjuizamentoRaw) : 'N/A';

            // Assuntos com descrição
            const assuntos = dadosBasicosRaiz.assunto || dadosBasicos.assunto ?
                (Array.isArray(dadosBasicosRaiz.assunto || dadosBasicos.assunto) ?
                    (dadosBasicosRaiz.assunto || dadosBasicos.assunto) :
                    [dadosBasicosRaiz.assunto || dadosBasicos.assunto]) : [];

            const assuntosComDescricao = await Promise.all(assuntos.map(async (assunto) => {
                const codigo = assunto.codigoNacional || '';
                const descricao = codigo ? await buscarDescricaoAssunto(codigo) : 'N/A';
                return {
                    ...assunto,
                    descricao: descricao
                };
            }));

            setProcessoEnriquecido({
                classeProcessual,
                competencia,
                rito,
                dataAjuizamento,
                assuntosComDescricao
            });

        } catch (error) {
            console.error('Erro ao enriquecer processo:', error);
        }
    };

    // Função para formatar XML (indentação)
    const formatarXML = (xml) => {
        if (!xml || xml === 'Nenhuma requisição SOAP ainda' || xml === 'Nenhuma resposta SOAP ainda') {
            return xml;
        }

        try {
            const reg = /(>)(<)(\/*)/g;
            let formatted = xml.replace(reg, '$1\n$2$3');
            let pad = 0;
            const lines = formatted.split('\n');
            formatted = lines.map(line => {
                let indent = 0;
                if (line.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                } else if (line.match(/^<\/\w/)) {
                    if (pad !== 0) {
                        pad -= 1;
                    }
                } else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) {
                    indent = 1;
                } else {
                    indent = 0;
                }
                const padding = '  '.repeat(pad);
                pad += indent;
                return padding + line;
            }).join('\n');
            return formatted;
        } catch (e) {
            console.error('Erro ao formatar XML:', e);
            return xml;
        }
    };

    // Função para copiar XML
    const copiarXML = async (tipo) => {
        try {
            const xml = tipo === 'request' ? soapDebug.request : soapDebug.response;
            await navigator.clipboard.writeText(xml);
            alert(`✅ XML ${tipo === 'request' ? 'de requisição' : 'de resposta'} copiado!`);
        } catch (error) {
            console.error('Erro ao copiar XML:', error);
            alert('Erro ao copiar XML');
        }
    };

    // Função para baixar XML
    const baixarXML = (tipo) => {
        const xml = tipo === 'request' ? soapDebug.request : soapDebug.response;
        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soap-consultar-processo-${tipo}-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatarDataMNI = (dataMNI) => {
        if (!dataMNI) return 'N/A';
        const str = dataMNI.toString();

        // MNI 3.0: formato ISO 8601 (2025-11-23T09:19:11-03:00) ou (2025-11-23)
        if (str.includes('T') || (str.includes('-') && str.length >= 10)) {
            try {
                // Parse manual da data ISO para evitar problemas com timezone
                let datePart = str;
                if (str.includes('T')) {
                    datePart = str.split('T')[0];
                }

                const [ano, mes, dia] = datePart.split('-');

                if (ano && mes && dia) {
                    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
                }
            } catch (e) {
                console.error('Erro ao formatar data ISO:', e);
            }
        }

        // MNI 2.2: formato AAAAMMDD
        if (str.length >= 8 && !str.includes('-')) {
            const ano = str.substr(0, 4);
            const mes = str.substr(4, 2);
            const dia = str.substr(6, 2);
            return `${dia}/${mes}/${ano}`;
        }

        return dataMNI;
    };

    const formatarDocumento = (doc, isPJ) => {
        if (!doc || doc === 'N/A') return 'N/A';
        const limpo = doc.replace(/\D/g, '');
        if (isPJ && limpo.length === 14) {
            return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        } else if (!isPJ && limpo.length === 11) {
            return limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
        }
        return doc;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="card bg-gradient-to-r from-blue-600 to-cyan-600 text-white mb-6">
                    <h1 className="text-3xl font-bold mb-2">🔍 Consultar Processo</h1>
                    <p className="opacity-90">Buscar informações detalhadas de processos judiciais</p>
                </div>

                <div className="card">
                <div className="space-y-4">
                    <div>
                        <label className="label">Número do Processo</label>
                        <input
                            type="text"
                            value={numeroProcesso}
                            onChange={(e) => setNumeroProcesso(e.target.value)}
                            className="input"
                            placeholder="Ex: 4005130-29.2025.8.26.0000 ou 40051302920258260000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Aceita formato com pontuação (NNNNNNN-DD.AAAA.J.TR.OOOO) ou apenas números
                        </p>
                    </div>

                    <div>
                        <label className="label">Chave de Consulta (opcional)</label>
                        <input
                            type="text"
                            value={chaveConsulta}
                            onChange={(e) => setChaveConsulta(e.target.value)}
                            className="input"
                            placeholder="Ex: 559783082125"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Use a chave para consultar processos nos quais você não está vinculado
                        </p>
                    </div>

                    <div>
                        <label className="label">Data de Referência (opcional)</label>
                        <input
                            ref={dataInputRef}
                            type="text"
                            value={dataReferencia}
                            onChange={(e) => setDataReferencia(e.target.value)}
                            className="input"
                            placeholder="Ex: 12031985 ou 12031985 144045"
                            maxLength="19"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Digite apenas números (DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS). Formatação automática aplicada.
                        </p>
                    </div>

                    <button
                        onClick={handleConsultar}
                        disabled={loading}
                        className="btn btn-primary w-full"
                    >
                        {loading ? 'Consultando...' : 'Consultar'}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <div className="loading-spinner"></div>
                </div>
            )}

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {processo && (
                <div className="card">
                    {/* Cabeçalho do Processo */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg mb-6">
                        <h3 className="text-2xl font-semibold mb-4">
                            📋 Processo: {formatarNumeroProcesso(numeroProcesso)}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="opacity-80">Classe Processual</div>
                                <div className="font-semibold text-lg">
                                    {processoEnriquecido?.classeProcessual || 'Carregando...'}
                                </div>
                            </div>
                            <div>
                                <div className="opacity-80">Competência</div>
                                <div className="font-semibold text-lg">
                                    {processoEnriquecido?.competencia || 'Carregando...'}
                                </div>
                            </div>
                            <div>
                                <div className="opacity-80">Rito</div>
                                <div className="font-semibold text-lg">
                                    {processoEnriquecido?.rito || 'Carregando...'}
                                </div>
                            </div>
                            <div>
                                <div className="opacity-80">Valor da Causa</div>
                                <div className="font-semibold text-lg">
                                    {(() => {
                                        const dadosBasicosRaiz = processo.dadosBasicos || {};
                                        const valor = dadosBasicosRaiz.valorCausa;
                                        return valor ? `R$ ${parseFloat(valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ 0,00';
                                    })()}
                                </div>
                            </div>
                            <div>
                                <div className="opacity-80">Data do Ajuizamento</div>
                                <div className="font-semibold text-lg">
                                    {processoEnriquecido?.dataAjuizamento || 'Carregando...'}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                            <div className="font-medium">
                                🏛️ {(() => {
                                    const dadosBasicosRaiz = processo.dadosBasicos || {};
                                    const orgao = dadosBasicosRaiz.orgaoJulgador || {};
                                    const orgaoAttrs = orgao.attributes || orgao;
                                    return orgaoAttrs.nome || orgaoAttrs.nomeOrgao || 'N/A';
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {(() => {
                            const movimentos = processo.movimento ? (Array.isArray(processo.movimento) ? processo.movimento : [processo.movimento]) : [];
                            const documentos = processo.documento ? (Array.isArray(processo.documento) ? processo.documento : [processo.documento]) : [];
                            const dadosBasicosRaiz = processo.dadosBasicos || {};
                            const polos = dadosBasicosRaiz.polo || dadosBasicosRaiz.dadosBasicos?.polo ?
                                         (Array.isArray(dadosBasicosRaiz.polo || dadosBasicosRaiz.dadosBasicos?.polo) ?
                                          (dadosBasicosRaiz.polo || dadosBasicosRaiz.dadosBasicos?.polo) :
                                          [dadosBasicosRaiz.polo || dadosBasicosRaiz.dadosBasicos?.polo]) : [];

                            return (
                                <>
                                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-blue-600">{movimentos.length}</div>
                                        <div className="text-sm text-gray-600">Movimentos</div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-green-600">{documentos.length}</div>
                                        <div className="text-sm text-gray-600">Documentos</div>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-purple-600">{polos.length}</div>
                                        <div className="text-sm text-gray-600">Partes</div>
                                    </div>
                                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                                        <div className="text-3xl font-bold text-yellow-600">
                                            {documentos.filter(d => {
                                                const mime = d.attributes?.mimetype || d.conteudo?.mimetype;
                                                return mime === 'application/pdf';
                                            }).length}
                                        </div>
                                        <div className="text-sm text-gray-600">PDFs</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Partes do Processo */}
                    {(() => {
                        const dadosBasicosRaiz = processo.dadosBasicos || {};
                        const dadosBasicos = dadosBasicosRaiz.dadosBasicos || dadosBasicosRaiz;
                        const polos = dadosBasicosRaiz.polo || dadosBasicos.polo ?
                            (Array.isArray(dadosBasicosRaiz.polo || dadosBasicos.polo) ?
                                (dadosBasicosRaiz.polo || dadosBasicos.polo) :
                                [dadosBasicosRaiz.polo || dadosBasicos.polo]) : [];

                        if (polos.length === 0) return null;

                        const tiposPoloMap = {
                            'AT': { nome: 'Autor', bgClass: 'bg-green-50', borderClass: 'border-green-500', textClass: 'text-green-700', icon: '👤' },
                            'PA': { nome: 'Réu/Passivo', bgClass: 'bg-red-50', borderClass: 'border-red-500', textClass: 'text-red-700', icon: '⚖️' },
                            'TC': { nome: 'Terceiro', bgClass: 'bg-gray-50', borderClass: 'border-gray-500', textClass: 'text-gray-700', icon: '👥' },
                            'AO': { nome: 'Autor', bgClass: 'bg-green-50', borderClass: 'border-green-500', textClass: 'text-green-700', icon: '👤' }
                        };

                        return (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <span>👥</span>
                                    <span>Partes do Processo</span>
                                </h4>
                                <div className="space-y-4">
                                    {polos.map((polo, poloIndex) => {
                                        const poloAttrs = polo.attributes || {};
                                        const tipoPolo = poloAttrs.polo || 'N/A';
                                        const partes = polo.parte ? (Array.isArray(polo.parte) ? polo.parte : [polo.parte]) : [];
                                        const poloInfo = tiposPoloMap[tipoPolo] || { nome: tipoPolo, bgClass: 'bg-gray-50', borderClass: 'border-gray-500', textClass: 'text-gray-700', icon: '📌' };

                                        return (
                                            <div key={poloIndex} className={`${poloInfo.bgClass} border-l-4 ${poloInfo.borderClass} p-4 rounded-lg`}>
                                                <div className={`${poloInfo.textClass} font-semibold mb-3 flex items-center gap-2`}>
                                                    <span>{poloInfo.icon}</span>
                                                    <span>{poloInfo.nome}</span>
                                                </div>
                                                <div className="space-y-4">
                                                    {partes.map((parte, parteIndex) => {
                                                        const pessoa = parte.pessoa || {};
                                                        const pessoaAttrs = pessoa.attributes || {};
                                                        const dadosBasicosPessoa = pessoa.dadosBasicos || {};
                                                        const advogados = parte.advogado ? (Array.isArray(parte.advogado) ? parte.advogado : [parte.advogado]) : [];

                                                        const tipoPessoa = pessoaAttrs.tipoPessoa || pessoa.qualificacaoPessoa || '';
                                                        const isPJ = tipoPessoa === 'juridica' || tipoPessoa === 'JUR';
                                                        const nome = pessoaAttrs.nome || dadosBasicosPessoa.nome || 'N/A';
                                                        const numeroDoc = pessoaAttrs.numeroDocumentoPrincipal ||
                                                            dadosBasicosPessoa.numeroDocumentoPrincipal ||
                                                            pessoa.numeroDocumentoPrincipal ||
                                                            'N/A';

                                                        return (
                                                            <div key={parteIndex} className="bg-white p-3 rounded border border-gray-200">
                                                                <div className="font-medium text-gray-900">
                                                                    {isPJ ? '🏢' : '👤'} {nome}
                                                                </div>
                                                                <div className="text-sm text-gray-600 mt-1">
                                                                    {isPJ ? 'CNPJ' : 'CPF'}: {formatarDocumento(numeroDoc, isPJ)}
                                                                </div>
                                                                {advogados.length > 0 && (
                                                                    <div className="mt-2 pl-4 border-l-2 border-blue-200">
                                                                        <div className="text-xs font-medium text-gray-600 mb-1">⚖️ Advogados:</div>
                                                                        {advogados.map((adv, advIndex) => {
                                                                            const advAttrs = adv.attributes || {};
                                                                            return (
                                                                                <div key={advIndex} className="text-xs text-gray-700 bg-blue-50 p-2 rounded mb-1">
                                                                                    <div className="font-medium">{advAttrs.nome || 'N/A'}</div>
                                                                                    {advAttrs.inscricao && <div>OAB: {advAttrs.inscricao}</div>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Assuntos */}
                    {processoEnriquecido?.assuntosComDescricao && processoEnriquecido.assuntosComDescricao.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <span>📌</span>
                                <span>Assuntos</span>
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                {processoEnriquecido.assuntosComDescricao.map((assunto, index) => {
                                    const isPrincipal = assunto.attributes && assunto.attributes.principal === 'true';
                                    const codigo = assunto.codigoNacional || 'N/A';
                                    const descricao = assunto.descricao || codigo;

                                    return (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{descricao}</span>
                                            {codigo !== descricao && (
                                                <span className="text-sm text-gray-500">({codigo})</span>
                                            )}
                                            {isPrincipal && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Principal</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Movimentos */}
                    {(() => {
                        const movimentos = processo.movimento ? (Array.isArray(processo.movimento) ? processo.movimento : [processo.movimento]) : [];

                        if (movimentos.length === 0) return null;

                        const movimentosOrdenados = [...movimentos].sort((a, b) => {
                            const dataA = a.attributes?.dataHora || '0';
                            const dataB = b.attributes?.dataHora || '0';
                            return dataB.localeCompare(dataA);
                        });

                        return (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <span>📑</span>
                                    <span>Movimentos Processuais ({movimentos.length})</span>
                                </h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {movimentosOrdenados.map((mov, index) => {
                                        const attrs = mov.attributes || mov;
                                        // Buscar descrição do movimento (pode estar em movimentoLocal)
                                        const movimentoLocal = mov.movimentoLocal || {};
                                        const movLocalAttrs = movimentoLocal.attributes || {};
                                        const descricao = movLocalAttrs.descricao || attrs.descricao || 'Sem descrição';

                                        // Obter complementos se existirem
                                        const complementos = mov.complemento ? (Array.isArray(mov.complemento) ? mov.complemento : [mov.complemento]) : [];

                                        // Formatar data/hora
                                        let dataHoraFormatada = 'N/A';
                                        if (attrs.dataHora) {
                                            try {
                                                // MNI 3.0: formato ISO 8601 (2025-11-23T09:19:12-03:00)
                                                if (attrs.dataHora.includes('T') || attrs.dataHora.includes('-')) {
                                                    const date = new Date(attrs.dataHora);
                                                    dataHoraFormatada = date.toLocaleString('pt-BR');
                                                } else {
                                                    // MNI 2.2: formato AAAAMMDDHHMMSS
                                                    const date = new Date(
                                                        attrs.dataHora.substr(0,4),
                                                        parseInt(attrs.dataHora.substr(4,2))-1,
                                                        attrs.dataHora.substr(6,2),
                                                        attrs.dataHora.substr(8,2),
                                                        attrs.dataHora.substr(10,2),
                                                        attrs.dataHora.substr(12,2)
                                                    );
                                                    dataHoraFormatada = date.toLocaleString('pt-BR');
                                                }
                                            } catch (e) {
                                                console.error('Erro ao formatar data do movimento:', e);
                                                dataHoraFormatada = attrs.dataHora;
                                            }
                                        }

                                        return (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                                                <div className="font-medium text-gray-900">{descricao}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    📅 {dataHoraFormatada}
                                                </div>
                                                {complementos.length > 0 && (
                                                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                                                        {complementos.map((comp, compIndex) => {
                                                            // Complemento pode ser string ou objeto com $value
                                                            const textoComp = typeof comp === 'string' ? comp : (comp.$value || comp._ || JSON.stringify(comp));
                                                            return (
                                                                <div key={compIndex}>• {textoComp}</div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Documentos */}
                    {(() => {
                        console.log('[DOCUMENTOS DEBUG] processo.documento RAW:', processo.documento);
                        console.log('[DOCUMENTOS DEBUG] É array?', Array.isArray(processo.documento));

                        const documentos = processo.documento ? (Array.isArray(processo.documento) ? processo.documento : [processo.documento]) : [];

                        console.log('[DOCUMENTOS DEBUG] Total de documentos:', documentos.length);
                        console.log('[DOCUMENTOS DEBUG] Primeiro documento:', documentos[0]);
                        console.log('[DOCUMENTOS DEBUG] Array de documentos:', documentos);

                        if (documentos.length === 0) {
                            console.log('[DOCUMENTOS DEBUG] Nenhum documento encontrado');
                            console.log('[DOCUMENTOS DEBUG] Estrutura processo.documento:', processo.documento);
                            return null;
                        }

                        return (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <span>📎</span>
                                    <span>Documentos ({documentos.length})</span>
                                </h4>
                                <div className="space-y-2">
                                    {documentos.map((doc, index) => {
                                        const docAttrs = extrairAtributosDocumento(doc);
                                        const temSigilo = docAttrs.nivelSigilo > 0;

                                        // Determinar ícone baseado no tipo
                                        let icone = '📝';
                                        if (docAttrs.mimetype === 'application/pdf') icone = '📄';
                                        else if (docAttrs.mimetype && docAttrs.mimetype.startsWith('video/')) icone = '🎥';
                                        else if (docAttrs.mimetype && docAttrs.mimetype.startsWith('image/')) icone = '🖼️';
                                        else if (docAttrs.mimetype === 'text/html') icone = '📃';

                                        console.log(`[DOC ${index}] ID:`, docAttrs.id, 'Descrição:', docAttrs.descricao, 'Mime:', docAttrs.mimetype);

                                        return (
                                            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium flex items-center gap-2">
                                                        <span>{icone}</span>
                                                        <span className="truncate">{docAttrs.descricao}</span>
                                                        {temSigilo && (
                                                            <span className="bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
                                                                🔒 Sigilo {docAttrs.nivelSigilo}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {docAttrs.mimetype}
                                                        {docAttrs.tamanho > 0 && ` • ${(docAttrs.tamanho / 1024).toFixed(2)} KB`}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 ml-2">
                                                    <button
                                                        onClick={() => handleVisualizarDocumento(docAttrs.id, docAttrs.descricao, docAttrs.mimetype)}
                                                        className="btn btn-primary btn-sm"
                                                        title="Visualizar documento"
                                                    >
                                                        👁️ Ver
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadDocumento(docAttrs.id, docAttrs.descricao, docAttrs.mimetype)}
                                                        className="btn btn-primary btn-sm"
                                                        title="Baixar documento"
                                                    >
                                                        📥 Baixar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Debug SOAP XML */}
            {processo && soapDebug.request && (
                <div className="mt-8 border-2 border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 p-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">
                            🔍 Debug SOAP - XML Completo
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSoapExpanded(!soapExpanded)}
                            className="btn btn-secondary text-sm"
                        >
                            {soapExpanded ? '▲' : '▼'} {soapExpanded ? 'Recolher' : 'Expandir'}
                        </button>
                    </div>

                    {soapExpanded && (
                        <div className="p-6 bg-white space-y-6">
                            {/* Requisição SOAP */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-md font-bold text-gray-700">
                                        📤 Requisição SOAP Enviada
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => copiarXML('request')}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                        >
                                            📋 Copiar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => baixarXML('request')}
                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                        >
                                            💾 Baixar
                                        </button>
                                    </div>
                                </div>
                                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
                                    {soapDebug.request}
                                </pre>
                            </div>

                            {/* Resposta SOAP */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-md font-bold text-gray-700">
                                        📥 Resposta SOAP Recebida
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => copiarXML('response')}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                        >
                                            📋 Copiar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => baixarXML('response')}
                                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                        >
                                            💾 Baixar
                                        </button>
                                    </div>
                                </div>
                                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
                                    {soapDebug.response}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Visualização de Documento */}
            {documentoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
                    {documentoModal.loading ? (
                        <div className="bg-white rounded-lg p-8 text-center max-w-md">
                            <div className="text-5xl mb-4 animate-spin">⏳</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Carregando Documento</h3>
                            <p className="text-gray-600">{documentoModal.descricao}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
                            {/* Header */}
                            <div className="flex justify-between items-center p-4 border-b">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{documentoModal.descricao}</h3>
                                    <p className="text-sm text-gray-500">{documentoModal.mimetype}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // Encontrar o documento para obter o ID
                                            const doc = processo.documento.find(d => {
                                                const dAttrs = d.attributes || d;
                                                const dDescricao = dAttrs.descricao || dAttrs.nome || '';
                                                return dDescricao === documentoModal.descricao;
                                            });
                                            if (doc) {
                                                const dAttrs = doc.attributes || doc;
                                                const docId = dAttrs.id || dAttrs.idDocumento;
                                                handleDownloadDocumento(docId, documentoModal.descricao, documentoModal.mimetype);
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        ⬇️ Download
                                    </button>
                                    <button
                                        onClick={() => setDocumentoModal(null)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        ✖ Fechar
                                    </button>
                                </div>
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 overflow-hidden">
                                {documentoModal.mimetype === 'application/pdf' && (
                                    <embed
                                        src={`data:${documentoModal.mimetype};base64,${documentoModal.conteudo}`}
                                        type="application/pdf"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 'none' }}
                                    />
                                )}
                                {documentoModal.mimetype === 'text/html' && (
                                    <iframe
                                        srcDoc={atob(documentoModal.conteudo)}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 'none', background: 'white' }}
                                        title={documentoModal.descricao}
                                    />
                                )}
                                {documentoModal.mimetype && documentoModal.mimetype.startsWith('video/') && (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                        <video
                                            controls
                                            className="max-w-full max-h-full"
                                        >
                                            <source
                                                src={`data:${documentoModal.mimetype};base64,${documentoModal.conteudo}`}
                                                type={documentoModal.mimetype}
                                            />
                                            Seu navegador não suporta a reprodução de vídeos.
                                        </video>
                                    </div>
                                )}
                                {documentoModal.mimetype && documentoModal.mimetype.startsWith('image/') && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <img
                                            src={`data:${documentoModal.mimetype};base64,${documentoModal.conteudo}`}
                                            alt={documentoModal.descricao}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                )}
                                {!['application/pdf', 'text/html'].includes(documentoModal.mimetype) &&
                                 !documentoModal.mimetype?.startsWith('video/') &&
                                 !documentoModal.mimetype?.startsWith('image/') && (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                                        <div className="text-6xl mb-4">📄</div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                            Tipo de arquivo não suportado para visualização
                                        </h3>
                                        <p className="text-gray-600 mb-4">MIME Type: {documentoModal.mimetype}</p>
                                        <button
                                            onClick={() => {
                                                const attrs = processo.documento.find(d =>
                                                    (d.attributes?.id || d.attributes?.idDocumento) &&
                                                    (d.attributes?.descricao === documentoModal.descricao || d.attributes?.nome === documentoModal.descricao)
                                                )?.attributes;
                                                if (attrs) {
                                                    handleDownloadDocumento(attrs.id || attrs.idDocumento);
                                                }
                                            }}
                                            className="btn btn-primary"
                                        >
                                            📥 Baixar Arquivo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
}

export default Processos;
