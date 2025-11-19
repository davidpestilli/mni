import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        idConsultante: '',
        senhaConsultante: '',
        idRepresentado: ''
    });
    const [sistema, setSistema] = useState('1G_CIVIL');
    const [ambiente, setAmbiente] = useState('HML');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        // Carregar preferências salvas
        const sistemaSalvo = localStorage.getItem('mni_sistema_selecionado');
        if (sistemaSalvo) setSistema(sistemaSalvo);

        const ambienteSalvo = localStorage.getItem('mni_ambiente_selecionado');
        if (ambienteSalvo) setAmbiente(ambienteSalvo);
    }, []);

    const showAlert = (message, type = 'info') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { idConsultante, senhaConsultante } = formData;
        let { idRepresentado } = formData;

        // Validações básicas
        if (!idConsultante || !senhaConsultante) {
            showAlert('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Validar CPF (11 dígitos) ou sigla
        if (!/^\d{11}$/.test(idConsultante) && !/^[A-Za-z0-9._-]{3,}$/.test(idConsultante)) {
            showAlert('Informe um CPF com 11 dígitos ou uma sigla válida (mínimo 3 caracteres)', 'error');
            return;
        }

        // Validar idRepresentado (opcional)
        if (idRepresentado) {
            const idRepresentadoSemSeparadores = idRepresentado.replace(/[^\d]/g, '');

            if (!/^\d{11}$/.test(idRepresentadoSemSeparadores) && !/^\d{14}$/.test(idRepresentadoSemSeparadores)) {
                showAlert('ID Representado inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)', 'error');
                return;
            }

            idRepresentado = idRepresentadoSemSeparadores;
        } else {
            idRepresentado = null;
        }

        try {
            setLoading(true);

            // Salvar sistema e ambiente selecionados no localStorage
            localStorage.setItem('mni_sistema_selecionado', sistema);
            localStorage.setItem('mni_ambiente_selecionado', ambiente);

            console.log('════════════════════════════════════════════════════════════');
            console.log('🔐 LOGIN - SISTEMA E AMBIENTE SELECIONADOS');
            console.log('════════════════════════════════════════════════════════════');
            console.log('Sistema selecionado:', sistema);
            console.log('Ambiente selecionado:', ambiente);
            console.log('Usuário:', idConsultante);
            console.log('═══════════════════════════════════════════════════════════');

            // Usar Civil para autenticação (Execução Fiscal não suporta MNI 2.2)
            try {
                await fetch('/api/ambiente', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sistema: '1G_CIVIL' })
                });
            } catch (error) {
                console.warn('[LOGIN] Aviso ao resetar sistema para Civil:', error.message);
            }

            const requestBody = {
                idConsultante,
                senhaConsultante
            };

            if (idRepresentado) {
                requestBody.idRepresentado = idRepresentado;
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success) {
                // Salvar token no localStorage
                login(data.token, data.user.id);

                // Salvar idRepresentado se foi informado
                if (data.user.idRepresentado) {
                    localStorage.setItem('mni_representado_id', data.user.idRepresentado);
                } else {
                    localStorage.removeItem('mni_representado_id');
                }

                showAlert('Login realizado com sucesso!', 'success');

                // Trocar para o sistema e ambiente selecionados na tela de login
                const sistemaSelecionado = localStorage.getItem('mni_sistema_selecionado') || '1G_CIVIL';
                const ambienteSelecionado = localStorage.getItem('mni_ambiente_selecionado') || 'HML';

                console.log('════════════════════════════════════════════════════════════');
                console.log('🔄 PÓS-LOGIN - CONFIGURAR SISTEMA E AMBIENTE');
                console.log('════════════════════════════════════════════════════════════');
                console.log('Sistema a ser ativado:', sistemaSelecionado);
                console.log('Ambiente a ser ativado:', ambienteSelecionado);

                try {
                    // Preparar corpo da requisição com sistema e ambiente
                    const ambienteRequestBody = {
                        sistema: sistemaSelecionado,
                        ambiente: ambienteSelecionado
                    };

                    const ambienteResponse = await fetch('/api/ambiente', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(ambienteRequestBody)
                    });
                    const ambienteData = await ambienteResponse.json();
                    console.log('Resposta do backend:', ambienteData);

                    localStorage.setItem('mni_sistema_atual', sistemaSelecionado);
                    localStorage.setItem('mni_ambiente_atual', ambienteSelecionado);

                    console.log('✅ Sistema ativado:', sistemaSelecionado);
                    console.log('✅ Ambiente ativado:', ambienteSelecionado);
                    console.log('Endpoints MNI 3.0:', ambienteData.data?.endpoints?.mni3_0);
                } catch (error) {
                    console.error('❌ Erro ao configurar sistema/ambiente:', error.message);
                }
                console.log('═══════════════════════════════════════════════════════════');

                // Redirecionar para dashboard
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);
            } else {
                showAlert(data.message || 'Erro ao fazer login', 'error');
            }

        } catch (error) {
            console.error('Erro no login:', error);
            showAlert('Erro ao conectar com o servidor. Verifique se o backend está rodando.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
            {/* Animated background effect */}
            <div className="fixed top-0 left-0 w-full h-full opacity-30 pointer-events-none"
                 style={{
                     background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                     backgroundSize: '50px 50px',
                     animation: 'moveBackground 20s linear infinite'
                 }}>
            </div>

            <style>{`
                @keyframes moveBackground {
                    0% { background-position: 0 0; }
                    100% { background-position: 50px 50px; }
                }
            `}</style>

            <div className="w-full max-w-lg relative z-10 animate-fade-in">
                <div className="bg-white bg-opacity-98 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white border-opacity-10">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-13 h-13 mx-auto mb-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">MNI Web App</h1>
                        <p className="text-sm text-gray-600">Modelo Nacional de Interoperabilidade</p>
                    </div>

                    {/* Alert */}
                    {alert && (
                        <div className={`mb-4 p-3 rounded-lg ${
                            alert.type === 'error' ? 'bg-red-100 text-red-800' :
                            alert.type === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                            {alert.message}
                        </div>
                    )}

                    {/* Environment Selector */}
                    <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sistema</label>
                            <select
                                value={sistema}
                                onChange={(e) => setSistema(e.target.value)}
                                className="select text-sm py-2"
                            >
                                <option value="1G_CIVIL">Civil 1º Grau</option>
                                <option value="1G_EXEC_FISCAL">Execução Fiscal</option>
                                <option value="2G_CIVIL">Civil 2º Grau</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ambiente</label>
                            <select
                                value={ambiente}
                                onChange={(e) => setAmbiente(e.target.value)}
                                className="select text-sm py-2"
                            >
                                <option value="HML">Homologação</option>
                                <option value="PROD">Produção</option>
                            </select>
                        </div>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="label">CPF ou Sigla do Consultante</label>
                            <input
                                type="text"
                                name="idConsultante"
                                value={formData.idConsultante}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ex: 12345678901 ou RS0099569A"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Senha</label>
                            <input
                                type="password"
                                name="senhaConsultante"
                                value={formData.senhaConsultante}
                                onChange={handleChange}
                                className="input"
                                placeholder="Senha de acesso"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">ID Representado (Opcional)</label>
                            <input
                                type="text"
                                name="idRepresentado"
                                value={formData.idRepresentado}
                                onChange={handleChange}
                                className="input"
                                placeholder="CPF ou CNPJ do representado"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Deixe em branco para visualizar todos os avisos
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3 mt-6"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="loading-spinner w-4 h-4"></span>
                                    Autenticando...
                                </span>
                            ) : 'Entrar no Sistema'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center text-xs text-gray-500">
                        <p>Desenvolvido para fins educacionais e de teste</p>
                        <p className="mt-1">⚠️ Não use em ambiente de produção</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
