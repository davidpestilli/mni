const peticaoProcessoInput = document.getElementById('peticao-processo');
const tipoDocumentoSelect = document.getElementById('tipo-documento-select');
const btnCarregarTipos = document.getElementById('btn-carregar-tipos');
const tiposInfo = document.getElementById('tipos-info');
const fileUploadArea = document.getElementById('file-upload-area');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const descricaoDocumentoInput = document.getElementById('descricao-documento');
const btnEnviarPeticao = document.getElementById('btn-enviar-peticao');
const peticaoResultado = document.getElementById('peticao-resultado');

let selectedFile = null;
let tiposDocumento = [];

// Formatação automática do CPF do Signatário (opcional)
const signatarioIntermediarioInput = document.getElementById('signatario-intermediario');
if (signatarioIntermediarioInput) {
    signatarioIntermediarioInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
        
        // Formata: 000.000.000-00
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        
        if (value.length > 9) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
        } else if (value.length > 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
        } else if (value.length > 3) {
            value = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
        }
        
        e.target.value = value;
    });
}

// Remove automaticamente pontos e traços ao colar ou digitar
peticaoProcessoInput.addEventListener('input', (e) => {
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
peticaoProcessoInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const cleanedText = pastedText.replace(/[^0-9]/g, '');

    const cursorPosition = e.target.selectionStart;
    const currentValue = e.target.value;
    const newValue = currentValue.substring(0, cursorPosition) + cleanedText + currentValue.substring(e.target.selectionEnd);

    e.target.value = newValue.substring(0, 20); // Limita a 20 dígitos
    e.target.setSelectionRange(cursorPosition + cleanedText.length, cursorPosition + cleanedText.length);
});

// Carregar tipos de documento
btnCarregarTipos.addEventListener('click', carregarTiposDocumento);

async function carregarTiposDocumento() {
    try {
        btnCarregarTipos.disabled = true;
        btnCarregarTipos.textContent = 'Carregando...';
        tiposInfo.textContent = 'Buscando tipos de documento...';
        tiposInfo.style.color = '#666';

        // Verificar qual sistema está ativo
        const sistemaResponse = await fetch('/api/ambiente/info');
        const sistemaData = await sistemaResponse.json();
        const sistema = sistemaData.sistema?.sistema || '1G_CIVIL';
        
        console.log('[PETICIONAMENTO] Sistema ativo:', sistema);
        
        // Para Execução Fiscal (MNI 3.0), não há consulta de tipos ainda
        // Usuario deve saber o código (ex: 82400092)
        if (sistema === '1G_EXEC_FISCAL') {
            tipoDocumentoSelect.innerHTML = '<option value="">Digite o código do tipo de documento</option>';
            tipoDocumentoSelect.innerHTML += '<option value="82400092">82400092 - Petição (Execução Fiscal)</option>';
            tiposInfo.innerHTML = `
                <strong>ℹ️ Sistema: Execução Fiscal (MNI 3.0)</strong><br>
                <small>Os códigos de tipo de documento são específicos deste sistema.<br>
                Se precisar de outros códigos, consulte a documentação do tribunal.</small>
            `;
            tiposInfo.style.color = '#0066cc';
            btnCarregarTipos.disabled = false;
            btnCarregarTipos.textContent = 'Tipos Carregados';
            return;
        }

        // Para Primeiro Grau Civil (MNI 2.2), consultar normalmente
        const response = await fetch('/api/tabelas/TipoDocumento');
        const data = await response.json();

        if (data.success) {
            tiposDocumento = data.data;

            // Limpar select
            tipoDocumentoSelect.innerHTML = '<option value="">Selecione o tipo de documento</option>';

            // Popular select
            if (Array.isArray(tiposDocumento)) {
                tiposDocumento.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.codigo;
                    option.textContent = `${tipo.codigo} - ${tipo.descricao}`;
                    tipoDocumentoSelect.appendChild(option);
                });

                tiposInfo.textContent = `✓ ${tiposDocumento.length} tipos carregados`;
                tiposInfo.style.color = '#28a745';
            } else {
                // Se vier em formato diferente, exibir JSON bruto
                console.log('Tipos de documento (formato não padronizado):', tiposDocumento);
                tiposInfo.innerHTML = `
                    <strong>⚠️ Tipos carregados em formato não padronizado.</strong><br>
                    Veja o console (F12) para a estrutura dos dados.<br>
                    Informe manualmente o código do tipo.
                `;
                tiposInfo.style.color = '#ff9800';

                // Adicionar opção de digitação manual
                const manualOption = document.createElement('option');
                manualOption.value = 'manual';
                manualOption.textContent = '[Digitar código manualmente]';
                tipoDocumentoSelect.appendChild(manualOption);
            }

        } else {
            throw new Error(data.message || 'Erro ao carregar tipos');
        }

    } catch (error) {
        console.error('Erro ao carregar tipos:', error);
        tiposInfo.innerHTML = `
            ❌ Erro: ${error.message}<br>
            <small>Digite o código manualmente ou verifique a conexão.</small>
        `;
        tiposInfo.style.color = '#dc3545';

        // Adicionar opção de digitação manual
        tipoDocumentoSelect.innerHTML = '<option value="">Digite o código manualmente abaixo</option>';
    } finally {
        btnCarregarTipos.disabled = false;
        btnCarregarTipos.textContent = '🔄 Carregar';
    }
}

// Se selecionou "manual", permitir digitação
tipoDocumentoSelect.addEventListener('change', (e) => {
    if (e.target.value === 'manual') {
        const codigo = prompt('Digite o código do tipo de documento:');
        if (codigo) {
            const option = document.createElement('option');
            option.value = codigo;
            option.textContent = `${codigo} - [Manual]`;
            option.selected = true;
            tipoDocumentoSelect.appendChild(option);
        }
    }
});

