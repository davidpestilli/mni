import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserId } from '../utils/utils';
import Avisos from './Avisos';
import Processos from './Processos';
import PeticionamentoInicial from './PeticionamentoInicial';
import Peticionamento from './Peticionamento';
import DebugSOAP from './DebugSOAP';

function Dashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('avisos');
    const [sistemaInfo, setSistemaInfo] = useState(null);

    useEffect(() => {
        mostrarAmbienteAtivo();
    }, []);

    const mostrarAmbienteAtivo = async () => {
        try {
            const response = await fetch('/api/ambiente');
            const data = await response.json();

            if (data.success) {
                console.log('════════════════════════════════════════════════════════════');
                console.log('🏠 DASHBOARD CARREGADO - AMBIENTE ATIVO');
                console.log('════════════════════════════════════════════════════════════');
                console.log('Usuário:', getUserId());
                console.log('Sistema:', data.data.sistema.nome);
                console.log('Sistema ID:', data.data.sistema.sistema);
                console.log('Ambiente:', data.data.ambiente);
                console.log('');
                console.log('📡 Endpoints MNI 2.2:');
                console.log('  URL:', data.data.mni2_2.endpoint);
                console.log('  Ambiente:', data.data.mni2_2.ambiente);
                console.log('');
                console.log('📡 Endpoints MNI 3.0:');
                console.log('  URL:', data.data.mni3_0.endpoint);
                console.log('  Ambiente:', data.data.mni3_0.ambiente);
                console.log('  Sistema:', data.data.mni3_0.sistema);
                console.log('═══════════════════════════════════════════════════════════');

                // Salvar sistema atual no localStorage
                localStorage.setItem('mni_sistema_atual', data.data.sistema.sistema);
                setSistemaInfo(data.data);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar ambiente:', error);
        }
    };

    const handleLogout = () => {
        if (confirm('Deseja realmente sair?')) {
            logout();
            navigate('/login');
        }
    };

    const tabs = [
        { id: 'avisos', label: 'Avisos Pendentes', icon: '📬' },
        { id: 'processos', label: 'Consultar Processo', icon: '🔍' },
        { id: 'peticionamento-inicial', label: 'Peticionamento Inicial', icon: '📄' },
        { id: 'peticionamento-intermediario', label: 'Peticionamento Intermediário', icon: '📝' },
        { id: 'debug', label: 'Debug SOAP', icon: '🐛' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">MNI Web App</h1>
                            {sistemaInfo && (
                                <p className="text-sm text-gray-600 mt-1">
                                    {sistemaInfo.sistema.nome} • {sistemaInfo.ambiente}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-700">
                                👤 {getUserId()}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="btn btn-secondary text-sm px-4 py-2"
                            >
                                Sair
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`tab ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div style={{ display: activeTab === 'avisos' ? 'block' : 'none' }}>
                    <Avisos />
                </div>
                <div style={{ display: activeTab === 'processos' ? 'block' : 'none' }}>
                    <Processos />
                </div>
                <div style={{ display: activeTab === 'peticionamento-inicial' ? 'block' : 'none' }}>
                    <PeticionamentoInicial />
                </div>
                <div style={{ display: activeTab === 'peticionamento-intermediario' ? 'block' : 'none' }}>
                    <Peticionamento />
                </div>
                <div style={{ display: activeTab === 'debug' ? 'block' : 'none' }}>
                    <DebugSOAP />
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
