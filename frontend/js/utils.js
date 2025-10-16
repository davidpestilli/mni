// Utilitários gerais

/**
 * Obter token de autenticação
 */
function getToken() {
    return localStorage.getItem('mni_token');
}

/**
 * Obter ID do usuário
 */
function getUserId() {
    return localStorage.getItem('mni_user_id');
}

/**
 * Fazer requisição autenticada
 */
async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
        window.location.href = 'login.html';
        throw new Error('Não autenticado');
    }

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    const response = await fetch(endpoint, mergedOptions);

    if (response.status === 401) {
        // Token inválido ou expirado
        localStorage.removeItem('mni_token');
        localStorage.removeItem('mni_user_id');
        window.location.href = 'login.html';
        throw new Error('Sessão expirada');
    }

    return response;
}

/**
 * Mostrar mensagem de erro
 */
function showError(container, message) {
    container.innerHTML = `
        <div class="alert alert-error">
            ${message}
        </div>
    `;
}

/**
 * Mostrar mensagem de sucesso
 */
function showSuccess(container, message) {
    container.innerHTML = `
        <div class="alert alert-success">
            ${message}
        </div>
    `;
}

/**
 * Mostrar mensagem de info
 */
function showInfo(container, message) {
    container.innerHTML = `
        <div class="alert alert-info">
            ${message}
        </div>
    `;
}

/**
 * Mostrar loading
 */
function showLoading(element) {
    element.style.display = 'flex';
}

/**
 * Esconder loading
 */
function hideLoading(element) {
    element.style.display = 'none';
}

/**
 * Formatar número de processo (adicionar pontos e traços)
 */
function formatarNumeroProcesso(numero) {
    if (!numero || numero.length !== 20) return numero;

    // NNNNNNN-DD.AAAA.J.TR.OOOO
    return `${numero.substr(0, 7)}-${numero.substr(7, 2)}.${numero.substr(9, 4)}.${numero.substr(13, 1)}.${numero.substr(14, 2)}.${numero.substr(16, 4)}`;
}

/**
 * Validar número de processo
 */
function validarNumeroProcesso(numero) {
    return /^\d{20}$/.test(numero);
}

/**
 * Converter arquivo para Base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remover o prefixo "data:application/pdf;base64,"
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

/**
 * Download de arquivo Base64
 */
function downloadBase64File(base64, filename, mimetype = 'application/pdf') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimetype });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    window.URL.revokeObjectURL(link.href);
}

/**
 * Formatar data/hora MNI (AAAAMMDDHHMMSS -> DD/MM/AAAA HH:MM:SS)
 */
function formatarDataHoraMNI(dataHora) {
    if (!dataHora) return '';

    const str = dataHora.toString();

    if (str.length === 14) {
        return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)} ${str.substr(8, 2)}:${str.substr(10, 2)}:${str.substr(12, 2)}`;
    }

    if (str.length === 8) {
        return `${str.substr(6, 2)}/${str.substr(4, 2)}/${str.substr(0, 4)}`;
    }

    return dataHora;
}

/**
 * Obter data/hora atual no formato MNI (AAAAMMDDHHMMSS)
 */
function getDataHoraMNI() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const dia = String(now.getDate()).padStart(2, '0');
    const hora = String(now.getHours()).padStart(2, '0');
    const minuto = String(now.getMinutes()).padStart(2, '0');
    const segundo = String(now.getSeconds()).padStart(2, '0');

    return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
}
