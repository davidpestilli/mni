import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/utils';

function DebugSOAP() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        carregarLogs();
    }, []);

    const carregarLogs = async () => {
        try {
            setLoading(true);
            const response = await apiRequest('/api/debug/logs');
            const data = await response.json();

            if (data.success) {
                setLogs(data.data || []);
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
            const response = await apiRequest('/api/debug/logs', { method: 'DELETE' });
            const data = await response.json();

            if (data.success) {
                setLogs([]);
                setSelectedLog(null);
            }
        } catch (error) {
            console.error('Erro ao limpar logs:', error);
        }
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
                            <div className="card">
                                <h3 className="font-semibold mb-4">
                                    {selectedLog.operacao || 'Detalhes'}
                                </h3>

                                {selectedLog.request && (
                                    <div className="mb-4">
                                        <h4 className="font-medium text-sm text-gray-700 mb-2">📤 Request</h4>
                                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64">
                                            {selectedLog.request}
                                        </pre>
                                    </div>
                                )}

                                {selectedLog.response && (
                                    <div className="mb-4">
                                        <h4 className="font-medium text-sm text-gray-700 mb-2">📥 Response</h4>
                                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-64">
                                            {selectedLog.response}
                                        </pre>
                                    </div>
                                )}

                                {selectedLog.erro && (
                                    <div className="bg-red-50 p-3 rounded">
                                        <h4 className="font-medium text-sm text-red-700 mb-2">❌ Erro</h4>
                                        <pre className="text-xs text-red-800">{selectedLog.erro}</pre>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="card empty-state">
                                <div className="text-gray-500">Selecione um log para ver os detalhes</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DebugSOAP;
