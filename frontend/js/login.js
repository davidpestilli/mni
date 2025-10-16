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

    // Validações básicas
    if (!idConsultante || !senhaConsultante) {
        showAlert('Preencha todos os campos', 'error');
        return;
    }

    // Validar CPF (11 dígitos) ou sigla
    if (!/^\d{11}$/.test(idConsultante) && !/^[A-Za-z0-9]{3,20}$/.test(idConsultante)) {
        showAlert('CPF deve ter 11 dígitos ou forneça uma sigla válida', 'error');
        return;
    }

    try {
        btnLogin.disabled = true;
        btnLogin.textContent = 'Autenticando...';

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idConsultante,
                senhaConsultante
            })
        });

        const data = await response.json();

        if (data.success) {
            // Salvar token no localStorage
            localStorage.setItem('mni_token', data.token);
            localStorage.setItem('mni_user_id', data.user.id);

            showAlert('Login realizado com sucesso!', 'success');

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
        btnLogin.textContent = 'Entrar';
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
