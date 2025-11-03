const numeroProcessoInput = document.getElementById('numero-processo');
const chaveConsultaInput = document.getElementById('chave-consulta');
const dataReferenciaInput = document.getElementById('data-referencia');
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

// Formatação automática para data de referência (DD/MM/AAAA HH:MM:SS)
dataReferenciaInput.addEventListener('input', (e) => {
    let valor = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // Remove tudo que não é número
    let numeros = valor.replace(/\D/g, '');

    // Aplica formatação progressiva
    let formatado = '';

    // DD
    if (numeros.length > 0) {
        formatado = numeros.substring(0, 2);
    }

    // DD/MM
    if (numeros.length >= 3) {
        formatado += '/' + numeros.substring(2, 4);
    }

    // DD/MM/AAAA
    if (numeros.length >= 5) {
        formatado += '/' + numeros.substring(4, 8);
    }

    // DD/MM/AAAA HH
    if (numeros.length >= 9) {
        formatado += ' ' + numeros.substring(8, 10);
    }

    // DD/MM/AAAA HH:MM
    if (numeros.length >= 11) {
        formatado += ':' + numeros.substring(10, 12);
    }

    // DD/MM/AAAA HH:MM:SS
    if (numeros.length >= 13) {
        formatado += ':' + numeros.substring(12, 14);
    }

    e.target.value = formatado;

    // Ajustar posição do cursor
    if (valor !== formatado) {
        // Contar quantos caracteres especiais foram adicionados antes do cursor
        const caracteresEspeciaisAntes = formatado.substring(0, cursorPosition).replace(/\d/g, '').length;
        const caracteresEspeciaisAntesOriginal = valor.substring(0, cursorPosition).replace(/\d/g, '').length;
        const diff = caracteresEspeciaisAntes - caracteresEspeciaisAntesOriginal;

        e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
    }
});

