import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/utils';
import { formatarNumeroProcesso, buscarDescricaoClasse, formatarDataHoraMNI } from '../utils/utils';

function Avisos() {
    const [avisosAguardando, setAvisosAguardando] = useState([]);
    const [prazosAbertos, setPrazosAbertos] = useState([]);
    const [loadingAguardando, setLoadingAguardando] = useState(false);
    const [loadingAbertos, setLoadingAbertos] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        carregarTodosAvisos();
    }, []);

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

            if (data.success) {
                await carregarTodosAvisos();
            }
        } catch (error) {
            console.error('Erro ao abrir prazo:', error);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Avisos Pendentes</h2>
                <button
                    onClick={carregarTodosAvisos}
                    className="btn btn-primary"
                    disabled={loadingAguardando || loadingAbertos}
                >
                    🔄 Atualizar Avisos
                </button>
            </div>

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
        </div>
    );
}

export default Avisos;
