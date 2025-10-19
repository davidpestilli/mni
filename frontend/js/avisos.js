const avisosContainer = document.getElementById('avisos-container');
const avisosLoading = document.getElementById('avisos-loading');
const btnRefreshAvisos = document.getElementById('btn-refresh-avisos');

btnRefreshAvisos.addEventListener('click', carregarAvisos);

async function carregarAvisos() {
    try {
        avisosContainer.innerHTML = '';
        showLoading(avisosLoading);

        const response = await apiRequest('/api/avisos');
        const data = await response.json();

        if (data.success) {
            renderizarAvisos(data.data);
        } else {
            showError(avisosContainer, data.message || 'Erro ao carregar avisos');
        }

    } catch (error) {
        console.error('Erro ao carregar avisos:', error);
        showError(avisosContainer, 'Erro ao conectar com o servidor');
    } finally {
        hideLoading(avisosLoading);
    }
}

async function renderizarAvisos(avisos) {
    if (!avisos || avisos.length === 0) {
        avisosContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-message">Nenhum aviso pendente</div>
                <div class="empty-state-description">Você não possui intimações ou citações pendentes no momento</div>
            </div>
        `;
        return;
    }

    // Mapear avisos com descrições de classe
    const avisosComDescricao = await Promise.all(avisos.map(async (aviso) => {
        const codigoClasse = aviso.classeProcessual || '';
        const descricaoClasse = codigoClasse ? await buscarDescricaoClasse(codigoClasse) : 'N/A';
        return {
            ...aviso,
            descricaoClasse: descricaoClasse
        };
    }));

    const html = `
        <div class="avisos-list">
            ${avisosComDescricao.map(aviso => criarCardAviso(aviso)).join('')}
        </div>
    `;

    avisosContainer.innerHTML = html;
}

function criarCardAviso(aviso) {
    const statusClass = aviso.status === 'Aberto' ? 'badge-aberto' : 'badge-aguardando';
    const numeroFormatado = formatarNumeroProcesso(aviso.numeroProcesso);
    const tipoBadgeClass = aviso.tipoComunicacao === 'INT' ? 'badge-intimacao' : 'badge-citacao';

    // Usar descrição se disponível, caso contrário usar código
    const classeExibir = aviso.descricaoClasse || aviso.classeProcessual || 'N/A';
    const codigoClasse = aviso.classeProcessual || '';
    const mostrarCodigo = codigoClasse && aviso.descricaoClasse && codigoClasse !== aviso.descricaoClasse;

    return `
        <div class="aviso-card">
            <div class="aviso-header">
                <div>
                    <div class="aviso-numero">${numeroFormatado}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        ${aviso.nomeDestinatario || ''} ${aviso.documentoDestinatario ? '- ' + aviso.documentoDestinatario : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span class="badge ${tipoBadgeClass}">${aviso.descricaoMovimento || 'N/A'}</span>
                    <span class="badge ${statusClass}">${aviso.status}</span>
                </div>
            </div>

            <div class="aviso-info">
                <div class="aviso-info-item">
                    <span class="aviso-info-label">Data Disponibilização:</span>
                    <span class="aviso-info-value">${aviso.dataDisponibilizacao || 'N/A'}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">Órgão Julgador:</span>
                    <span class="aviso-info-value">${aviso.orgaoJulgador || 'N/A'}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">Classe:</span>
                    <span class="aviso-info-value">${classeExibir}${mostrarCodigo ? ` <span style="color: #999; font-size: 12px;">(${codigoClasse})</span>` : ''}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">ID Aviso:</span>
                    <span class="aviso-info-value">${aviso.idAviso || 'N/A'}</span>
                </div>
            </div>

            <button
                class="btn btn-primary btn-small"
                onclick="verDetalhesAviso('${aviso.numeroProcesso}', '${aviso.identificadorMovimento}')"
            >
                Ver Detalhes
            </button>
        </div>
    `;
}

async function verDetalhesAviso(numeroProcesso, identificadorMovimento) {
    try {
        const response = await apiRequest(`/api/avisos/${numeroProcesso}/${identificadorMovimento}`);
        const data = await response.json();

        if (data.success) {
            alert('Detalhes do aviso:\n\n' + JSON.stringify(data.data, null, 2));
            // TODO: Criar modal ou página de detalhes mais elaborada

            // Recarregar avisos para atualizar status
            carregarAvisos();
        } else {
            alert('Erro: ' + (data.message || 'Erro ao consultar teor'));
        }

    } catch (error) {
        console.error('Erro ao ver detalhes:', error);
        alert('Erro ao conectar com o servidor');
    }
}
