// Verificar autenticação
if (!getToken()) {
    window.location.href = 'login.html';
}

// Mostrar nome do usuário
document.getElementById('user-name').textContent = getUserId();

// Mostrar logs de ambiente ao carregar dashboard
async function mostrarAmbienteAtivo() {
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
        }
    } catch (error) {
        console.error('❌ Erro ao carregar ambiente:', error);
    }
}

// Chamar ao carregar a página
mostrarAmbienteAtivo();

// Gerenciar tabs
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Remover classe active de todas as tabs
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));

        // Adicionar classe active na tab clicada
        tab.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    });
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
        localStorage.removeItem('mni_token');
        localStorage.removeItem('mni_user_id');
        window.location.href = 'login.html';
    }
});

// DESABILITADO: Carregamento automático removido - usar apenas botão manual
// window.addEventListener('load', () => {
//     carregarAvisos();
// });
