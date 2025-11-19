// Verificar se já está logado
if (localStorage.getItem('mni_token')) {
    window.location.href = 'index.html';
}

const loginForm = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const alertContainer = document.getElementById('alert-container');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const idConsultante = document.getElementById('idConsultante').value.trim();
    const senhaConsultante = document.getElementById('senhaConsultante').value;
    let idRepresentado = document.getElementById('idRepresentado').value.trim();

    // Validações básicas
    if (!idConsultante || !senhaConsultante) {
        showAlert('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    // Validar CPF (11 dígitos) ou sigla (sem limite de tamanho)
    // CPF: exatamente 11 dígitos
    // Sigla: mínimo 3 caracteres, pode conter letras, números, pontos (.), underscores (_), hífens (-)
    // Exemplos: RS0099569A, ENT.ESTAD_SP_DPE, OAB-SP-12345, MUITO_LONGA_SIGLA_COM_MUITOS_CARACTERES
    if (!/^\d{11}$/.test(idConsultante) && !/^[A-Za-z0-9._-]{3,}$/.test(idConsultante)) {
        showAlert('Informe um CPF com 11 dígitos ou uma sigla válida (mínimo 3 caracteres)', 'error');
        return;
    }

    // Validar idRepresentado (opcional)
    if (idRepresentado) {
        // Remover separadores para validação
        const idRepresentadoSemSeparadores = idRepresentado.replace(/[^\d]/g, '');

        // CPF tem 11 dígitos ou CNPJ tem 14 dígitos
        if (!/^\d{11}$/.test(idRepresentadoSemSeparadores) && !/^\d{14}$/.test(idRepresentadoSemSeparadores)) {
            showAlert('ID Representado inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)', 'error');
            return;
        }

        // Usar apenas os dígitos para a requisição
        idRepresentado = idRepresentadoSemSeparadores;
    } else {
        // Se deixado em branco, enviar null
        idRepresentado = null;
    }

    try {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Autenticando...';

        // Obter o sistema e ambiente selecionados na tela de login
        const selectSistemaLogin = document.getElementById('select-sistema-login');
        const selectAmbienteLogin = document.getElementById('select-ambiente-login');
        const sistemaSelecionado = selectSistemaLogin ? selectSistemaLogin.value : '1G_CIVIL';
        const ambienteSelecionado = selectAmbienteLogin ? selectAmbienteLogin.value : 'HML';

        // Salvar sistema e ambiente selecionados no localStorage
        localStorage.setItem('mni_sistema_selecionado', sistemaSelecionado);
        localStorage.setItem('mni_ambiente_selecionado', ambienteSelecionado);

        console.log('════════════════════════════════════════════════════════════');
        console.log('🔐 LOGIN - SISTEMA E AMBIENTE SELECIONADOS');
        console.log('════════════════════════════════════════════════════════════');
        console.log('Sistema selecionado:', sistemaSelecionado);
        console.log('Ambiente selecionado:', ambienteSelecionado);
        console.log('Usuário:', idConsultante);
        console.log('═══════════════════════════════════════════════════════════');

        // ⚠️ IMPORTANTE: Usar Civil para autenticação
        // (Execução Fiscal não suporta MNI 2.2, necessário para autenticação)
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

        // Adicionar idRepresentado apenas se foi preenchido
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
            localStorage.setItem('mni_token', data.token);
            localStorage.setItem('mni_user_id', data.user.id);

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

                // Salvar no localStorage para que o dashboard saiba qual sistema e ambiente usar
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
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Erro ao fazer login', 'error');
        }

    } catch (error) {
        console.error('Erro no login:', error);
        showAlert('Erro ao conectar com o servidor. Verifique se o backend está rodando.', 'error');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar no Sistema';
    }
});

function showAlert(message, type = 'info') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;

    // Auto-remover após 5 segundos
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}