async function consultarProcesso() {
    const numeroProcesso = numeroProcessoInput.value.trim();
    const chaveConsulta = chaveConsultaInput.value.trim();
    const dataReferenciaFormatada = dataReferenciaInput.value.trim();

    // Validação
    if (!validarNumeroProcesso(numeroProcesso)) {
        showError(processoContainer, 'Número do processo inválido. Deve conter exatamente 20 dígitos.');
        return;
    }

    // Converter data de referência do formato brasileiro para MNI
    let dataReferenciaMNI = null;
    if (dataReferenciaFormatada) {
        try {
            dataReferenciaMNI = converterDataParaMNI(dataReferenciaFormatada);
        } catch (error) {
            showError(processoContainer, 'Data de referência inválida. Use o formato DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS');
            return;
        }
    }

    try {
        processoContainer.innerHTML = '';
        showLoading(processoLoading);

        // Determinar qual versão MNI usar baseado no sistema atual
        const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
        const usarMNI3 = (sistema === '1G_EXEC_FISCAL');

        // Montar URL baseado na versão MNI
        let url;
        const params = new URLSearchParams();

        if (usarMNI3) {
            // MNI 3.0: /api/mni3/processo/:numeroProcesso
            url = `/api/mni3/processo/${numeroProcesso}`;

            // Adicionar chave se fornecida
            if (chaveConsulta) {
                params.append('chave', chaveConsulta);
            }

            // MNI 3.0 usa dataInicial e dataFinal ao invés de dataReferencia
            // Se apenas uma data for fornecida, usar como dataInicial
            if (dataReferenciaMNI) {
                params.append('dataInicial', dataReferenciaMNI);
                // Opcional: definir dataFinal como data atual se necessário
                // params.append('dataFinal', obterDataAtualMNI());
            }

            // Sempre incluir documentos no MNI 3.0
            params.append('incluirDocumentos', 'true');
        } else {
            // MNI 2.2: /api/processos/:numeroProcesso
            url = `/api/processos/${numeroProcesso}`;

            // Adicionar chave se fornecida
            if (chaveConsulta) {
                params.append('chave', chaveConsulta);
            }

            // Adicionar data de referência se fornecida
            if (dataReferenciaMNI) {
                params.append('dataReferencia', dataReferenciaMNI);
            }
        }

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        console.log('[PROCESSOS] Sistema:', sistema);
        console.log('[PROCESSOS] Usando MNI 3.0?', usarMNI3);
        console.log('[PROCESSOS] URL:', url);

        const response = await apiRequest(url);
        const data = await response.json();

        if (data.success && data.data) {
            await renderizarProcesso(data.data);
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

/**
 * Converte data do formato brasileiro (DD/MM/AAAA HH:MM:SS) para formato MNI (AAAAMMDDHHMMSS)
 * Se hora não for informada, preenche com 00:00:00
 */
function converterDataParaMNI(dataFormatada) {
    // Remove espaços extras
    dataFormatada = dataFormatada.trim();

    // Separar data e hora
    const partes = dataFormatada.split(' ');
    const dataParte = partes[0]; // DD/MM/AAAA
    const horaParte = partes[1] || '00:00:00'; // HH:MM:SS ou 00:00:00 se não informado

    // Validar e extrair data
    const dataMatch = dataParte.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dataMatch) {
        throw new Error('Formato de data inválido');
    }

    const dia = dataMatch[1];
    const mes = dataMatch[2];
    const ano = dataMatch[3];

    // Validar e extrair hora (pode estar incompleta)
    let hora = '00';
    let minuto = '00';
    let segundo = '00';

    if (horaParte) {
        const horaPartes = horaParte.split(':');
        hora = (horaPartes[0] || '00').padStart(2, '0');
        minuto = (horaPartes[1] || '00').padStart(2, '0');
        segundo = (horaPartes[2] || '00').padStart(2, '0');
    }

    // Validações básicas
    if (parseInt(dia) < 1 || parseInt(dia) > 31) {
        throw new Error('Dia inválido');
    }
    if (parseInt(mes) < 1 || parseInt(mes) > 12) {
        throw new Error('Mês inválido');
    }
    if (parseInt(hora) > 23 || parseInt(minuto) > 59 || parseInt(segundo) > 59) {
        throw new Error('Hora inválida');
    }

    // Retornar no formato AAAAMMDDHHMMSS
    return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
}

async function renderizarProcesso(processo) {
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
    const codigoClasse = dadosBasicosRaiz.classeProcessual || attributes.classeProcessual || '';
    const classeProcessual = codigoClasse ? await buscarDescricaoClasse(codigoClasse) : 'N/A';
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

    // Extrair documentos
    const documentos = processo.documento ? (Array.isArray(processo.documento) ? processo.documento : [processo.documento]) : [];
    const totalDocumentos = documentos.length;

    // Contar por tipo
    // MNI 2.2: d.attributes.mimetype
    // MNI 3.0: d.conteudo.mimetype
    const docsPDF = documentos.filter(d => {
        const mime = d.attributes?.mimetype || d.conteudo?.mimetype;
        return mime === 'application/pdf';
    }).length;
    const docsHTML = documentos.filter(d => {
        const mime = d.attributes?.mimetype || d.conteudo?.mimetype;
        return mime === 'text/html';
    }).length;
    const docsVideo = documentos.filter(d => {
        const mime = d.attributes?.mimetype || d.conteudo?.mimetype;
        return mime && mime.startsWith('video/');
    }).length;
    const docsComSigilo = documentos.filter(d => {
        const sigilo = d.attributes?.nivelSigilo || d.nivelSigilo;
        return parseInt(sigilo || '0') > 0;
    }).length;

    // Extrair movimentos
    const movimentos = processo.movimento ? (Array.isArray(processo.movimento) ? processo.movimento : [processo.movimento]) : [];
    const totalMovimentos = movimentos.length;

    // Criar mapa movimento -> documentos para vincular
    // MNI 2.2: doc.attributes.movimento
    // MNI 3.0: doc.idMovimento (direto)
    const documentosPorMovimento = {};
    documentos.forEach(doc => {
        const movimentoId = doc.attributes?.movimento || doc.idMovimento;
        if (movimentoId) {
            if (!documentosPorMovimento[movimentoId]) {
                documentosPorMovimento[movimentoId] = [];
            }
            documentosPorMovimento[movimentoId].push(doc);
        }
    });

    // Ordenar movimentos por data (mais recente primeiro)
    const movimentosOrdenados = movimentos.sort((a, b) => {
        const dataA = a.attributes?.dataHora || '0';
        const dataB = b.attributes?.dataHora || '0';
        return dataB.localeCompare(dataA);
    });

    // Obter polos (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const polos = dadosBasicosRaiz.polo || dadosBasicos.polo ? (Array.isArray(dadosBasicosRaiz.polo || dadosBasicos.polo) ? (dadosBasicosRaiz.polo || dadosBasicos.polo) : [dadosBasicosRaiz.polo || dadosBasicos.polo]) : [];

    // Obter assuntos (pode estar em dadosBasicosRaiz ou dadosBasicos)
    const assuntos = dadosBasicosRaiz.assunto || dadosBasicos.assunto ? (Array.isArray(dadosBasicosRaiz.assunto || dadosBasicos.assunto) ? (dadosBasicosRaiz.assunto || dadosBasicos.assunto) : [dadosBasicosRaiz.assunto || dadosBasicos.assunto]) : [];

    // Mapear assuntos para incluir descrições
    const assuntosComDescricao = await Promise.all(assuntos.map(async (assunto) => {
        const codigo = assunto.codigoNacional || '';
        const descricao = codigo ? await buscarDescricaoAssunto(codigo) : 'N/A';
        return {
            ...assunto,
            descricao: descricao
        };
    }));

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
        ${assuntosComDescricao.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">📌 Assuntos</h3>
                <div class="processo-card">
                    ${assuntosComDescricao.map(assunto => {
                        const isPrincipal = assunto.attributes && assunto.attributes.principal === 'true';
                        const codigo = assunto.codigoNacional || 'N/A';
                        const descricao = assunto.descricao || codigo;
                        return `
                            <div style="padding: 8px 0;">
                                <span style="font-weight: 500;">${descricao}</span>
                                ${codigo !== descricao ? ` <span style="color: #666; font-size: 13px;">(${codigo})</span>` : ''}
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

        <!-- Linha do Tempo Processual -->
        ${totalMovimentos > 0 ? `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #333; font-size: 18px; margin: 0;">📅 Linha do Tempo Processual (${totalMovimentos})</h3>
                    <div style="display: flex; gap: 10px; font-size: 12px;">
                        ${docsPDF > 0 ? `<span class="badge" style="background: #dc3545; color: white;">PDF: ${docsPDF}</span>` : ''}
                        ${docsHTML > 0 ? `<span class="badge" style="background: #6c757d; color: white;">HTML: ${docsHTML}</span>` : ''}
                        ${docsVideo > 0 ? `<span class="badge" style="background: #6f42c1; color: white;">Vídeo: ${docsVideo}</span>` : ''}
                        ${docsComSigilo > 0 ? `<span class="badge" style="background: #ffc107; color: #000;">🔒 Sigilo: ${docsComSigilo}</span>` : ''}
                    </div>
                </div>
                <div style="display: grid; gap: 12px;">
                    ${movimentosOrdenados.map(mov => criarCardMovimento(mov, documentosPorMovimento)).join('')}
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

    // MNI 2.2: pessoa.attributes
    // MNI 3.0: pessoa.dadosBasicos
    const pessoaAttrs = pessoa.attributes || {};
    const dadosBasicos = pessoa.dadosBasicos || {};

    const advogados = parte.advogado ? (Array.isArray(parte.advogado) ? parte.advogado : [parte.advogado]) : [];
    const endereco = pessoa.endereco ? (Array.isArray(pessoa.endereco) ? pessoa.endereco[0] : pessoa.endereco) : null;

    // Determinar se é PJ: MNI 2.2 usa tipoPessoa, MNI 3.0 usa qualificacaoPessoa
    const tipoPessoa = pessoaAttrs.tipoPessoa || pessoa.qualificacaoPessoa || '';
    const isPJ = tipoPessoa === 'juridica' || tipoPessoa === 'JUR';

    // Nome da pessoa: MNI 2.2 em attributes, MNI 3.0 em dadosBasicos ou direto
    const nome = pessoaAttrs.nome || dadosBasicos.nome || 'N/A';

    // Documento: pode estar em attributes, dadosBasicos ou direto na pessoa
    const numeroDoc = pessoaAttrs.numeroDocumentoPrincipal ||
                      dadosBasicos.numeroDocumentoPrincipal ||
                      pessoa.numeroDocumentoPrincipal ||
                      'N/A';

    const dataNascimento = pessoaAttrs.dataNascimento || dadosBasicos.dataNascimento || null;

    const enderecoAttrs = endereco ? (endereco.attributes || {}) : {};

    return `
        <div>
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 600; font-size: 15px; color: #333;">
                    ${isPJ ? '🏢' : '👤'} ${nome}
                </div>
                <div style="color: #666; font-size: 13px; margin-top: 4px;">
                    ${isPJ ? 'CNPJ' : 'CPF'}: ${formatarDocumento(numeroDoc, isPJ)}
                </div>
                ${dataNascimento ? `<div style="color: #666; font-size: 13px;">Nascimento: ${formatarDataMNI(dataNascimento)}</div>` : ''}
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

function criarCardMovimento(movimento, documentosPorMovimento) {
    const movAttrs = movimento.attributes || {};

    // MNI 2.2: attributes.identificadorMovimento
    // MNI 3.0: attributes.idMovimento
    const movimentoId = movAttrs.identificadorMovimento || movAttrs.idMovimento || '';
    const dataHora = movAttrs.dataHora ? formatarDataHoraMNI(movAttrs.dataHora) : 'N/A';

    const movimentoLocal = movimento.movimentoLocal || {};
    const movLocalAttrs = movimentoLocal.attributes || {};
    const descricao = movLocalAttrs.descricao || 'Movimento';
    const codigoMovimento = movLocalAttrs.codigoMovimento || '';

    // Complementos (informações adicionais)
    const complementos = movimento.complemento ? (Array.isArray(movimento.complemento) ? movimento.complemento : [movimento.complemento]) : [];

    // Documentos vinculados a este movimento
    const docsVinculados = documentosPorMovimento[movimentoId] || [];

    return `
        <div class="processo-card" style="padding: 15px; border-left: 4px solid #667eea; position: relative;">
            <!-- Indicador visual de linha do tempo -->
            <div style="position: absolute; left: -8px; top: 20px; width: 12px; height: 12px; background: #667eea; border-radius: 50%; border: 2px solid white;"></div>

            <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                <div style="flex: 1;">
                    <!-- Data e hora -->
                    <div style="font-size: 11px; color: #999; font-weight: 600; margin-bottom: 5px;">
                        📅 ${dataHora}
                    </div>

                    <!-- Descrição do movimento -->
                    <div style="font-weight: 600; color: #333; font-size: 15px; margin-bottom: 8px;">
                        ${descricao}
                    </div>

                    <!-- Complementos (quem movimentou, referências, etc) -->
                    ${complementos.length > 0 ? `
                        <div style="font-size: 12px; color: #666; line-height: 1.6; margin-bottom: 10px;">
                            ${complementos.map(comp => `
                                <div style="margin-bottom: 3px;">• ${comp}</div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <!-- Documentos vinculados -->
                    ${docsVinculados.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                            <div style="font-weight: 500; font-size: 13px; color: #555; margin-bottom: 8px;">
                                📎 Documentos anexados (${docsVinculados.length}):
                            </div>
                            <div style="display: grid; gap: 8px;">
                                ${docsVinculados.map(doc => criarCardDocumentoCompacto(doc)).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Badge com ID do movimento -->
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <span class="badge" style="background: #667eea; color: white; font-size: 11px; padding: 4px 10px;">
                        #${movimentoId}
                    </span>
                    ${codigoMovimento ? `
                        <span style="font-size: 10px; color: #999;">
                            Cód: ${codigoMovimento}
                        </span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function criarCardDocumentoCompacto(doc) {
    // MNI 2.2: doc.attributes
    // MNI 3.0: campos diretos
    const docAttrs = doc.attributes || {};

    const outrosParams = doc.outroParametro || [];
    const rotuloParam = outrosParams.find(p => p.attributes && p.attributes.nome === 'rotulo');
    const tamanhoParam = outrosParams.find(p => p.attributes && p.attributes.nome === 'tamanho');

    const rotulo = rotuloParam ? rotuloParam.attributes.valor : '';

    // Tamanho: MNI 2.2 em outroParametro, MNI 3.0 em tamanhoConteudo
    const tamanhoBytes = tamanhoParam ? parseInt(tamanhoParam.attributes.valor) :
                         doc.tamanhoConteudo ? parseInt(doc.tamanhoConteudo) : 0;
    const tamanho = tamanhoBytes ? formatarTamanhoBytes(tamanhoBytes) : '';

    // Mimetype: MNI 2.2 em attributes, MNI 3.0 em conteudo.mimetype
    const mimetype = docAttrs.mimetype || doc.conteudo?.mimetype || 'application/pdf';

    const isPDF = mimetype === 'application/pdf';
    const isVideo = mimetype && mimetype.startsWith('video/');

    // Nível de sigilo: MNI 2.2 em attributes, MNI 3.0 direto
    const nivelSigilo = parseInt(docAttrs.nivelSigilo || doc.nivelSigilo || '0');
    const temSigilo = nivelSigilo > 0;

    // Ícone baseado no tipo
    let icone = '📝';
    if (isPDF) icone = '📄';
    if (isVideo) icone = '🎥';

    // Tipo de arquivo
    let tipoArquivo = 'HTML';
    if (isPDF) tipoArquivo = 'PDF';
    if (isVideo) tipoArquivo = 'MP4';

    // ID do documento: MNI 2.2 em attributes, MNI 3.0 direto
    const idDocumento = docAttrs.idDocumento || doc.idDocumento || '';

    // Descrição: MNI 2.2 em attributes, MNI 3.0 direto
    const descricao = docAttrs.descricao || doc.descricao || 'Documento';

    return `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; font-size: 13px; color: #333; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${icone} ${descricao}
                        ${temSigilo ? '<span style="background: #ffc107; color: #000; padding: 1px 6px; border-radius: 6px; font-size: 10px; font-weight: 700;">🔒</span>' : ''}
                    </div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">
                        ${rotulo ? rotulo + ' | ' : ''}${tamanho}
                    </div>
                </div>
                <span class="badge" style="background: ${isPDF ? '#dc3545' : isVideo ? '#6f42c1' : '#6c757d'}; color: white; font-size: 10px; padding: 3px 8px; white-space: nowrap;">
                    ${tipoArquivo}
                </span>
            </div>
            <button
                onclick="visualizarDocumento('${numeroProcessoInput.value}', '${idDocumento}', '${descricao.replace(/'/g, "\\'")}', '${mimetype}')"
                style="width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform 0.2s;"
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
            >
                👁️ Visualizar Documento
            </button>
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

    // MNI 3.0: formato ISO 8601 (2025-10-31T16:34:20-03:00)
    if (str.includes('T')) {
        try {
            const date = new Date(str);
            const dia = String(date.getDate()).padStart(2, '0');
            const mes = String(date.getMonth() + 1).padStart(2, '0');
            const ano = date.getFullYear();
            const hora = String(date.getHours()).padStart(2, '0');
            const minuto = String(date.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
        } catch (e) {
            console.error('Erro ao formatar data ISO:', e);
            return str;
        }
    }

    // MNI 2.2: formato AAAAMMDDHHMMSS
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
    if (!dataMNI) return 'N/A';
    const str = dataMNI.toString();

    // MNI 3.0: formato ISO 8601 (2025-10-31T16:34:20-03:00) ou (2025-10-31)
    if (str.includes('T') || str.includes('-')) {
        try {
            const date = new Date(str);
            const dia = String(date.getDate()).padStart(2, '0');
            const mes = String(date.getMonth() + 1).padStart(2, '0');
            const ano = date.getFullYear();
            return `${dia}/${mes}/${ano}`;
        } catch (e) {
            console.error('Erro ao formatar data ISO:', e);
            return str;
        }
    }

    // MNI 2.2: formato AAAAMMDDHHMMSS ou AAAAMMDD
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

// ========================================
// VISUALIZAÇÃO DE DOCUMENTOS
// ========================================

async function visualizarDocumento(numeroProcesso, idDocumento, descricao, mimetype) {
    try {
        // Criar modal de loading
        mostrarModalLoading(descricao);

        // Detectar qual sistema está sendo usado
        const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
        const usarMNI3 = (sistema === '1G_EXEC_FISCAL');

        // Determinar a URL correta baseado no sistema
        const url = usarMNI3
            ? `/api/mni3/processo/${numeroProcesso}/documentos/${idDocumento}`
            : `/api/processos/${numeroProcesso}/documentos/${idDocumento}`;

        console.log('[VISUALIZAR DOCUMENTO] Sistema:', sistema);
        console.log('[VISUALIZAR DOCUMENTO] Usando MNI 3.0:', usarMNI3);
        console.log('[VISUALIZAR DOCUMENTO] URL:', url);

        // Fazer requisição para obter o conteúdo do documento
        const response = await apiRequest(url);
        const data = await response.json();

        if (!data.success || !data.data) {
            throw new Error(data.message || 'Erro ao carregar documento');
        }

        const { conteudo, mimetype: mimetypeRetornado } = data.data;
        const mimetypeFinal = mimetypeRetornado || mimetype;

        // VALIDAÇÕES DE SEGURANÇA
        console.log('Conteúdo recebido - tipo:', typeof conteudo, 'tamanho:', conteudo ? conteudo.length : 0);
        console.log('Primeiros 100 chars:', conteudo ? conteudo.substring(0, 100) : 'vazio');

        // Validar que conteudo é uma string
        if (typeof conteudo !== 'string') {
            console.error('ERRO: Conteúdo não é uma string:', conteudo);
            throw new Error('Formato inválido: conteúdo do documento não é uma string');
        }

        // Validar que não está vazio
        if (!conteudo || conteudo.length === 0) {
            throw new Error('Conteúdo do documento está vazio');
        }

        // Validar que parece ser Base64 (caracteres válidos)
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!base64Regex.test(conteudo.substring(0, Math.min(100, conteudo.length)))) {
            console.error('ERRO: Conteúdo não parece ser Base64 válido');
            throw new Error('Formato inválido: conteúdo não está em Base64');
        }

        // Fechar modal de loading
        fecharModalDocumento();

        // Exibir o documento no modal
        mostrarModalDocumento(conteudo, mimetypeFinal, descricao, numeroProcesso, idDocumento);

    } catch (error) {
        console.error('Erro ao visualizar documento:', error);
        fecharModalDocumento();
        alert('Erro ao carregar documento: ' + error.message);
    }
}

function mostrarModalLoading(descricao) {
    const modalHTML = `
        <div id="modal-documento" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 10px; padding: 40px; text-align: center; max-width: 400px;">
                <div style="font-size: 48px; margin-bottom: 20px; animation: spin 1s linear infinite;">⏳</div>
                <h3 style="color: #333; margin: 0 0 10px 0;">Carregando Documento</h3>
                <p style="color: #666; margin: 0;">${descricao}</p>
            </div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    // Remover modal existente se houver
    const modalExistente = document.getElementById('modal-documento');
    if (modalExistente) {
        modalExistente.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function mostrarModalDocumento(conteudoBase64, mimetype, descricao, numeroProcesso, idDocumento) {
    // Preparar conteúdo para visualização baseado no mimetype
    let conteudoHTML = '';

    if (mimetype === 'application/pdf') {
        // PDF: usar embed ou iframe
        const pdfDataUri = `data:${mimetype};base64,${conteudoBase64}`;
        conteudoHTML = `
            <embed
                src="${pdfDataUri}"
                type="application/pdf"
                width="100%"
                height="100%"
                style="border: none; border-radius: 5px;"
            />
        `;
    } else if (mimetype === 'text/html') {
        // HTML: usar iframe com srcdoc
        const htmlContent = atob(conteudoBase64);
        conteudoHTML = `
            <iframe
                srcdoc="${htmlContent.replace(/"/g, '&quot;')}"
                width="100%"
                height="100%"
                style="border: none; border-radius: 5px; background: white;"
            ></iframe>
        `;
    } else if (mimetype && mimetype.startsWith('video/')) {
        // Vídeo: usar tag video
        const videoDataUri = `data:${mimetype};base64,${conteudoBase64}`;
        conteudoHTML = `
            <video
                controls
                width="100%"
                height="100%"
                style="border-radius: 5px; background: black;"
            >
                <source src="${videoDataUri}" type="${mimetype}">
                Seu navegador não suporta a reprodução de vídeos.
            </video>
        `;
    } else if (mimetype && mimetype.startsWith('image/')) {
        // Imagem: usar tag img
        const imgDataUri = `data:${mimetype};base64,${conteudoBase64}`;
        conteudoHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; border-radius: 5px;">
                <img
                    src="${imgDataUri}"
                    style="max-width: 100%; max-height: 100%; object-fit: contain;"
                    alt="${descricao}"
                />
            </div>
        `;
    } else {
        // Tipo não suportado para visualização: oferecer download apenas
        conteudoHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border-radius: 5px; padding: 40px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
                <h3 style="color: #333; margin: 0 0 10px 0;">Tipo de arquivo não suportado para visualização</h3>
                <p style="color: #666; margin: 0 0 20px 0;">MIME Type: ${mimetype}</p>
                <button
                    onclick="downloadDocumento('${conteudoBase64}', '${mimetype}', '${descricao}')"
                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;"
                >
                    ⬇️ Fazer Download
                </button>
            </div>
        `;
    }

    const modalHTML = `
        <div id="modal-documento" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; flex-direction: column; padding: 20px;">
            <!-- Cabeçalho do Modal -->
            <div style="background: white; border-radius: 10px 10px 0 0; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0; color: #333; font-size: 18px;">${descricao}</h3>
                    <div style="font-size: 12px; color: #666;">
                        Processo: ${formatarNumeroProcesso(numeroProcesso)} | ID Documento: ${idDocumento} | Tipo: ${mimetype}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button
                        onclick="downloadDocumento('${conteudoBase64}', '${mimetype}', '${descricao}')"
                        style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px;"
                        onmouseover="this.style.background='#218838'"
                        onmouseout="this.style.background='#28a745'"
                    >
                        ⬇️ Download
                    </button>
                    <button
                        onclick="fecharModalDocumento()"
                        style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;"
                        onmouseover="this.style.background='#c82333'"
                        onmouseout="this.style.background='#dc3545'"
                    >
                        ✖ Fechar
                    </button>
                </div>
            </div>

            <!-- Área de visualização do documento -->
            <div style="flex: 1; background: white; border-radius: 0 0 10px 10px; overflow: hidden; position: relative;">
                ${conteudoHTML}
            </div>
        </div>
    `;

    // Remover modal existente se houver
    const modalExistente = document.getElementById('modal-documento');
    if (modalExistente) {
        modalExistente.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Adicionar listener para fechar com ESC
    document.addEventListener('keydown', fecharModalComEsc);
}

function fecharModalDocumento() {
    const modal = document.getElementById('modal-documento');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', fecharModalComEsc);
}

function fecharModalComEsc(event) {
    if (event.key === 'Escape') {
        fecharModalDocumento();
    }
}

function downloadDocumento(conteudoBase64, mimetype, descricao) {
    try {
        // Converter Base64 para Blob
        const byteCharacters = atob(conteudoBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimetype });

        // Criar URL do blob
        const url = window.URL.createObjectURL(blob);

        // Definir extensão do arquivo baseado no mimetype
        let extensao = '';
        if (mimetype === 'application/pdf') extensao = '.pdf';
        else if (mimetype === 'text/html') extensao = '.html';
        else if (mimetype.startsWith('video/')) extensao = '.mp4';
        else if (mimetype.startsWith('image/png')) extensao = '.png';
        else if (mimetype.startsWith('image/jpeg')) extensao = '.jpg';
        else if (mimetype.startsWith('image/')) extensao = '.jpg';
        else extensao = '.bin';

        // Criar link de download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${descricao.replace(/[^a-zA-Z0-9]/g, '_')}${extensao}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar URL do blob
        window.URL.revokeObjectURL(url);

        // Feedback visual
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Download iniciado!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);

    } catch (error) {
        console.error('Erro ao fazer download:', error);
        alert('Erro ao fazer download do documento: ' + error.message);
    }
}

// Tornar funções globais para uso nos botões onclick
window.visualizarDocumento = visualizarDocumento;
window.fecharModalDocumento = fecharModalDocumento;
window.downloadDocumento = downloadDocumento;
