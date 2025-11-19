/**
 * Gerenciador de Ambiente (HML/PROD) e Sistema (1G_CIVIL/1G_EXEC_FISCAL) - Frontend
 */

// Suporta apenas a tela de login (seletores removidos do dashboard)
const selectSistema = document.getElementById('select-sistema-login');
const selectAmbiente = document.getElementById('select-ambiente-login');
const ambienteStatus = document.getElementById('ambiente-status-login');

// Configuração dos sistemas e ambientes suportados
const SISTEMAS_CONFIG = {
    '1G_CIVIL': {
        nome: 'Primeiro Grau Civil',
        ambientesDisponiveis: ['HML', 'PROD']
    },
    '1G_EXEC_FISCAL': {
        nome: 'Primeiro Grau Execução Fiscal',
        ambientesDisponiveis: ['HML']
    },
    '2G_CIVIL': {
        nome: 'Segundo Grau Civil (Instância Recursal)',
        ambientesDisponiveis: ['HML']
    }
};

// Verificar se os elementos existem antes de adicionar listeners
if (selectAmbiente && ambienteStatus) {
    /**
     * Inicializar ao carregar a página
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar opções de ambiente baseado no sistema padrão
        if (selectSistema) {
            atualizarOpcoesAmbiente(selectSistema.value);
        }

        // Se estamos na tela de login, atualizar status visual
        if (document.getElementById('login-form')) {
            const ambiente = selectAmbiente.value === 'PROD' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO';
            const sistema = selectSistema ? selectSistema.value : '1G_CIVIL';
            atualizarStatusAmbiente(ambiente, sistema);
        } else {
            // Se estamos no dashboard, sincronizar com backend
            carregarAmbienteAtual();
        }
    });

    /**
     * Evento de mudança de sistema (se disponível)
     */
    if (selectSistema) {
        selectSistema.addEventListener('change', async (e) => {
            const novoSistema = e.target.value;

            // Se estamos na tela de login, apenas atualizar o status visual
            if (document.getElementById('login-form')) {
                // Atualizar status visual apenas
                const ambiente = selectAmbiente.value === 'PROD' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO';
                atualizarStatusAmbiente(ambiente, novoSistema);
                // Salvar a seleção no localStorage
                localStorage.setItem('mni_sistema_selecionado', novoSistema);
                notificarAmbiente(`✅ Sistema selecionado: ${SISTEMAS_CONFIG[novoSistema].nome}`, 'success');
            } else {
                // Se estamos no dashboard, fazer a mudança real
                await mudarSistema(novoSistema);
            }
        });
    }

    /**
     * Evento de mudança de ambiente
     */
    selectAmbiente.addEventListener('change', async (e) => {
        const novoAmbiente = e.target.value;
        // Salvar a seleção no localStorage
        localStorage.setItem('mni_ambiente_selecionado', novoAmbiente);
        await mudarAmbiente(novoAmbiente);
    });
}

/**
 * Carregar ambiente e sistema atual do backend
 */
async function carregarAmbienteAtual() {
    try {
        const response = await fetch('/api/ambiente');
        const data = await response.json();

        if (data.success) {
            const ambiente = data.data.ambiente;
            const sistema = data.data.sistema;

            // Atualizar select de ambiente
            selectAmbiente.value = ambiente === 'HOMOLOGAÇÃO' ? 'HML' : 'PROD';

            // Atualizar select de sistema
            if (selectSistema && sistema) {
                selectSistema.value = sistema.sistema;
                // Salvar sistema no localStorage para que avisos.js possa usar a URL correta
                localStorage.setItem('mni_sistema_atual', sistema.sistema);
                atualizarOpcoesAmbiente(sistema.sistema);
            }

            // Atualizar status com informação do sistema
            atualizarStatusAmbiente(ambiente, sistema.sistema);
        }
    } catch (error) {
        console.error('[AMBIENTE] Erro ao carregar ambiente:', error);
        ambienteStatus.textContent = '❌ Erro';
    }
}

/**
 * Mudar sistema
 */
