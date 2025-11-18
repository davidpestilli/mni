// Utilitários gerais adaptados para React

/**
 * Obter token de autenticação
 */
export function getToken() {
    return localStorage.getItem('mni_token');
}

/**
 * Obter ID do usuário
 */
export function getUserId() {
    return localStorage.getItem('mni_user_id');
}

/**
 * Salvar credenciais no localStorage
 */
export function saveAuth(token, userId) {
    localStorage.setItem('mni_token', token);
    localStorage.setItem('mni_user_id', userId);
}

/**
 * Limpar autenticação
 */
export function clearAuth() {
    localStorage.removeItem('mni_token');
    localStorage.removeItem('mni_user_id');
}

/**
 * Fazer requisição autenticada
 */
export async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
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
        clearAuth();
        throw new Error('Sessão expirada');
    }

    return response;
}

/**
 * Formatar número de processo (adicionar pontos e traços)
 */
export function formatarNumeroProcesso(numero) {
    if (!numero || numero.length !== 20) return numero;

    // NNNNNNN-DD.AAAA.J.TR.OOOO
    return `${numero.substr(0, 7)}-${numero.substr(7, 2)}.${numero.substr(9, 4)}.${numero.substr(13, 1)}.${numero.substr(14, 2)}.${numero.substr(16, 4)}`;
}

/**
 * Validar número de processo
 */
export function validarNumeroProcesso(numero) {
    return /^\d{20}$/.test(numero);
}

/**
 * Limpar número de processo (remover pontos e traços)
 */
export function limparNumeroProcesso(numero) {
    if (!numero) return '';
    return numero.replace(/[^\d]/g, '');
}

/**
 * Converter arquivo para Base64
 */
export function fileToBase64(file) {
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
export function downloadBase64File(base64, filename, mimetype = 'application/pdf') {
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
export function formatarDataHoraMNI(dataHora) {
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
export function getDataHoraMNI() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const dia = String(now.getDate()).padStart(2, '0');
    const hora = String(now.getHours()).padStart(2, '0');
    const minuto = String(now.getMinutes()).padStart(2, '0');
    const segundo = String(now.getSeconds()).padStart(2, '0');

    return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
}

/**
 * Formatar CPF (000.000.000-00)
 */
export function formatarCPF(cpf) {
    if (!cpf) return '';
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) return cpf;
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formatar CNPJ (00.000.000/0000-00)
 */
export function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return cnpj;
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Validar CPF
 */
export function validarCPF(cpf) {
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11) return false;

    // Validação básica (todos os dígitos iguais)
    if (/^(\d)\1+$/.test(numeros)) return false;

    // Cálculo dos dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(numeros.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;

    if (digitoVerificador1 !== parseInt(numeros.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(numeros.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;

    return digitoVerificador2 === parseInt(numeros.charAt(10));
}

/**
 * Validar CNPJ
 */
export function validarCNPJ(cnpj) {
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) return false;

    // Validação básica (todos os dígitos iguais)
    if (/^(\d)\1+$/.test(numeros)) return false;

    // Cálculo dos dígitos verificadores
    let tamanho = numeros.length - 2;
    let numeros_validacao = numeros.substring(0, tamanho);
    const digitos = numeros.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros_validacao.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros_validacao = numeros.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros_validacao.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    return resultado == digitos.charAt(1);
}

// ========================================
// CACHE DE CLASSES E ASSUNTOS
// ========================================

const mapeamentoCache = {
    classes: new Map(),
    assuntos: new Map(),
    classesCarregado: false,
    assuntosCarregado: false
};

/**
 * Buscar descrição de classe processual
 * Retorna o código se não encontrar descrição
 */
export async function buscarDescricaoClasse(codigo) {
    if (!codigo) return '';

    const codigoStr = String(codigo);

    // Retornar do cache se já carregado
    if (mapeamentoCache.classes.has(codigoStr)) {
        return mapeamentoCache.classes.get(codigoStr);
    }

    // Buscar do backend
    try {
        const response = await fetch(`/api/mni3/descricao-classe/${codigoStr}`);
        const data = await response.json();

        if (data.success && data.descricao) {
            // Adicionar ao cache
            mapeamentoCache.classes.set(codigoStr, data.descricao);
            return data.descricao;
        }
    } catch (error) {
        console.error('[CACHE] Erro ao buscar descrição de classe:', error);
    }

    return codigoStr;
}

/**
 * Buscar descrição de assunto
 * Retorna o código se não encontrar descrição
 */
export async function buscarDescricaoAssunto(codigo) {
    if (!codigo) return '';

    const codigoStr = String(codigo);

    // Retornar do cache se já carregado
    if (mapeamentoCache.assuntos.has(codigoStr)) {
        return mapeamentoCache.assuntos.get(codigoStr);
    }

    // Buscar do backend
    try {
        const response = await fetch(`/api/mni3/descricao-assunto/${codigoStr}`);
        const data = await response.json();

        if (data.success && data.descricao) {
            // Adicionar ao cache
            mapeamentoCache.assuntos.set(codigoStr, data.descricao);
            return data.descricao;
        }
    } catch (error) {
        console.error('[CACHE] Erro ao buscar descrição de assunto:', error);
    }

    return codigoStr;
}

/**
 * Carregar classes de uma localidade para o cache
 * Isso permite que as descrições fiquem disponíveis
 */
export async function carregarClassesNoCache(codigoLocalidade) {
    if (!codigoLocalidade) return;

    try {
        const response = await fetch(`/api/mni3/classes/${codigoLocalidade}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(classe => {
                const codigo = String(classe.codigo);
                const descricao = classe.descricao || codigo;
                mapeamentoCache.classes.set(codigo, descricao);
            });
            mapeamentoCache.classesCarregado = true;
            console.log('[CACHE] Classes carregadas:', mapeamentoCache.classes.size);
        }
    } catch (error) {
        console.error('[CACHE] Erro ao carregar classes:', error);
    }
}

/**
 * Carregar assuntos de uma localidade/classe para o cache
 */
export async function carregarAssuntosNoCache(codigoLocalidade, codigoClasse) {
    if (!codigoLocalidade || !codigoClasse) return;

    try {
        const response = await fetch(`/api/mni3/assuntos/${codigoLocalidade}/${codigoClasse}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
            data.data.forEach(assunto => {
                const codigo = String(assunto.codigo || assunto.codigoNacional);
                const descricao = assunto.descricao || codigo;
                mapeamentoCache.assuntos.set(codigo, descricao);
            });
            mapeamentoCache.assuntosCarregado = true;
            console.log('[CACHE] Assuntos carregados:', mapeamentoCache.assuntos.size);
        }
    } catch (error) {
        console.error('[CACHE] Erro ao carregar assuntos:', error);
    }
}
