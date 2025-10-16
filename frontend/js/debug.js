const debugContainer = document.getElementById('debug-container');
const debugLoading = document.getElementById('debug-loading');
const btnRefreshLogs = document.getElementById('btn-refresh-logs');
const btnClearLogs = document.getElementById('btn-clear-logs');

btnRefreshLogs.addEventListener('click', carregarLogs);
btnClearLogs.addEventListener('click', limparLogs);

async function carregarLogs() {
    try {
        debugContainer.innerHTML = '';
        showLoading(debugLoading);

        const response = await fetch('/api/debug/soap/logs');
        const data = await response.json();

        if (data.success) {
            renderizarLogs(data.data);
        } else {
            showError(debugContainer, data.message || 'Erro ao carregar logs');
        }

    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        showError(debugContainer, 'Erro ao conectar com o servidor');
    } finally {
        hideLoading(debugLoading);
    }
}

async function limparLogs() {
    if (!confirm('Deseja limpar todos os logs SOAP?')) {
        return;
    }

    try {
        const response = await fetch('/api/debug/soap/logs', {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showSuccess(debugContainer, data.message);
            setTimeout(carregarLogs, 500);
        } else {
            showError(debugContainer, data.message || 'Erro ao limpar logs');
        }

    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        showError(debugContainer, 'Erro ao conectar com o servidor');
    }
}

function renderizarLogs(logs) {
    if (!logs || logs.length === 0) {
        debugContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-message">Nenhum log SOAP disponível</div>
                <div class="empty-state-description">
                    Realize operações (consultas, peticionamentos) para gerar logs SOAP.
                </div>
            </div>
        `;
        return;
    }

    const html = `
        <div style="margin-bottom: 20px;">
            <strong>Total de logs:</strong> ${logs.length}
        </div>
        <div class="logs-list">
            ${logs.map((log, index) => criarCardLog(log, index)).join('')}
        </div>
    `;

    debugContainer.innerHTML = html;
}

function criarCardLog(log, index) {
    const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
    const statusColor = log.statusCode === 200 ? '#28a745' : '#dc3545';

    // Tentar formatar XML de forma legível
    const requestFormatted = formatarXML(log.request);
    const responseFormatted = formatarXML(log.response);

    return `
        <div class="log-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <strong style="font-size: 16px;">Log #${logs.length - index}</strong>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <span style="color: #666; font-size: 14px;">${timestamp}</span>
                    <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        Status: ${log.statusCode || 'N/A'}
                    </span>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #0056b3;">📤 Requisição SOAP</strong>
                    <button onclick="copiarTexto('${escapeHtml(log.request)}', this)" class="btn-copy" style="padding: 5px 10px; font-size: 12px;">
                        📋 Copiar
                    </button>
                </div>
                <pre style="background: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 11px; max-height: 300px; border: 1px solid #ddd;">${escapeHtml(requestFormatted)}</pre>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #28a745;">📥 Resposta SOAP</strong>
                    <button onclick="copiarTexto('${escapeHtml(log.response)}', this)" class="btn-copy" style="padding: 5px 10px; font-size: 12px;">
                        📋 Copiar
                    </button>
                </div>
                <pre style="background: #fff; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 11px; max-height: 300px; border: 1px solid #ddd;">${escapeHtml(responseFormatted)}</pre>
            </div>
        </div>
    `;
}

function formatarXML(xml) {
    if (!xml) return 'N/A';

    try {
        // Tentar formatar o XML para melhor leitura
        const formatted = xml
            .replace(/></g, '>\n<')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .join('\n');

        return formatted;
    } catch (error) {
        return xml;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '\\n'); // Escapar quebras de linha para usar no onclick
}

function copiarTexto(texto, botao) {
    // Decodificar HTML entities
    const textArea = document.createElement('textarea');
    textArea.innerHTML = texto.replace(/\\n/g, '\n'); // Restaurar quebras de linha
    const textoDecodificado = textArea.value;

    navigator.clipboard.writeText(textoDecodificado).then(() => {
        const textoOriginal = botao.textContent;
        botao.textContent = '✓ Copiado!';
        botao.style.background = '#28a745';
        botao.style.color = 'white';

        setTimeout(() => {
            botao.textContent = textoOriginal;
            botao.style.background = '';
            botao.style.color = '';
        }, 2000);
    }).catch(err => {
        alert('Erro ao copiar: ' + err);
    });
}