// Click na área de upload
fileUploadArea.addEventListener('click', () => {
    fileInput.click();
});

// Seleção de arquivo
fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

// Drag and drop
fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
});

function handleFileSelect(file) {
    if (!file) return;

    // Validar tipo
    if (file.type !== 'application/pdf') {
        alert('Apenas arquivos PDF são permitidos');
        return;
    }

    // Validar tamanho (11MB)
    const maxSize = 11 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('Arquivo muito grande. Tamanho máximo: 11MB');
        return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    fileNameDisplay.style.color = '#28a745';
}

// Enviar petição
btnEnviarPeticao.addEventListener('click', enviarPeticao);

async function enviarPeticao() {
    const numeroProcesso = peticaoProcessoInput.value.trim();
    const tipoDocumento = tipoDocumentoSelect.value.trim();
    const descricao = descricaoDocumentoInput.value.trim();
    const signatario = document.getElementById('signatario-intermediario').value.trim().replace(/\D/g, '');

    // Validações
    if (!validarNumeroProcesso(numeroProcesso)) {
        showError(peticaoResultado, 'Número do processo inválido. Deve conter exatamente 20 dígitos.');
        return;
    }

    if (!tipoDocumento) {
        showError(peticaoResultado, 'Informe o tipo de documento');
        return;
    }

    if (!selectedFile) {
        showError(peticaoResultado, 'Selecione um arquivo PDF');
        return;
    }

    if (!signatario || signatario.length !== 11) {
        showError(peticaoResultado, 'Informe um CPF válido para o signatário (11 dígitos)');
        return;
    }

    try {
        btnEnviarPeticao.disabled = true;
        btnEnviarPeticao.textContent = 'Enviando...';
        showInfo(peticaoResultado, 'Convertendo arquivo para Base64...');

        // Converter arquivo para Base64
        const base64 = await fileToBase64(selectedFile);

        showInfo(peticaoResultado, 'Enviando petição ao servidor...');

        // Detectar qual rota usar baseado no sistema
        const sistema = localStorage.getItem('mni_sistema_atual') || '1G_CIVIL';
        const usarMNI3 = (sistema === '1G_EXEC_FISCAL' || sistema === '2G_CIVIL');
        
        console.log('[PETICIONAMENTO] Sistema:', sistema);
        console.log('[PETICIONAMENTO] Usar MNI 3.0:', usarMNI3);
        
        let response, data;
        
        if (usarMNI3) {
            // Usar MNI 3.0 (Execução Fiscal)
            console.log('[PETICIONAMENTO] Usando MNI 3.0');
            console.log('[PETICIONAMENTO] CPF Signatário:', signatario);
            showInfo(peticaoResultado, 'Enviando via MNI 3.0 (Execução Fiscal)...');
            
            const peticao = {
                numeroProcesso: numeroProcesso,
                codigoTipoDocumento: tipoDocumento, // String
                documento: base64,
                nomeDocumento: selectedFile.name,
                mimetype: 'application/pdf',
                descricaoDocumento: descricao || '',
                cpfProcurador: signatario  // ← CORRIGIDO: cpfProcurador ao invés de signatario
            };
            
            response = await apiRequest('/api/mni3/peticao', {
                method: 'POST',
                body: JSON.stringify(peticao)
            });
            
        } else {
            // Usar MNI 2.2 (Primeiro Grau Civil)
            console.log('[PETICIONAMENTO] Usando MNI 2.2');
            console.log('[PETICIONAMENTO] CPF Signatário:', signatario);
            showInfo(peticaoResultado, 'Enviando via MNI 2.2 (Primeiro Grau Civil)...');
            
            const manifestacao = {
                tipoDocumento: parseInt(tipoDocumento),
                documento: base64,
                nomeDocumento: selectedFile.name,
                mimetype: 'application/pdf',
                dataDocumento: getDataHoraMNI(),
                descricaoDocumento: descricao,
                signatario: signatario
            };
            
            response = await apiRequest(`/api/processos/${numeroProcesso}/manifestacoes`, {
                method: 'POST',
                body: JSON.stringify(manifestacao)
            });
        }

        data = await response.json();

        if (data.success) {
            const resultado = data.data;
            showSuccess(peticaoResultado, `
                <strong>✓ Petição enviada com sucesso!</strong><br><br>
                <strong>Versão MNI:</strong> ${data.versao || (usarMNI3 ? '3.0' : '2.2')}<br>
                <strong>Número do Protocolo:</strong> ${resultado.numeroProtocolo || 'N/A'}<br>
                <strong>Data do Protocolo:</strong> ${resultado.dataProtocolo || resultado.dataOperacao || 'N/A'}<br>
                <strong>Mensagem:</strong> ${data.message || resultado.mensagem || 'N/A'}
            `);

            // Limpar formulário
            limparFormularioPeticao();

        } else {
            showError(peticaoResultado, data.message || 'Erro ao enviar petição');
        }

    } catch (error) {
        console.error('Erro ao enviar petição:', error);
        showError(peticaoResultado, 'Erro ao conectar com o servidor: ' + error.message);
    } finally {
        btnEnviarPeticao.disabled = false;
        btnEnviarPeticao.textContent = 'Enviar Petição';
    }
}

function limparFormularioPeticao() {
    peticaoProcessoInput.value = '';
    tipoDocumentoSelect.value = '';
    descricaoDocumentoInput.value = '';
    document.getElementById('signatario-intermediario').value = '';
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    selectedFile = null;
}
