// Verificar autenticação
if (!getToken()) {
    window.location.href = 'login.html';
}

// Mostrar nome do usuário
document.getElementById('user-name').textContent = getUserId();

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

// Carregar avisos ao abrir a página
window.addEventListener('load', () => {
    carregarAvisos();
});
