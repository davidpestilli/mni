import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/utils';
import { formatarNumeroProcesso, buscarDescricaoClasse, formatarDataHoraMNI } from '../utils/utils';

function Avisos() {
    const [avisosAguardando, setAvisosAguardando] = useState([]);
    const [prazosAbertos, setPrazosAbertos] = useState([]);
    const [loadingAguardando, setLoadingAguardando] = useState(false);
    const [loadingAbertos, setLoadingAbertos] = useState(false);
    const [error, setError] = useState(null);
    const [soapDebug, setSoapDebug] = useState({ request: '', response: '', operacao: '', timestamp: null });
    const [soapExpanded, setSoapExpanded] = useState(false);
    const [toast, setToast] = useState(null);

    const carregarTodosAvisos = async () => {
        try {
            setLoadingAguardando(true);
            setLoadingAbertos(true);
            setError(null);

            const idRepresentado = localStorage.getItem('mni_representado_id');
            const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');
            const baseUrl = usarMNI3 ? '/api/avisos-v3' : '/api/avisos';

            let urlAguardando = `${baseUrl}?status=aguardando`;
            let urlAbertos = `${baseUrl}?status=abertos`;

            if (idRepresentado && !usarMNI3) {
                urlAguardando += `&idRepresentado=${encodeURIComponent(idRepresentado)}`;
                urlAbertos += `&idRepresentado=${encodeURIComponent(idRepresentado)}`;
            }

            const [respostaAguardando, respostaAbertos] = await Promise.all([
                apiRequest(urlAguardando),
                apiRequest(urlAbertos)
            ]);

            const dataAguardando = await respostaAguardando.json();
            const dataAbertos = await respostaAbertos.json();

            if (dataAguardando.success) {
                const avisosComDescricao = await Promise.all(dataAguardando.data.map(async (aviso) => ({
                    ...aviso,
                    descricaoClasse: aviso.classeProcessual ? await buscarDescricaoClasse(aviso.classeProcessual) : 'N/A'
                })));
                setAvisosAguardando(avisosComDescricao);
            }

            if (dataAbertos.success) {
                const prazosComDescricao = await Promise.all(dataAbertos.data.map(async (aviso) => ({
                    ...aviso,
                    descricaoClasse: aviso.classeProcessual ? await buscarDescricaoClasse(aviso.classeProcessual) : 'N/A'
                })));
                setPrazosAbertos(prazosComDescricao);
            }

            // Carregar XMLs de debug (priorizar dataAbertos que geralmente tem mais dados)
            const dataComXML = dataAbertos.debug ? dataAbertos : dataAguardando;
            if (dataComXML.debug && dataComXML.debug.xmlRequest && dataComXML.debug.xmlResponse) {
                console.log('[AVISOS] XMLs disponíveis na resposta');
                setSoapDebug({
                    request: formatarXML(dataComXML.debug.xmlRequest),
                    response: formatarXML(dataComXML.debug.xmlResponse),
                    operacao: 'Consulta de Avisos Pendentes',
                    timestamp: Date.now()
                });
            } else {
                console.log('[AVISOS] XMLs não disponíveis na resposta');
                setSoapDebug({ request: '', response: '', operacao: '', timestamp: null });
            }

        } catch (error) {
            console.error('Erro ao carregar avisos:', error);
            setError('Erro ao conectar com o servidor');
        } finally {
            setLoadingAguardando(false);
            setLoadingAbertos(false);
        }
    };

    const abrirPrazo = async (numeroProcesso, identificadorMovimento) => {
        try {
            setLoadingAbertos(true);
            const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');
            const baseUrl = usarMNI3 ? '/api/avisos-v3' : '/api/avisos';

            const response = await apiRequest(`${baseUrl}/${numeroProcesso}/${identificadorMovimento}`);
            const data = await response.json();

            console.log('[AVISOS - Abrir Prazo] Resposta completa:', data);
            console.log('[AVISOS - Abrir Prazo] Tem debug?', !!data.debug);
            console.log('[AVISOS - Abrir Prazo] Tem xmlRequest?', !!data.debug?.xmlRequest);
            console.log('[AVISOS - Abrir Prazo] Tem xmlResponse?', !!data.debug?.xmlResponse);

            if (data.success) {
                // Capturar XMLs da operação de abrir prazo
                if (data.debug && data.debug.xmlRequest && data.debug.xmlResponse) {
                    console.log('[AVISOS] ✅ XMLs de Abrir Prazo capturados e formatando...');
                    const timestamp = Date.now();
                    const xmlFormatado = {
                        request: formatarXML(data.debug.xmlRequest),
                        response: formatarXML(data.debug.xmlResponse),
                        operacao: `Abertura de Prazo - Processo ${numeroProcesso}`,
                        timestamp: timestamp
                    };
                    console.log('[AVISOS] ✅ XMLs formatados, primeiros 200 chars request:', xmlFormatado.request.substring(0, 200));
                    console.log('[AVISOS] ✅ XMLs formatados, primeiros 200 chars response:', xmlFormatado.response.substring(0, 200));
                    console.log('[AVISOS] ✅ Atualizando estado com timestamp:', timestamp);

                    // Forçar atualização com novo objeto
                    setSoapDebug(xmlFormatado);

                    // Expandir automaticamente a seção de debug
                    setSoapExpanded(true);

                    console.log('[AVISOS] ✅ Estado atualizado e seção expandida');

                    // Scroll para a seção de debug
                    setTimeout(() => {
                        const debugSection = document.querySelector('[data-testid="soap-debug"]');
                        if (debugSection) {
                            debugSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 100);
                } else {
                    console.log('[AVISOS] ⚠️ XMLs não disponíveis na resposta de Abrir Prazo');
                }

                // Exibir toast de sucesso
                mostrarToast('✅ Prazo aberto com sucesso!', 'success');

                // REMOVIDO: Não recarregar avisos automaticamente
                // await carregarTodosAvisos();
            } else {
                mostrarToast('❌ Erro ao abrir prazo: ' + (data.message || 'Erro desconhecido'), 'error');
            }
        } catch (error) {
            console.error('Erro ao abrir prazo:', error);
            mostrarToast('❌ Erro ao conectar com o servidor', 'error');
        } finally {
            setLoadingAbertos(false);
        }
    };

    const AvisoCard = ({ aviso, tipo }) => {
        const numeroFormatado = formatarNumeroProcesso(aviso.numeroProcesso);
        const tipoBadgeClass = aviso.tipoComunicacao === 'INT' ? 'badge-intimacao' : 'badge-citacao';

        return (
            <div className={`card ${tipo === 'aberto' ? 'border-l-4 border-green-600' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-lg font-semibold text-gray-900">{numeroFormatado}</div>
                        <div className="text-sm text-gray-600 mt-1">
                            {aviso.nomeDestinatario} {aviso.documentoDestinatario && `- ${aviso.documentoDestinatario}`}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className={`badge ${tipoBadgeClass}`}>{aviso.descricaoMovimento || 'N/A'}</span>
                        <span className={`badge ${tipo === 'aguardando' ? 'badge-awaiting' : 'badge-open'}`}>
                            {tipo === 'aguardando' ? '⏳ Aguardando' : '✅ Aberto'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                        <span className="text-gray-600">Data Disponibilização:</span>
                        <div className="font-medium">{aviso.dataDisponibilizacao || 'N/A'}</div>
                    </div>
                    <div>
                        <span className="text-gray-600">Órgão Julgador:</span>
                        <div className="font-medium">{aviso.orgaoJulgador || 'N/A'}</div>
                    </div>
                    <div>
                        <span className="text-gray-600">Classe:</span>
                        <div className="font-medium">{aviso.descricaoClasse}</div>
                    </div>
                    {tipo === 'aberto' && (
                        <>
                            <div>
                                <span className="text-gray-600">Prazo:</span>
                                <div className="font-medium">{aviso.prazo ? `${aviso.prazo} dias` : 'N/A'}</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Início do Prazo:</span>
                                <div className="font-medium">{aviso.inicioPrazo ? formatarDataHoraMNI(aviso.inicioPrazo) : 'N/A'}</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Final do Prazo:</span>
                                <div className="font-medium">{aviso.finalPrazo ? formatarDataHoraMNI(aviso.finalPrazo) : 'N/A'}</div>
                            </div>
                        </>
                    )}
                </div>

                {tipo === 'aguardando' && (
                    <button
                        onClick={() => abrirPrazo(aviso.numeroProcesso, aviso.identificadorMovimento)}
                        className="btn btn-primary btn-sm"
                    >
                        📂 Abrir Prazo
                    </button>
                )}
            </div>
        );
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
        a.download = `soap-avisos-pendentes-${tipo}-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Função para mostrar toast
    const mostrarToast = (mensagem, tipo = 'info') => {
        setToast({ mensagem, tipo });
        setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Avisos Pendentes</h2>
                <button
                    onClick={carregarTodosAvisos}
                    className="btn btn-primary"
                    disabled={loadingAguardando || loadingAbertos}
                >
                    {loadingAguardando || loadingAbertos ? '⏳ Consultando...' : '🔍 Consultar Avisos'}
                </button>
            </div>

            {!loadingAguardando && !loadingAbertos && avisosAguardando.length === 0 && prazosAbertos.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-blue-600 font-medium mb-2">👆 Clique no botão acima para consultar seus avisos pendentes</div>
                    <div className="text-blue-500 text-sm">A consulta não é mais automática. Use o botão para buscar avisos atualizados.</div>
                </div>
            )}

            {/* Avisos Aguardando */}
            <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-indigo-600">
                    ⏳ Prazos Aguardando Abertura
                </h3>
                {loadingAguardando ? (
                    <div className="flex justify-center py-12">
                        <div className="loading-spinner"></div>
                    </div>
                ) : avisosAguardando.length === 0 ? (
                    <div className="empty-state">
                        <div className="text-4xl mb-2">📭</div>
                        <div className="text-gray-700 font-medium">Nenhum prazo aguardando abertura</div>
                        <div className="text-gray-500 text-sm">Você não possui prazos aguardando abertura no momento</div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {avisosAguardando.map((aviso, index) => (
                            <AvisoCard key={index} aviso={aviso} tipo="aguardando" />
                        ))}
                    </div>
                )}
            </div>

            {/* Prazos Abertos */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-green-600">
                    ✅ Prazos Abertos
                </h3>
                {loadingAbertos ? (
                    <div className="flex justify-center py-12">
                        <div className="loading-spinner"></div>
                    </div>
                ) : prazosAbertos.length === 0 ? (
                    <div className="empty-state">
                        <div className="text-4xl mb-2">✅</div>
                        <div className="text-gray-700 font-medium">Nenhum prazo aberto</div>
                        <div className="text-gray-500 text-sm">Todos os seus prazos estão aguardando abertura</div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {prazosAbertos.map((aviso, index) => (
                            <AvisoCard key={index} aviso={aviso} tipo="aberto" />
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Debug SOAP XML */}
            {soapDebug.request && (
                <div
                    key={soapDebug.timestamp || Date.now()}
                    data-testid="soap-debug"
                    className="mt-8 border-2 border-gray-300 rounded-lg overflow-hidden"
                >
                    <div className="bg-gray-100 p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">
                                🔍 Debug SOAP - XML Completo
                            </h3>
                            {soapDebug.operacao && (
                                <p className="text-sm text-gray-600 mt-1">
                                    Operação: <span className="font-semibold">{soapDebug.operacao}</span>
                                </p>
                            )}
                        </div>
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

            {/* Toast de Notificação */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-medium animate-slide-in ${
                        toast.tipo === 'success' ? 'bg-green-600' :
                        toast.tipo === 'error' ? 'bg-red-600' :
                        'bg-blue-600'
                    }`}
                    style={{
                        animation: 'slideIn 0.3s ease-out'
                    }}
                >
                    {toast.mensagem}
                </div>
            )}
        </div>
    );
}

export default Avisos;
