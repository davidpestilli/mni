/**
 * Gerenciador de Ambiente (HML/PROD) - Frontend
 */

// Suporta tanto a tela de login quanto o dashboard
const selectAmbiente = document.getElementById('select-ambiente-login') || document.getElementById('select-ambiente');
const ambienteStatus = document.getElementById('ambiente-status-login') || document.getElementById('ambiente-status');

// Verificar se os elementos existem antes de adicionar listeners
if (selectAmbiente && ambienteStatus) {
    /**
     * Carregar ambiente atual ao abrir a página
     */
    document.addEventListener('DOMContentLoaded', () => {
        carregarAmbienteAtual();
    });

    /**
     * Evento de mudança de ambiente
     */
    selectAmbiente.addEventListener('change', async (e) => {
        const novoAmbiente = e.target.value;
        await mudarAmbiente(novoAmbiente);
    });
}

/**
 * Carregar ambiente atual do backend
 */
async function carregarAmbienteAtual() {
    try {
        const response = await fetch('/api/ambiente');
        const data = await response.json();

        if (data.success) {
            const ambiente = data.data.ambiente;
            selectAmbiente.value = ambiente === 'HOMOLOGAÇÃO' ? 'HML' : 'PROD';
            atualizarStatusAmbiente(ambiente);
        }
    } catch (error) {
        console.error('[AMBIENTE] Erro ao carregar ambiente:', error);
        ambienteStatus.textContent = '❌ Erro';
    }
}

/**
 * Mudar ambiente
 */
async function mudarAmbiente(novoAmbiente) {
    try {
        ambienteStatus.textContent = 'Alterando...';
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
            atualizarStatusAmbiente(ambiente);
            mostrarNotificacao(`✅ Ambiente alterado para ${ambiente}`, 'success');
            console.log('[AMBIENTE] Endpoints atualizados:', data.data.endpoints);
        } else {
            mostrarNotificacao(`❌ Erro: ${data.message}`, 'error');
            carregarAmbienteAtual(); // Recarregar valor anterior
        }
    } catch (error) {
        console.error('[AMBIENTE] Erro ao mudar ambiente:', error);
        mostrarNotificacao('❌ Erro ao mudar ambiente', 'error');
        carregarAmbienteAtual();
    } finally {
        selectAmbiente.disabled = false;
    }
}

/**
 * Atualizar status visual do ambiente
 */
function atualizarStatusAmbiente(ambiente) {
    if (ambiente === 'HOMOLOGAÇÃO') {
        ambienteStatus.textContent = '🏢 HML';
        ambienteStatus.style.background = '#e8f4f8';
        ambienteStatus.style.color = '#0277bd';
    } else if (ambiente === 'PRODUÇÃO') {
        ambienteStatus.textContent = '🚀 PROD';
        ambienteStatus.style.background = '#fff3e0';
        ambienteStatus.style.color = '#e65100';
    }
}

/**
 * Mostrar notificação (reutiliza função do app.js ou usa console)
 */
function mostrarNotificacao(mensagem, tipo) {
    if (typeof window.mostrarNotificacao === 'function') {
        // Se estamos no dashboard, use a função do app.js
        window.mostrarNotificacao(mensagem, tipo);
    } else {
        // Se estamos na tela de login, use console ou crie notificação simples
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    }
}
