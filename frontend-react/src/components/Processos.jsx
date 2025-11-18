import { useState } from 'react';
import { apiRequest, formatarNumeroProcesso, limparNumeroProcesso, downloadBase64File, formatarDataHoraMNI, buscarDescricaoClasse, buscarDescricaoAssunto } from '../utils/utils';

function Processos() {
    const [numeroProcesso, setNumeroProcesso] = useState('');
    const [chaveConsulta, setChaveConsulta] = useState('');
    const [dataReferencia, setDataReferencia] = useState('');
    const [loading, setLoading] = useState(false);
    const [processo, setProcesso] = useState(null);
    const [error, setError] = useState(null);
    const [processoEnriquecido, setProcessoEnriquecido] = useState(null);
    const [documentoModal, setDocumentoModal] = useState(null);

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
                    // Converter data se necessário
                    params.append('dataInicial', dataReferencia);
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
                    params.append('dataReferencia', dataReferencia);
                }
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('[PROCESSOS] URL final:', url);

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && data.data) {
                setProcesso(data.data);
                // Enriquecer dados do processo
                await enriquecerProcesso(data.data);
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

    const handleDownloadDocumento = async (documentoId) => {
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
                downloadBase64File(data.data.conteudo, `documento_${documentoId}.pdf`);
            }
        } catch (error) {
            console.error('Erro ao baixar documento:', error);
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

            const response = await apiRequest(url);
            const data = await response.json();

            if (data.success && data.data.conteudo) {
                setDocumentoModal({
                    loading: false,
                    descricao,
                    conteudo: data.data.conteudo,
                    mimetype: data.data.mimetype || mimetype
                });
            } else {
                throw new Error(data.message || 'Erro ao carregar documento');
            }
        } catch (error) {
            console.error('Erro ao visualizar documento:', error);
            alert('Erro ao carregar documento: ' + error.message);
            setDocumentoModal(null);
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
                rito,
                dataAjuizamento,
                assuntosComDescricao
            });

        } catch (error) {
            console.error('Erro ao enriquecer processo:', error);
        }
    };

    const formatarDataMNI = (dataMNI) => {
        if (!dataMNI || dataMNI.length < 8) return 'N/A';
        const ano = dataMNI.substr(0, 4);
        const mes = dataMNI.substr(4, 2);
        const dia = dataMNI.substr(6, 2);
        return `${dia}/${mes}/${ano}`;
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
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Consultar Processo</h2>

            <div className="card max-w-2xl">
                <div className="space-y-4">
                    <div>
                        <label className="label">Número do Processo (20 dígitos)</label>
                        <input
                            type="text"
                            value={numeroProcesso}
                            onChange={(e) => setNumeroProcesso(e.target.value)}
                            className="input"
                            placeholder="Ex: 12345678901234567890"
                            maxLength="20"
                        />
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
                            type="text"
                            value={dataReferencia}
                            onChange={(e) => setDataReferencia(e.target.value)}
                            className="input"
                            placeholder="Ex: 12/03/2025 ou 12/03/2025 17:45:10"
                            maxLength="19"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Retorna apenas movimentos a partir desta data
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
                                        return (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-indigo-500">
                                                <div className="font-medium text-gray-900">{attrs.descricao || 'Sem descrição'}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {attrs.dataHora ? new Date(
                                                        attrs.dataHora.substr(0,4),
                                                        parseInt(attrs.dataHora.substr(4,2))-1,
                                                        attrs.dataHora.substr(6,2),
                                                        attrs.dataHora.substr(8,2),
                                                        attrs.dataHora.substr(10,2),
                                                        attrs.dataHora.substr(12,2)
                                                    ).toLocaleString('pt-BR') : 'N/A'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Documentos */}
                    {(() => {
                        const documentos = processo.documento ? (Array.isArray(processo.documento) ? processo.documento : [processo.documento]) : [];

                        if (documentos.length === 0) return null;

                        return (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <span>📎</span>
                                    <span>Documentos ({documentos.length})</span>
                                </h4>
                                <div className="space-y-2">
                                    {documentos.map((doc, index) => {
                                        const attrs = doc.attributes || doc;
                                        const mime = attrs.mimetype || doc.conteudo?.mimetype || 'N/A';
                                        const descricao = attrs.descricao || attrs.nome || `Documento ${index + 1}`;

                                        return (
                                            <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="font-medium">{descricao}</div>
                                                    <div className="text-xs text-gray-500">{mime}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleVisualizarDocumento(attrs.id || attrs.idDocumento, descricao, mime)}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        👁️ Ver
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadDocumento(attrs.id || attrs.idDocumento)}
                                                        className="btn btn-primary btn-sm"
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
                    })()}
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
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{documentoModal.descricao}</h3>
                                    <p className="text-sm text-gray-500">{documentoModal.mimetype}</p>
                                </div>
                                <button
                                    onClick={() => setDocumentoModal(null)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
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
    );
}

export default Processos;
