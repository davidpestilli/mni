// ========================================
// AVISOS PENDENTES - Frontend
// ========================================
//
// ATUALIZAÇÃO: Agora com suporte a Prazos Abertos
//
// Fluxo:
// 1. Carregar avisos aguardando abertura (status padrão)
// 2. Carregar prazos abertos (com todosPrazos=true)
// 3. Exibir em duas seções separadas
// 4. Botão "Abrir Prazo" move aviso de aguardando para abertos

// Elementos do DOM - Avisos Aguardando Abertura
const avisosAguardandoContainer = document.getElementById('avisos-aguardando-container');
const avisosAguardandoLoading = document.getElementById('avisos-aguardando-loading');

// Elementos do DOM - Prazos Abertos
const prazosAbertosContainer = document.getElementById('prazos-abertos-container');
const prazosAbertosLoading = document.getElementById('prazos-abertos-loading');

// Elemento do DOM - Botão Atualizar
const btnRefreshAvisos = document.getElementById('btn-refresh-avisos');

// Adicionar listener ao botão
btnRefreshAvisos.addEventListener('click', carregarTodosAvisos);

// Carregar avisos ao abrir a página
window.addEventListener('load', () => {
    carregarTodosAvisos();
});

/**
 * Carregar todos os avisos (aguardando + abertos) em paralelo
 */
async function carregarTodosAvisos() {
    try {
        // Limpar containers
        avisosAguardandoContainer.innerHTML = '';
        prazosAbertosContainer.innerHTML = '';

        // Mostrar loaders
        showLoading(avisosAguardandoLoading);
        showLoading(prazosAbertosLoading);

        // Verificar se há idRepresentado armazenado
        let idRepresentado = localStorage.getItem('mni_representado_id');

        // Garantir que idRepresentado seja null se vazio
        idRepresentado = idRepresentado && idRepresentado.trim() ? idRepresentado.trim() : null;

        // Determinar qual versão MNI usar baseado no sistema atual
        const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
        const baseUrl = (sistema === '1G_EXEC_FISCAL') ? '/api/avisos-v3' : '/api/avisos';

        let urlAguardando = baseUrl + '?status=aguardando';
        let urlAbertos = baseUrl + '?status=abertos';

        // Adicionar idRepresentado à URL se foi armazenado (apenas para MNI 2.2)
        if (idRepresentado && sistema !== '1G_EXEC_FISCAL') {
            urlAguardando += `&idRepresentado=${encodeURIComponent(idRepresentado)}`;
            urlAbertos += `&idRepresentado=${encodeURIComponent(idRepresentado)}`;
        }

        // Fazer ambas as requisições em paralelo
        const [respostaAguardando, respostaAbertos] = await Promise.all([
            apiRequest(urlAguardando),
            apiRequest(urlAbertos)
        ]);

        const dataAguardando = await respostaAguardando.json();
        const dataAbertos = await respostaAbertos.json();

        // Renderizar avisos aguardando
        if (dataAguardando.success) {
            renderizarAvisosAguardando(dataAguardando.data);

            // Mostrar indicador de filtro se ativo
            if (idRepresentado) {
                exibirIndicadorFiltroRepresentado(idRepresentado);
            }
        } else {
            showError(avisosAguardandoContainer, dataAguardando.message || 'Erro ao carregar avisos');
        }

        // Renderizar prazos abertos
        if (dataAbertos.success) {
            renderizarPrazosAbertos(dataAbertos.data);
        } else {
            showError(prazosAbertosContainer, dataAbertos.message || 'Erro ao carregar prazos abertos');
        }

    } catch (error) {
        console.error('Erro ao carregar avisos:', error);
        showError(avisosAguardandoContainer, 'Erro ao conectar com o servidor');
    } finally {
        hideLoading(avisosAguardandoLoading);
        hideLoading(prazosAbertosLoading);
    }
}

/**
 * Renderizar avisos aguardando abertura
 */
