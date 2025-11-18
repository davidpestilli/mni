import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, limparNumeroProcesso, fileToBase64, formatarCPF } from '../utils/utils';

function Peticionamento() {
    const [numeroProcesso, setNumeroProcesso] = useState('');
    const [tipoDocumento, setTipoDocumento] = useState('');
    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [descricao, setDescricao] = useState('');
    const [cpfSignatario, setCpfSignatario] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTipos, setLoadingTipos] = useState(false);
    const [sucesso, setSucesso] = useState(null);
    const [error, setError] = useState(null);

    // Resultado do peticionamento
    const [resultado, setResultado] = useState(null);
    const [soapDebug, setSoapDebug] = useState({ request: '', response: '' });
    const [soapExpanded, setSoapExpanded] = useState(false);

    const carregarTiposDocumento = async () => {
        try {
            setLoadingTipos(true);
            setError(null);

            // Verificar qual sistema está ativo
            const sistemaResponse = await apiRequest('/api/ambiente/info');
            const sistemaData = await sistemaResponse.json();
            const sistema = sistemaData.data?.sistema || 'CIVIL_1G';

            // Para Execução Fiscal (MNI 3.0), usar códigos fixos
            if (sistema === '1G_EXEC_FISCAL') {
                setTiposDocumento([
                    { codigo: '82400092', descricao: '82400092 - Petição (Execução Fiscal)' }
                ]);
                return;
            }

            // Para Primeiro Grau Civil (MNI 2.2), consultar normalmente
            const response = await apiRequest('/api/tabelas/TipoDocumento');
            const data = await response.json();

            if (data.success && data.data) {
                setTiposDocumento(data.data);
            } else {
                throw new Error(data.message || 'Erro ao carregar tipos');
            }
        } catch (error) {
            console.error('Erro ao carregar tipos de documento:', error);
            setError('Erro ao carregar tipos de documento. Você pode digitar o código manualmente.');
            // Permitir entrada manual em caso de erro
            setTiposDocumento([]);
        } finally {
            setLoadingTipos(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                setError('Apenas arquivos PDF são permitidos');
                return;
            }
            if (file.size > 11 * 1024 * 1024) {
                setError('Arquivo deve ter no máximo 11MB');
                return;
            }
            setArquivo(file);
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);
            setSucesso(null);

            const numeroLimpo = limparNumeroProcesso(numeroProcesso);

            if (!numeroLimpo || numeroLimpo.length !== 20) {
                setError('Número do processo deve conter 20 dígitos');
                return;
            }

            if (!tipoDocumento) {
                setError('Selecione o tipo de documento');
                return;
            }

            if (!arquivo) {
                setError('Selecione um arquivo PDF');
                return;
            }

            const conteudoBase64 = await fileToBase64(arquivo);
            const signatario = cpfSignatario.replace(/\D/g, '') || '';

            // Detectar qual sistema está ativo
            const sistemaResponse = await apiRequest('/api/ambiente/info');
            const sistemaData = await sistemaResponse.json();
            const sistema = sistemaData.data?.sistema || 'CIVIL_1G';
            const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');

            let response, data;

            if (usarMNI3) {
                // Usar MNI 3.0 (Execução Fiscal ou Segundo Grau)
                console.log('[PETICIONAMENTO] Usando MNI 3.0');

                const peticao = {
                    numeroProcesso: numeroLimpo,
                    codigoTipoDocumento: tipoDocumento, // String
                    documento: conteudoBase64,
                    nomeDocumento: arquivo.name,
                    mimetype: 'application/pdf',
                    descricaoDocumento: descricao || '',
                    cpfProcurador: signatario
                };

                response = await apiRequest('/api/mni3/peticao', {
                    method: 'POST',
                    body: JSON.stringify(peticao)
                });
            } else {
                // Usar MNI 2.2 (Primeiro Grau Civil)
                console.log('[PETICIONAMENTO] Usando MNI 2.2');

                const manifestacao = {
                    tipoDocumento: parseInt(tipoDocumento),
                    documento: conteudoBase64,
                    nomeDocumento: arquivo.name,
                    mimetype: 'application/pdf',
                    dataDocumento: new Date().toISOString(),
                    descricaoDocumento: descricao || '',
                    signatario: signatario
                };

                response = await apiRequest(`/api/processos/${numeroLimpo}/manifestacoes`, {
                    method: 'POST',
                    body: JSON.stringify(manifestacao)
                });
            }

            data = await response.json();

            if (data.success) {
                // Armazenar resultado completo
                setResultado(data.data);
                setSucesso('✅ Manifestação enviada com sucesso!');
                setError(null);

                // Buscar XMLs SOAP para debug
                await carregarSoapDebug();

                // Scroll para o resultado
                setTimeout(() => {
                    document.getElementById('resultado-intermediario')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);

                // Limpar formulário
                setNumeroProcesso('');
                setTipoDocumento('');
                setDescricao('');
                setCpfSignatario('');
                setArquivo(null);
            } else {
                setError(data.message || 'Erro ao enviar manifestação');
                setResultado(null);
            }

        } catch (error) {
            console.error('Erro ao enviar petição:', error);
            setError('Erro ao conectar com o servidor');
            setResultado(null);
        } finally {
            setLoading(false);
        }
    };

    // Função para carregar XMLs SOAP de debug
    const carregarSoapDebug = async () => {
        try {
            const response = await apiRequest('/api/peticionamento/debug/last-soap');
            const data = await response.json();

            if (data.success && data.data) {
                setSoapDebug({
                    request: formatarXML(data.data.request || 'Nenhuma requisição SOAP ainda'),
                    response: formatarXML(data.data.response || 'Nenhuma resposta SOAP ainda')
                });
            }
        } catch (error) {
            console.error('Erro ao carregar SOAP debug:', error);
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
        a.download = `soap-${tipo}-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Peticionamento</h2>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-3">📋 Tipos de Peticionamento</h3>
                    <div className="flex gap-4">
                        <Link
                            to="/peticionamento-inicial"
                            className="btn btn-primary"
                        >
                            📝 Peticionamento Inicial (Novo Processo)
                        </Link>
                        <span className="text-gray-600 self-center">ou</span>
                        <span className="text-gray-600 self-center">↓ Peticionamento Intermediário abaixo</span>
                    </div>
                </div>
            </div>

            <div className="card max-w-2xl">
                <h3 className="text-xl font-semibold mb-4">Peticionamento Intermediário</h3>
                <p className="text-gray-600 mb-6">Enviar manifestação em processo já existente</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Número do Processo (20 dígitos)</label>
                        <input
                            type="text"
                            value={numeroProcesso}
                            onChange={(e) => setNumeroProcesso(e.target.value)}
                            className="input"
                            placeholder="Ex: 12345678901234567890"
                            maxLength="20"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Tipo de Documento</label>
                        <div className="flex gap-2">
                            {tiposDocumento.length > 0 ? (
                                <select
                                    value={tipoDocumento}
                                    onChange={(e) => setTipoDocumento(e.target.value)}
                                    className="select flex-1"
                                    required
                                >
                                    <option value="">Selecione o tipo de documento</option>
                                    {tiposDocumento.map(tipo => (
                                        <option key={tipo.codigo} value={tipo.codigo}>
                                            {tipo.descricao}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={tipoDocumento}
                                    onChange={(e) => setTipoDocumento(e.target.value)}
                                    className="input flex-1"
                                    placeholder="Digite o código do tipo de documento (ex: 82400092)"
                                    required
                                />
                            )}
                            <button
                                type="button"
                                onClick={carregarTiposDocumento}
                                disabled={loadingTipos}
                                className="btn btn-primary"
                            >
                                {loadingTipos ? '...' : '🔄 Carregar'}
                            </button>
                        </div>
                        {tiposDocumento.length > 0 && (
                            <div className="text-sm text-green-600 mt-1">
                                ✓ {tiposDocumento.length} tipo(s) carregado(s)
                            </div>
                        )}
                        {tiposDocumento.length === 0 && !loadingTipos && (
                            <div className="text-sm text-gray-600 mt-1">
                                ℹ️ Clique em "🔄 Carregar" para buscar os tipos de documento ou digite o código manualmente
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="label">Descrição (opcional)</label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="input"
                            rows="3"
                            placeholder="Descrição da manifestação"
                        />
                    </div>

                    <div>
                        <label className="label">CPF do Signatário (opcional)</label>
                        <input
                            type="text"
                            value={cpfSignatario}
                            onChange={(e) => setCpfSignatario(formatarCPF(e.target.value))}
                            className="input"
                            placeholder="000.000.000-00"
                            maxLength="14"
                        />
                    </div>

                    <div>
                        <label className="label">Arquivo PDF</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="input"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Apenas PDF, máximo 11MB
                        </p>
                        {arquivo && (
                            <div className="mt-2 text-sm text-green-600">
                                ✓ {arquivo.name} ({(arquivo.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full"
                    >
                        {loading ? 'Enviando...' : '📤 Enviar Manifestação'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 bg-red-100 text-red-800 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {sucesso && (
                    <div className="mt-4 bg-green-100 text-green-800 p-4 rounded-lg">
                        {sucesso}
                    </div>
                )}

                {/* Resultado do Peticionamento */}
                {resultado && (
                    <div id="resultado-intermediario" className="mt-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                        <h3 className="text-xl font-bold text-green-800 mb-4">
                            ✅ Manifestação Enviada com Sucesso!
                        </h3>
                        <div className="space-y-2 text-gray-700">
                            <p>
                                <strong>Número do Protocolo:</strong>{' '}
                                <span className="text-blue-600 font-mono">{resultado.numeroProtocolo || 'N/A'}</span>
                            </p>
                            <p>
                                <strong>Data da Operação:</strong>{' '}
                                <span className="font-mono">{resultado.dataOperacao || 'N/A'}</span>
                            </p>
                            {resultado.mensagem && (
                                <p>
                                    <strong>Mensagem:</strong>{' '}
                                    <span className="text-gray-600">{resultado.mensagem}</span>
                                </p>
                            )}
                            {resultado.documentoComprovante && (
                                <p>
                                    <strong>Comprovante:</strong>{' '}
                                    <a
                                        href={`data:application/pdf;base64,${resultado.documentoComprovante}`}
                                        download="comprovante.pdf"
                                        className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                        📥 Baixar Comprovante PDF
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Debug SOAP XML */}
                {soapDebug.request && (
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
            </div>
        </div>
    );
}

export default Peticionamento;