async function mudarSistema(novoSistema) {
    try {
        ambienteStatus.textContent = '⏳';
        selectSistema.disabled = true;
        selectAmbiente.disabled = true;

        // Preparar corpo com sistema e ambiente atual
        const ambienteAtual = selectAmbiente.value;
        const requestBody = {
            sistema: novoSistema,
            ambiente: ambienteAtual
        };

        const response = await fetch('/api/ambiente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.success) {
            const sistema = data.data.sistema;
            const ambiente = data.data.ambiente;

            // Salvar sistema e ambiente no localStorage
            localStorage.setItem('mni_sistema_atual', novoSistema);
            localStorage.setItem('mni_sistema_selecionado', novoSistema);
            localStorage.setItem('mni_ambiente_selecionado', ambienteAtual);
            localStorage.setItem('mni_ambiente_atual', ambiente);

            // Atualizar seleções
            atualizarOpcoesAmbiente(novoSistema);
            selectAmbiente.value = ambiente === 'PRODUÇÃO' ? 'PROD' : 'HML';

            // Atualizar status com informação do sistema
            atualizarStatusAmbiente(ambiente, novoSistema);

            notificarAmbiente(`✅ Sistema alterado para ${sistema.nome}`, 'success');
            console.log('[SISTEMA] Sistema alterado, endpoints:', data.data.endpoints);
        } else {
            notificarAmbiente(`❌ Erro: ${data.message}`, 'error');
            carregarAmbienteAtual(); // Recarregar valor anterior
        }
    } catch (error) {
        console.error('[SISTEMA] Erro ao mudar sistema:', error);
        notificarAmbiente('❌ Erro ao mudar sistema', 'error');
        carregarAmbienteAtual();
    } finally {
        selectSistema.disabled = false;
        selectAmbiente.disabled = false;
    }
}

/**
 * Atualizar opções de ambiente baseado no sistema selecionado
 */
function atualizarOpcoesAmbiente(sistema) {
    const config = SISTEMAS_CONFIG[sistema];

    if (!config) {
        return;
    }

    // Desabilitar opções que não são suportadas
    const opcoesProd = selectAmbiente.querySelector('option[value="PROD"]');

    if (config.ambientesDisponiveis.includes('PROD')) {
        // PROD está disponível
        if (opcoesProd) {
            opcoesProd.disabled = false;
            opcoesProd.textContent = '🚀 Produção (PROD)';
        }
    } else {
        // PROD não está disponível
        if (opcoesProd) {
            opcoesProd.disabled = true;
            opcoesProd.textContent = '🚀 Produção (PROD) - Indisponível';
        }
        // Forçar HML se PROD está selecionado
        if (selectAmbiente.value === 'PROD') {
            selectAmbiente.value = 'HML';
        }
    }
}

/**
 * Mudar ambiente
 */
async function mudarAmbiente(novoAmbiente) {
    try {
        ambienteStatus.textContent = '⏳';
        selectAmbiente.disabled = true;

        const response = await fetch('/api/ambiente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ambiente: novoAmbiente
            })
        });

        const data = await response.json();

        if (data.success) {
            const ambiente = data.data.ambiente;
            const sistema = data.data.sistema ? data.data.sistema.sistema : null;

            // Salvar ambiente no localStorage
            localStorage.setItem('mni_ambiente_atual', ambiente);

            atualizarStatusAmbiente(ambiente, sistema);
            notificarAmbiente(`✅ Ambiente alterado para ${ambiente}`, 'success');
            console.log('[AMBIENTE] Endpoints atualizados:', data.data.endpoints);
        } else {
            notificarAmbiente(`❌ Erro: ${data.message}`, 'error');
            carregarAmbienteAtual(); // Recarregar valor anterior
        }
    } catch (error) {
        console.error('[AMBIENTE] Erro ao mudar ambiente:', error);
        notificarAmbiente('❌ Erro ao mudar ambiente', 'error');
        carregarAmbienteAtual();
    } finally {
        selectAmbiente.disabled = false;
    }
}

/**
 * Atualizar status visual do ambiente e sistema
 */
function atualizarStatusAmbiente(ambiente, sistema = null) {
    // Determinar emoji do sistema se não fornecido
    let emojiSistema = '⚖️'; // Civil por padrão
    if (sistema === '1G_EXEC_FISCAL') {
        emojiSistema = '💰';
    } else if (sistema === '2G_CIVIL') {
        emojiSistema = '🏛️';
    } else if (selectSistema && !sistema) {
        const sistemaSelecionado = selectSistema.value;
        if (sistemaSelecionado === '1G_EXEC_FISCAL') {
            emojiSistema = '💰';
        } else if (sistemaSelecionado === '2G_CIVIL') {
            emojiSistema = '🏛️';
        } else {
            emojiSistema = '⚖️';
        }
    }

    if (ambiente === 'HOMOLOGAÇÃO') {
        ambienteStatus.textContent = `${emojiSistema} HML`;
        ambienteStatus.style.background = '#e8f4f8';
        ambienteStatus.style.color = '#0277bd';
    } else if (ambiente === 'PRODUÇÃO') {
        ambienteStatus.textContent = `${emojiSistema} PROD`;
        ambienteStatus.style.background = '#fff3e0';
        ambienteStatus.style.color = '#e65100';
    }
}

/**
 * Mostrar notificação (reutiliza função global se disponível, ou usa console)
 */
function notificarAmbiente(mensagem, tipo) {
    // Tentar chamar a função global de notificação se existir
    if (typeof window.mostrarNotificacao === 'function' && window.mostrarNotificacao !== notificarAmbiente) {
        window.mostrarNotificacao(mensagem, tipo);
    } else {
        // Fallback para console
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    }
}