async function renderizarAvisosAguardando(avisos) {
    if (!avisos || avisos.length === 0) {
        avisosAguardandoContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-message">Nenhum prazo aguardando abertura</div>
                <div class="empty-state-description">Você não possui prazos aguardando abertura no momento</div>
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
            ${avisosComDescricao.map(aviso => criarCardAvisoAguardando(aviso)).join('')}
        </div>
    `;

    avisosAguardandoContainer.innerHTML = html;
}

/**
 * Renderizar prazos abertos
 */
async function renderizarPrazosAbertos(avisos) {
    if (!avisos || avisos.length === 0) {
        prazosAbertosContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✅</div>
                <div class="empty-state-message">Nenhum prazo aberto</div>
                <div class="empty-state-description">Todos os seus prazos estão aguardando abertura</div>
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
            ${avisosComDescricao.map(aviso => criarCardPrazoAberto(aviso)).join('')}
        </div>
    `;

    prazosAbertosContainer.innerHTML = html;
}

/**
 * Criar card para aviso aguardando abertura
 * Botão: "Abrir Prazo" (antigo "Ver Detalhes")
 */
function criarCardAvisoAguardando(aviso) {
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
                    <span class="badge badge-aguardando">⏳ Aguardando</span>
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
                onclick="abrirPrazo('${aviso.numeroProcesso}', '${aviso.identificadorMovimento}')"
            >
                📂 Abrir Prazo
            </button>
        </div>
    `;
}

/**
 * Criar card para prazo aberto
 */
function criarCardPrazoAberto(aviso) {
    const numeroFormatado = formatarNumeroProcesso(aviso.numeroProcesso);
    const tipoBadgeClass = aviso.tipoComunicacao === 'INT' ? 'badge-intimacao' : 'badge-citacao';

    // Usar descrição se disponível, caso contrário usar código
    const classeExibir = aviso.descricaoClasse || aviso.classeProcessual || 'N/A';
    const codigoClasse = aviso.classeProcessual || '';
    const mostrarCodigo = codigoClasse && aviso.descricaoClasse && codigoClasse !== aviso.descricaoClasse;

    // Informações adicionais para prazos abertos
    const prazo = aviso.prazo ? `${aviso.prazo} dias` : 'N/A';
    const inicioPrazo = aviso.inicioPrazo ? formatarDataHora(aviso.inicioPrazo) : 'N/A';
    const finalPrazo = aviso.finalPrazo ? formatarDataHora(aviso.finalPrazo) : 'N/A';

    return `
        <div class="aviso-card" style="border-left: 4px solid #28a745;">
            <div class="aviso-header">
                <div>
                    <div class="aviso-numero">${numeroFormatado}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        ${aviso.nomeDestinatario || ''} ${aviso.documentoDestinatario ? '- ' + aviso.documentoDestinatario : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span class="badge ${tipoBadgeClass}">${aviso.descricaoMovimento || 'N/A'}</span>
                    <span class="badge badge-aberto">✅ Aberto</span>
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
                    <span class="aviso-info-label">Prazo:</span>
                    <span class="aviso-info-value">${prazo}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">Início do Prazo:</span>
                    <span class="aviso-info-value">${inicioPrazo}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">Final do Prazo:</span>
                    <span class="aviso-info-value">${finalPrazo}</span>
                </div>
                <div class="aviso-info-item">
                    <span class="aviso-info-label">ID Aviso:</span>
                    <span class="aviso-info-value">${aviso.idAviso || 'N/A'}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Abrir prazo e atualizar status
 * (Antes chamado de "verDetalhesAviso")
 */
async function abrirPrazo(numeroProcesso, identificadorMovimento) {
    try {
        showLoading(prazosAbertosLoading);

        // Determinar qual versão MNI usar baseado no sistema atual
        const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
        const baseUrl = (sistema === '1G_EXEC_FISCAL') ? '/api/avisos-v3' : '/api/avisos';

        // Consultar teor da comunicação
        const response = await apiRequest(`${baseUrl}/${numeroProcesso}/${identificadorMovimento}`);
        const data = await response.json();

        if (data.success) {
            // Mostrar notificação de sucesso
            mostrarNotificacao('✅ Prazo Aberto com Sucesso!', 'success');

            // Recarregar avisos para atualizar (moveré o aviso da seção aguardando para abertos)
            await carregarTodosAvisos();
        } else {
            mostrarNotificacao('❌ Erro: ' + (data.message || 'Erro ao abrir prazo'), 'error');
        }

    } catch (error) {
        console.error('Erro ao abrir prazo:', error);
        mostrarNotificacao('❌ Erro ao conectar com o servidor', 'error');
    } finally {
        hideLoading(prazosAbertosLoading);
    }
}

/**
 * Formatar data/hora no formato AAAAMMDDHHMMSS para DD/MM/YYYY HH:MM:SS
 */
function formatarDataHora(dataHora) {
    if (!dataHora || dataHora.length < 14) {
        return dataHora || 'N/A';
    }

    const ano = dataHora.substring(0, 4);
    const mes = dataHora.substring(4, 6);
    const dia = dataHora.substring(6, 8);
    const hora = dataHora.substring(8, 10);
    const minuto = dataHora.substring(10, 12);
    const segundo = dataHora.substring(12, 14);

    return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
}

/**
 * Exibir indicador visual de que o filtro de representado está ativo
 */
function exibirIndicadorFiltroRepresentado(idRepresentado) {
    // Procurar por elemento existente e remover se houver
    const indicadorExistente = document.getElementById('indicador-filtro-representado');
    if (indicadorExistente) {
        indicadorExistente.remove();
    }

    // Criar novo indicador
    const indicador = document.createElement('div');
    indicador.id = 'indicador-filtro-representado';
    indicador.style.cssText = `
        padding: 12px 16px;
        background-color: #e3f2fd;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        color: #1565c0;
    `;

    const textoFiltro = document.createElement('span');
    textoFiltro.innerHTML = `<strong>🔍 Filtro ativo:</strong> Exibindo avisos apenas do representado: <code>${idRepresentado}</code>`;

    const btnLimpar = document.createElement('button');
    btnLimpar.textContent = '✕ Limpar';
    btnLimpar.style.cssText = `
        background: none;
        border: 1px solid #2196f3;
        color: #2196f3;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s;
    `;

    btnLimpar.onmouseover = function() {
        this.style.backgroundColor = '#e3f2fd';
    };
    btnLimpar.onmouseout = function() {
        this.style.backgroundColor = 'transparent';
    };

    btnLimpar.onclick = function() {
        // Limpar idRepresentado do localStorage
        localStorage.removeItem('mni_representado_id');
        // Recarregar avisos
        carregarTodosAvisos();
    };

    indicador.appendChild(textoFiltro);
    indicador.appendChild(btnLimpar);

    // Inserir no topo do container de avisos
    const sectionAguardando = document.querySelector('[data-section="avisos-aguardando"]');
    if (sectionAguardando && sectionAguardando.parentElement) {
        sectionAguardando.parentElement.insertBefore(indicador, sectionAguardando);
    } else if (avisosAguardandoContainer.parentElement) {
        avisosAguardandoContainer.parentElement.insertBefore(indicador, avisosAguardandoContainer);
    }
}

/**
 * DEPRECATED: Manter para compatibilidade com código antigo
 */
async function carregarAvisos() {
    await carregarTodosAvisos();
}

/**
 * DEPRECATED: Manter para compatibilidade com código antigo
 */
async function renderizarAvisos(avisos) {
    await renderizarAvisosAguardando(avisos);
}

/**
 * DEPRECATED: Manter para compatibilidade com código antigo
 */
async function verDetalhesAviso(numeroProcesso, identificadorMovimento) {
    await abrirPrazo(numeroProcesso, identificadorMovimento);
}
