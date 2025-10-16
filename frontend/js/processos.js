const numeroProcessoInput = document.getElementById('numero-processo');
const chaveConsultaInput = document.getElementById('chave-consulta');
const btnConsultarProcesso = document.getElementById('btn-consultar-processo');
const processoContainer = document.getElementById('processo-container');
const processoLoading = document.getElementById('processo-loading');

btnConsultarProcesso.addEventListener('click', consultarProcesso);

numeroProcessoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        consultarProcesso();
    }
});

// Remove automaticamente pontos e traços ao colar ou digitar
numeroProcessoInput.addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const originalValue = e.target.value;
    const cleanedValue = originalValue.replace(/[.-]/g, '');

    if (originalValue !== cleanedValue) {
        e.target.value = cleanedValue;
        // Ajusta a posição do cursor
        const diff = originalValue.length - cleanedValue.length;
        e.target.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }
});

// Processa especificamente o evento de colar (paste)
numeroProcessoInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const cleanedText = pastedText.replace(/[^0-9]/g, '');

    const cursorPosition = e.target.selectionStart;
    const currentValue = e.target.value;
    const newValue = currentValue.substring(0, cursorPosition) + cleanedText + currentValue.substring(e.target.selectionEnd);

    e.target.value = newValue.substring(0, 20); // Limita a 20 dígitos
    e.target.setSelectionRange(cursorPosition + cleanedText.length, cursorPosition + cleanedText.length);
});

async function consultarProcesso() {
    const numeroProcesso = numeroProcessoInput.value.trim();
    const chaveConsulta = chaveConsultaInput.value.trim();

    // Validação
    if (!validarNumeroProcesso(numeroProcesso)) {
        showError(processoContainer, 'Número do processo inválido. Deve conter exatamente 20 dígitos.');
        return;
    }

    try {
        processoContainer.innerHTML = '';
        showLoading(processoLoading);

        // Usar MNI 2.2 (endpoint original)
        let url = `/api/processos/${numeroProcesso}`;

        // Adicionar chave se fornecida
        if (chaveConsulta) {
            url += `?chave=${encodeURIComponent(chaveConsulta)}`;
        }

        const response = await apiRequest(url);
        const data = await response.json();

        if (data.success && data.data) {
            renderizarProcesso(data.data);
        } else {
            showError(processoContainer, data.message || 'Erro ao consultar processo');
        }

    } catch (error) {
        console.error('Erro ao consultar processo:', error);
        showError(processoContainer, 'Erro ao conectar com o servidor: ' + error.message);
    } finally {
        hideLoading(processoLoading);
    }
}

