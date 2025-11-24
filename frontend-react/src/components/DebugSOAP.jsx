import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/utils';

function DebugSOAP() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    // Função para formatar XML (indentação)
    const formatarXML = (xml) => {
        if (!xml || typeof xml !== 'string') {
            return xml;
        }

        try {
            // Adicionar quebras de linha entre tags
            const reg = /(>)(<)(\/*)/g;
            let formatted = xml.replace(reg, '$1\n$2$3');
            let pad = 0;
            const lines = formatted.split('\n');

            // Adicionar indentação
            formatted = lines.map(line => {
                let indent = 0;

                // Tag auto-fechada ou tag com conteúdo na mesma linha
                if (line.match(/.+<\/\w[^>]*>$/)) {
                    indent = 0;
                }
                // Tag de fechamento
                else if (line.match(/^<\/\w/)) {
                    if (pad !== 0) {
                        pad -= 1;
                    }
                }
                // Tag de abertura
                else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) {
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

    useEffect(() => {
        carregarLogs();
    }, []);

    const carregarLogs = async () => {
        try {
            setLoading(true);
            const response = await apiRequest('/api/debug/soap/logs');
            const data = await response.json();

            if (data.success) {
                // Formatar XMLs antes de armazenar
                const logsFormatados = (data.data || []).map(log => ({
                    ...log,
                    request: formatarXML(log.request),
                    response: formatarXML(log.response)
                }));
                setLogs(logsFormatados);
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const limparLogs = async () => {
        if (!confirm('Deseja realmente limpar todos os logs?')) return;

        try {
            const response = await apiRequest('/api/debug/soap/logs', { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                setLogs([]);
                setSelectedLog(null);
            }
        } catch (error) {
            console.error('Erro ao limpar logs:', error);
        }
    };

    // Função para copiar XML
    const copiarXML = async (tipo) => {
        try {
            const xml = tipo === 'request' ? selectedLog.request : selectedLog.response;
            await navigator.clipboard.writeText(xml);
            alert(`✅ XML ${tipo === 'request' ? 'de requisição' : 'de resposta'} copiado!`);
        } catch (error) {
            console.error('Erro ao copiar XML:', error);
            alert('Erro ao copiar XML');
        }
    };

    // Função para baixar XML
    const baixarXML = (tipo) => {
        const xml = tipo === 'request' ? selectedLog.request : selectedLog.response;
        const operacao = selectedLog.operacao || 'operacao';
        const nomeArquivo = operacao.toLowerCase().replace(/\s+/g, '-');

        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}-${tipo}-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">🐛 Debug SOAP</h2>
                <div className="flex gap-2">
                    <button onClick={carregarLogs} className="btn btn-primary">
                        🔄 Atualizar
                    </button>
                    <button onClick={limparLogs} className="btn btn-danger">
                        🗑️ Limpar Logs
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="loading-spinner"></div>
                </div>
            ) : logs.length === 0 ? (
                <div className="empty-state">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-gray-700 font-medium">Nenhum log disponível</div>
                    <div className="text-gray-500 text-sm">Faça algumas requisições SOAP para visualizar os logs</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Lista de Logs */}
                    <div className="lg:col-span-1 space-y-2">
                        <h3 className="font-semibold mb-2">Histórico ({logs.length})</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {logs.map((log, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedLog(log)}
                                    className={`p-3 rounded-lg cursor-pointer border-2 ${
                                        selectedLog === log
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{log.operacao || 'Operação'}</div>
                                    <div className="text-xs text-gray-600">{log.timestamp || 'N/A'}</div>
                                    {log.erro && (
                                        <div className="text-xs text-red-600 mt-1">❌ Erro</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detalhes do Log */}
                    <div className="lg:col-span-2">
                        {selectedLog ? (
                            <div className="space-y-4">
                                {/* Header com informações do log */}
                                <div className="card">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        {selectedLog.operacao || 'Detalhes da Operação'}
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Timestamp:</span> {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}
                                    </div>
                                    {selectedLog.erro && (
                                        <div className="mt-2 px-3 py-2 bg-red-100 text-red-800 rounded text-sm font-medium">
                                            ❌ Esta operação resultou em erro
                                        </div>
                                    )}
                                </div>

                                {/* Requisição SOAP */}
                                {selectedLog.request && (
                                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 p-4 flex items-center justify-between">
                                            <h4 className="text-md font-bold text-gray-700">
                                                📤 Requisição SOAP Enviada
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => copiarXML('request')}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                                                >
                                                    📋 Copiar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => baixarXML('request')}
                                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm transition-colors"
                                                >
                                                    💾 Baixar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4">
                                            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
{selectedLog.request}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Resposta SOAP */}
                                {selectedLog.response && (
                                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 p-4 flex items-center justify-between">
                                            <h4 className="text-md font-bold text-gray-700">
                                                📥 Resposta SOAP Recebida
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => copiarXML('response')}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
                                                >
                                                    📋 Copiar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => baixarXML('response')}
                                                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm transition-colors"
                                                >
                                                    💾 Baixar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4">
                                            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs font-mono max-h-96">
{selectedLog.response}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Detalhes do Erro */}
                                {selectedLog.erro && (
                                    <div className="border-2 border-red-300 rounded-lg overflow-hidden">
                                        <div className="bg-red-100 p-4">
                                            <h4 className="text-md font-bold text-red-700">
                                                ❌ Detalhes do Erro
                                            </h4>
                                        </div>
                                        <div className="bg-white p-4">
                                            <pre className="bg-red-50 text-red-800 p-4 rounded overflow-x-auto text-xs font-mono">
{selectedLog.erro}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="card empty-state">
                                <div className="text-4xl mb-2">👈</div>
                                <div className="text-gray-700 font-medium">Selecione um log para visualizar</div>
                                <div className="text-gray-500 text-sm">Escolha uma operação da lista ao lado para ver os XMLs de requisição e resposta</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DebugSOAP;
