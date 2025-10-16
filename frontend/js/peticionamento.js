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

    try {
        btnEnviarPeticao.disabled = true;
        btnEnviarPeticao.textContent = 'Enviando...';
        showInfo(peticaoResultado, 'Convertendo arquivo para Base64...');

        // Converter arquivo para Base64
        const base64 = await fileToBase64(selectedFile);

        showInfo(peticaoResultado, 'Enviando petição ao servidor...');

        const manifestacao = {
            tipoDocumento: parseInt(tipoDocumento),
            documento: base64,
            nomeDocumento: selectedFile.name,
            mimetype: 'application/pdf',
            dataDocumento: getDataHoraMNI(),
            descricaoDocumento: descricao
        };

        const response = await apiRequest(`/api/processos/${numeroProcesso}/manifestacoes`, {
            method: 'POST',
            body: JSON.stringify(manifestacao)
        });

        const data = await response.json();

        if (data.success) {
            const resultado = data.data;
            showSuccess(peticaoResultado, `
                <strong>✓ Petição enviada com sucesso!</strong><br><br>
                <strong>Número do Protocolo:</strong> ${resultado.numeroProtocolo || 'N/A'}<br>
                <strong>Data do Protocolo:</strong> ${resultado.dataProtocolo || 'N/A'}<br>
                <strong>Mensagem:</strong> ${resultado.mensagem || 'N/A'}
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
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    selectedFile = null;
}