function renderizarProcesso(processo) {
    // Extrair dados da estrutura real do MNI
    // MNI 3.0 tem estrutura aninhada: processo.dadosBasicos.dadosBasicos
    const dadosBasicosRaiz = processo.dadosBasicos || {};
    const dadosBasicos = dadosBasicosRaiz.dadosBasicos || dadosBasicosRaiz;

    // MNI 3.0 usa elementos filho, MNI 2.2 usa attributes
    // Tentar ambos os formatos para compatibilidade
    const attributes = dadosBasicos.attributes || dadosBasicos;

    const orgao = dadosBasicos.orgaoJulgador || dadosBasicosRaiz.orgaoJulgador || {};
    const orgaoAttrs = orgao.attributes || orgao;

    // Valores do cabeçalho
    const numeroFormatado = formatarNumeroProcesso(attributes.numero || numeroProcessoInput.value);
    const classeProcessual = dadosBasicosRaiz.classeProcessual || attributes.classeProcessual || 'N/A';
    const nomeOrgao = orgaoAttrs.nome || orgaoAttrs.nomeOrgao || 'N/A';
    const valorCausa = dadosBasicosRaiz.valorCausa ? `R$ ${parseFloat(dadosBasicosRaiz.valorCausa).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'R$ 0,00';
    const nivelSigilo = dadosBasicosRaiz.nivelSigilo || attributes.nivelSigilo || 'N/A';
    const dataAjuizamento = (dadosBasicosRaiz.dataAjuizamento || attributes.dataAjuizamento) ? formatarDataMNI(dadosBasicosRaiz.dataAjuizamento || attributes.dataAjuizamento) : 'N/A';

    // Obter rito processual (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const outrosParametros = dadosBasicosRaiz.outroParametro || dadosBasicos.outroParametro || [];
    const outrosParametrosArray = Array.isArray(outrosParametros) ? outrosParametros : [outrosParametros];
    const ritoParam = outrosParametrosArray.find(p => {
        const pAttrs = p.attributes || p;
        return pAttrs.nome === 'ritoProcessual';
    });
    const rito = ritoParam ? (ritoParam.attributes?.valor || ritoParam.valor || 'N/A') : 'N/A';

    // Contar documentos
    const documentos = processo.documento ? (Array.isArray(processo.documento) ? processo.documento : [processo.documento]) : [];
    const totalDocumentos = documentos.length;

    // Contar por tipo
    const docsPDF = documentos.filter(d => d.attributes && d.attributes.mimetype === 'application/pdf').length;
    const docsHTML = documentos.filter(d => d.attributes && d.attributes.mimetype === 'text/html').length;
    const docsVideo = documentos.filter(d => d.attributes && d.attributes.mimetype && d.attributes.mimetype.startsWith('video/')).length;
    const docsComSigilo = documentos.filter(d => d.attributes && parseInt(d.attributes.nivelSigilo || '0') > 0).length;

    // Obter polos (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const polos = dadosBasicosRaiz.polo || dadosBasicos.polo ? (Array.isArray(dadosBasicosRaiz.polo || dadosBasicos.polo) ? (dadosBasicosRaiz.polo || dadosBasicos.polo) : [dadosBasicosRaiz.polo || dadosBasicos.polo]) : [];

    // Obter assuntos (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const assuntos = dadosBasicosRaiz.assunto || dadosBasicos.assunto ? (Array.isArray(dadosBasicosRaiz.assunto || dadosBasicos.assunto) ? (dadosBasicosRaiz.assunto || dadosBasicos.assunto) : [dadosBasicosRaiz.assunto || dadosBasicos.assunto]) : [];

    // Obter prioridades (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const prioridades = dadosBasicosRaiz.prioridade || dadosBasicos.prioridade ? (Array.isArray(dadosBasicosRaiz.prioridade || dadosBasicos.prioridade) ? (dadosBasicosRaiz.prioridade || dadosBasicos.prioridade) : [dadosBasicosRaiz.prioridade || dadosBasicos.prioridade]) : [];

    // Obter processos vinculados (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const processosVinculados = dadosBasicosRaiz.processoVinculado || dadosBasicos.processoVinculado ? (Array.isArray(dadosBasicosRaiz.processoVinculado || dadosBasicos.processoVinculado) ? (dadosBasicosRaiz.processoVinculado || dadosBasicos.processoVinculado) : [dadosBasicosRaiz.processoVinculado || dadosBasicos.processoVinculado]) : [];

    const html = `
        <!-- Cabeçalho do Processo -->
        <div class="processo-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
            <div class="processo-numero" style="font-size: 22px; font-weight: 600; margin-bottom: 15px;">
                📋 Processo: ${numeroFormatado}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <div style="opacity: 0.9; font-size: 12px;">Classe Processual</div>
                    <div style="font-weight: 600; font-size: 16px;">${classeProcessual}</div>
                </div>
                <div>
                    <div style="opacity: 0.9; font-size: 12px;">Rito</div>
                    <div style="font-weight: 600; font-size: 16px;">${rito}</div>
                </div>
                <div>
                    <div style="opacity: 0.9; font-size: 12px;">Valor da Causa</div>
                    <div style="font-weight: 600; font-size: 16px;">${valorCausa}</div>
                </div>
                <div>
                    <div style="opacity: 0.9; font-size: 12px;">Data Ajuizamento</div>
                    <div style="font-weight: 600; font-size: 16px;">${dataAjuizamento}</div>
                </div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
                <div style="font-weight: 500;">🏛️ ${nomeOrgao}</div>
            </div>
            ${prioridades.length > 0 ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${prioridades.map(p => `
                            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 12px; font-size: 13px;">
                                ⚡ ${p}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Partes do Processo -->
        ${polos.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">👥 Partes do Processo</h3>
                <div style="display: grid; gap: 15px;">
                    ${polos.map(polo => criarCardPolo(polo)).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Assuntos -->
        ${assuntos.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">📌 Assuntos</h3>
                <div class="processo-card">
                    ${assuntos.map(assunto => {
                        const isPrincipal = assunto.attributes && assunto.attributes.principal === 'true';
                        return `
                            <div style="padding: 8px 0;">
                                <span style="font-weight: 500;">Código: ${assunto.codigoNacional || 'N/A'}</span>
                                ${isPrincipal ? '<span class="badge badge-aberto" style="margin-left: 10px;">Principal</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Processos Vinculados -->
        ${processosVinculados.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">🔗 Processos Vinculados (${processosVinculados.length})</h3>
                <div style="display: grid; gap: 10px;">
                    ${processosVinculados.map(pv => {
                        const attrs = pv.attributes || {};
                        return `
                            <div class="processo-card" style="padding: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600; color: #333;">
                                            ${formatarNumeroProcesso(attrs.numeroProcesso || 'N/A')}
                                        </div>
                                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                            Vínculo: ${attrs.vinculo || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Documentos -->
        ${totalDocumentos > 0 ? `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #333; font-size: 18px; margin: 0;">📄 Documentos (${totalDocumentos})</h3>
                    <div style="display: flex; gap: 10px; font-size: 12px;">
                        ${docsPDF > 0 ? `<span class="badge" style="background: #dc3545; color: white;">PDF: ${docsPDF}</span>` : ''}
                        ${docsHTML > 0 ? `<span class="badge" style="background: #6c757d; color: white;">HTML: ${docsHTML}</span>` : ''}
                        ${docsVideo > 0 ? `<span class="badge" style="background: #6f42c1; color: white;">Vídeo: ${docsVideo}</span>` : ''}
                        ${docsComSigilo > 0 ? `<span class="badge" style="background: #ffc107; color: #000;">🔒 Sigilo: ${docsComSigilo}</span>` : ''}
                    </div>
                </div>
                <div style="display: grid; gap: 10px;">
                    ${documentos.map(doc => criarCardDocumento(doc)).join('')}
                </div>
            </div>
        ` : ''}

        <!-- JSON Completo (Colapsável) -->
        <details style="margin-top: 30px;">
            <summary style="cursor: pointer; padding: 15px; background: #f8f9fa; border-radius: 5px; font-weight: 600; color: #666;">
                🔍 Ver JSON Completo
            </summary>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 11px; max-height: 500px; margin-top: 10px;">${JSON.stringify(processo, null, 2)}</pre>
        </details>
    `;

    processoContainer.innerHTML = html;
}

function criarCardPolo(polo) {
    const poloAttrs = polo.attributes || {};
    const tipoPolo = poloAttrs.polo || 'N/A';
    const partes = polo.parte ? (Array.isArray(polo.parte) ? polo.parte : [polo.parte]) : [];

    // Mapear tipos de polo
    const tiposPoloMap = {
        'AT': { nome: 'Autor', cor: '#28a745', icon: '👤' },
        'PA': { nome: 'Réu/Passivo', cor: '#dc3545', icon: '⚖️' },
        'TC': { nome: 'Terceiro', cor: '#6c757d', icon: '👥' },
        'AO': { nome: 'Autor', cor: '#28a745', icon: '👤' }
    };

    const poloInfo = tiposPoloMap[tipoPolo] || { nome: tipoPolo, cor: '#6c757d', icon: '📌' };

    return `
        <div class="processo-card" style="border-left: 4px solid ${poloInfo.cor};">
            <div style="font-weight: 600; color: ${poloInfo.cor}; margin-bottom: 15px; font-size: 16px;">
                ${poloInfo.icon} ${poloInfo.nome}
            </div>
            ${partes.map(parte => criarCardParte(parte)).join('<hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">')}
        </div>
    `;
}

function criarCardParte(parte) {
    const pessoa = parte.pessoa || {};
    const pessoaAttrs = pessoa.attributes || {};
    const advogados = parte.advogado ? (Array.isArray(parte.advogado) ? parte.advogado : [parte.advogado]) : [];
    const endereco = pessoa.endereco ? (Array.isArray(pessoa.endereco) ? pessoa.endereco[0] : pessoa.endereco) : null;

    const isPJ = pessoaAttrs.tipoPessoa === 'juridica';
    const enderecoAttrs = endereco ? (endereco.attributes || {}) : {};

    return `
        <div>
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 600; font-size: 15px; color: #333;">
                    ${isPJ ? '🏢' : '👤'} ${pessoaAttrs.nome || 'N/A'}
                </div>
                <div style="color: #666; font-size: 13px; margin-top: 4px;">
                    ${isPJ ? 'CNPJ' : 'CPF'}: ${formatarDocumento(pessoaAttrs.numeroDocumentoPrincipal || 'N/A', isPJ)}
                </div>
                ${pessoaAttrs.dataNascimento ? `<div style="color: #666; font-size: 13px;">Nascimento: ${formatarDataMNI(pessoaAttrs.dataNascimento)}</div>` : ''}
            </div>

            ${endereco ? `
                <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 13px; margin-bottom: 10px;">
                    <div style="font-weight: 500; margin-bottom: 5px;">📍 Endereço:</div>
                    <div style="color: #666;">
                        ${endereco.logradouro || ''}, ${endereco.numero || 's/n'}
                        ${endereco.complemento ? ' - ' + endereco.complemento : ''}<br>
                        ${endereco.bairro || ''} - ${endereco.cidade || ''} / ${endereco.estado || ''}<br>
                        CEP: ${formatarCEP(enderecoAttrs.cep || '')}
                    </div>
                </div>
            ` : ''}

            ${advogados.length > 0 ? `
                <div style="margin-top: 10px;">
                    <div style="font-weight: 500; font-size: 13px; color: #555; margin-bottom: 5px;">⚖️ Advogados:</div>
                    ${advogados.map(adv => {
                        const advAttrs = adv.attributes || {};
                        return `
                            <div style="padding: 8px; background: #e8f4f8; border-radius: 4px; margin-bottom: 5px; font-size: 12px;">
                                <div style="font-weight: 500;">${advAttrs.nome || 'N/A'}</div>
                                ${advAttrs.inscricao ? `<div style="color: #666;">OAB: ${advAttrs.inscricao}</div>` : ''}
                                ${advAttrs.numeroDocumentoPrincipal ? `<div style="color: #666;">CPF: ${formatarDocumento(advAttrs.numeroDocumentoPrincipal, false)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

function criarCardDocumento(doc) {
    const docAttrs = doc.attributes || {};
    const outrosParams = doc.outroParametro || [];
    const rotuloParam = outrosParams.find(p => p.attributes && p.attributes.nome === 'rotulo');
    const tamanhoParam = outrosParams.find(p => p.attributes && p.attributes.nome === 'tamanho');

    const rotulo = rotuloParam ? rotuloParam.attributes.valor : '';
    const tamanho = tamanhoParam ? formatarTamanhoBytes(parseInt(tamanhoParam.attributes.valor)) : '';

    const isPDF = docAttrs.mimetype === 'application/pdf';
    const isVideo = docAttrs.mimetype && docAttrs.mimetype.startsWith('video/');
    const nivelSigilo = parseInt(docAttrs.nivelSigilo || '0');
    const temSigilo = nivelSigilo > 0;
    const dataHora = docAttrs.dataHora ? formatarDataHoraMNI(docAttrs.dataHora) : 'N/A';

    // Ícone baseado no tipo
    let icone = '📝';
    if (isPDF) icone = '📄';
    if (isVideo) icone = '🎥';

    // Tipo de arquivo
    let tipoArquivo = 'HTML';
    if (isPDF) tipoArquivo = 'PDF';
    if (isVideo) tipoArquivo = 'MP4';

    return `
        <div class="processo-card" style="padding: 12px; ${temSigilo ? 'border-left: 3px solid #ffc107;' : ''}">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                        ${icone} ${docAttrs.descricao || 'Documento'}
                        ${temSigilo ? '<span style="background: #ffc107; color: #000; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 700;">🔒 SIGILO</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        <span>Movimento: ${docAttrs.movimento || 'N/A'}</span>
                        ${rotulo ? ` | ${rotulo}` : ''}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        📅 ${dataHora} | 📊 Tipo: ${docAttrs.tipoDocumento || 'N/A'} | 💾 ${tamanho}
                    </div>
                </div>
                <span class="badge" style="background: ${isPDF ? '#dc3545' : isVideo ? '#6f42c1' : '#6c757d'}; color: white;">
                    ${tipoArquivo}
                </span>
            </div>
        </div>
    `;
}

function formatarDocumento(doc, isPJ) {
    if (!doc || doc === 'N/A') return 'N/A';

    // Remove caracteres não numéricos
    const numeros = doc.replace(/\D/g, '');

    if (isPJ && numeros.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    } else if (!isPJ && numeros.length === 11) {
        // CPF: 000.000.000-00
        return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    return doc;
}

function formatarCEP(cep) {
    if (!cep) return 'N/A';
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length === 8) {
        return numeros.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }
    return cep;
}

function formatarDataHoraMNI(dataHora) {
    if (!dataHora) return 'N/A';
    const str = dataHora.toString();
    if (str.length === 14) {
        return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)} ${str.substr(8, 2)}:${str.substr(10, 2)}`;
    }
    return formatarDataMNI(dataHora);
}

function formatarTamanhoBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatarDataMNI(dataMNI) {
    // Formato: AAAAMMDDHHMMSS -> DD/MM/AAAA HH:MM
    if (!dataMNI) return 'N/A';
    const str = dataMNI.toString();
    if (str.length >= 8) {
        return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)}`;
    }
    return dataMNI;
}

// ========================================
// FUNÇÃO DE DEBUG - Mostrar XMLs SOAP
// ========================================
function mostrarDebugXML(debug) {
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-xml-container';
    debugContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; overflow: auto; padding: 20px;';

    const formatarXML = (xml) => {
        if (!xml) return 'Não disponível';
        // Tenta formatar o XML de forma básica
        try {
            return xml.replace(/></g, '>\n<');
        } catch {
            return xml;
        }
    };

    debugContainer.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">🔧 Debug SOAP - XMLs da Requisição</h2>
                <button onclick="document.getElementById('debug-xml-container').remove()"
                        style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    ✖ Fechar
                </button>
            </div>

            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="color: #28a745; margin: 0;">📤 XML REQUEST (Enviado ao MNI 3.0)</h3>
                    <button onclick="copiarParaClipboard('xml-request')"
                            style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 13px;">
                        📋 Copiar Request
                    </button>
                </div>
                <pre id="xml-request" style="background: #f8f9fa; padding: 20px; border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.5; border: 2px solid #28a745; max-height: 400px;">${formatarXML(debug.xmlRequest)}</pre>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="color: #007bff; margin: 0;">📥 XML RESPONSE (Recebido do MNI 3.0)</h3>
                    <button onclick="copiarParaClipboard('xml-response')"
                            style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 13px;">
                        📋 Copiar Response
                    </button>
                </div>
                <pre id="xml-response" style="background: #f8f9fa; padding: 20px; border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.5; border: 2px solid #007bff; max-height: 400px;">${formatarXML(debug.xmlResponse)}</pre>
            </div>

            ${debug.erro ? `
                <div style="margin-top: 30px;">
                    <h3 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ Erro (Stack Trace)</h3>
                    <pre style="background: #f8d7da; padding: 20px; border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.5; border: 2px solid #dc3545; max-height: 300px;">${debug.erro}</pre>
                </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; color: #856404;">💡 Como usar no SOAP UI:</h4>
                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                    <li>Copie o XML REQUEST acima</li>
                    <li>No SOAP UI, crie um novo projeto com o WSDL: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">https://eproc-1g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl</code></li>
                    <li>Cole o XML REQUEST na janela de requisição</li>
                    <li>Execute e compare a resposta com o XML RESPONSE acima</li>
                </ol>
            </div>
        </div>
    `;

    document.body.appendChild(debugContainer);
}

// Função auxiliar para copiar para clipboard
window.copiarParaClipboard = function(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;

    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copiado!';
        btn.style.background = '#28a745';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = elementId === 'xml-request' ? '#28a745' : '#007bff';
        }, 2000);
    }).catch(err => {
        alert('Erro ao copiar: ' + err);
    });
};
