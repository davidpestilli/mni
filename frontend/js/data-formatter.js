/**
 * MÓDULO DE FORMATAÇÃO DE DATA
 *
 * Gerencia a formatação automática de campos de data com suporte a:
 * - Input mask automático (DD/MM/AAAA HH:MM:SS)
 * - Conversão para AAAAMMDDHHMMSS
 * - Conversão para ISO 8601 com timezone
 * - Validação automática
 */

const DataFormatter = {
    /**
     * Configurar formatação automática para um input de data
     *
     * @param {HTMLElement} inputElement - O elemento input
     * @param {Object} options - Opções de configuração
     *   - maxLength: número máximo de caracteres (padrão 19 para DD/MM/AAAA HH:MM:SS)
     *   - placeholder: texto placeholder
     */
    setup(inputElement, options = {}) {
        if (!inputElement) {
            console.error('DataFormatter: elemento não encontrado');
            return;
        }

        const maxLength = options.maxLength || 19; // DD/MM/AAAA HH:MM:SS = 19 chars
        inputElement.maxLength = maxLength;

        if (options.placeholder) {
            inputElement.placeholder = options.placeholder;
        }

        // Aplicar formatação ao digitar
        inputElement.addEventListener('input', (e) => {
            this.aplicarMask(e);
        });

        // Aplicar formatação ao colar
        inputElement.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const limpo = pastedText.replace(/\D/g, '').substring(0, 14);
            inputElement.value = this.formatarComMask(limpo);
            inputElement.setSelectionRange(inputElement.value.length, inputElement.value.length);
        });
    },

    /**
     * Aplicar mask automático ao digitar
     */
    aplicarMask(event) {
        const input = event.target;
        let valor = input.value;
        const cursorPos = input.selectionStart;

        // Extrair apenas números
        let numeros = valor.replace(/\D/g, '');

        // Limitar a 14 dígitos (DDMMAAAAHHMSS)
        numeros = numeros.substring(0, 14);

        // Aplicar formatação
        const formatado = this.formatarComMask(numeros);

        input.value = formatado;

        // Ajustar posição do cursor
        if (valor !== formatado) {
            const novoPos = this.calcularPosicaoCursor(valor, formatado, cursorPos);
            input.setSelectionRange(novoPos, novoPos);
        }
    },

    /**
     * Formatar número com mask DD/MM/AAAA HH:MM:SS
     *
     * @param {string} numeros - Apenas números (até 14 dígitos)
     * @returns {string} - Data formatada
     */
    formatarComMask(numeros) {
        if (!numeros) return '';

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

        return formatado;
    },

    /**
     * Calcular nova posição do cursor após formatação
     */
    calcularPosicaoCursor(valorAnterior, valorFormatado, posicaoAnterior) {
        // Contar caracteres especiais antes do cursor
        const especiaisAntes = valorFormatado
            .substring(0, posicaoAnterior)
            .replace(/\d/g, '').length;

        const especiaisAntesOriginal = valorAnterior
            .substring(0, posicaoAnterior)
            .replace(/\d/g, '').length;

        return posicaoAnterior + (especiaisAntes - especiaisAntesOriginal);
    },

    /**
     * Converter DD/MM/AAAA HH:MM:SS para AAAAMMDDHHMMSS
     * Se hora não for fornecida, usa 00:00:00
     *
     * @param {string} dataFormatada - Data no formato DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS
     * @returns {string} - Data em formato AAAAMMDDHHMMSS
     * @throws {Error} - Se formato inválido
     */
    converterParaMNI(dataFormatada) {
        dataFormatada = dataFormatada.trim();

        // Separar data e hora
        const partes = dataFormatada.split(' ');
        const dataParte = partes[0]; // DD/MM/AAAA
        const horaParte = partes[1] || '00:00:00'; // HH:MM:SS ou padrão

        // Validar e extrair data
        const dataMatch = dataParte.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!dataMatch) {
            throw new Error('Formato de data inválido. Use DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS');
        }

        const dia = dataMatch[1];
        const mes = dataMatch[2];
        const ano = dataMatch[3];

        // Extrair e validar hora
        let hora = '00';
        let minuto = '00';
        let segundo = '00';

        if (horaParte && horaParte !== '00:00:00') {
            const horaMatch = horaParte.match(/^(\d{2}):(\d{2}):(\d{2})$/);
            if (!horaMatch) {
                throw new Error('Formato de hora inválido. Use HH:MM:SS');
            }
            hora = horaMatch[1];
            minuto = horaMatch[2];
            segundo = horaMatch[3];
        }

        // Validações
        const diaNum = parseInt(dia);
        const mesNum = parseInt(mes);
        const horaNum = parseInt(hora);
        const minutoNum = parseInt(minuto);
        const segundoNum = parseInt(segundo);

        if (diaNum < 1 || diaNum > 31) {
            throw new Error('Dia inválido (1-31)');
        }
        if (mesNum < 1 || mesNum > 12) {
            throw new Error('Mês inválido (1-12)');
        }
        if (horaNum > 23) {
            throw new Error('Hora inválida (0-23)');
        }
        if (minutoNum > 59) {
            throw new Error('Minuto inválido (0-59)');
        }
        if (segundoNum > 59) {
            throw new Error('Segundo inválido (0-59)');
        }

        // Retornar formato AAAAMMDDHHMMSS
        return `${ano}${mes}${dia}${hora}${minuto}${segundo}`;
    },

    /**
     * Converter AAAAMMDDHHMMSS para ISO 8601 com timezone
     *
     * @param {string} dataMNI - Data em formato AAAAMMDDHHMMSS
     * @param {string} timezone - Timezone (padrão: -03:00 para São Paulo)
     * @returns {string} - Data em formato ISO 8601 (YYYY-MM-DDTHH:MM:SS-03:00)
     */
    converterParaISO8601(dataMNI, timezone = '-03:00') {
        if (!dataMNI || dataMNI.length !== 14) {
            throw new Error('Formato MNI inválido. Esperado AAAAMMDDHHMMSS');
        }

        const ano = dataMNI.substring(0, 4);
        const mes = dataMNI.substring(4, 6);
        const dia = dataMNI.substring(6, 8);
        const hora = dataMNI.substring(8, 10);
        const minuto = dataMNI.substring(10, 12);
        const segundo = dataMNI.substring(12, 14);

        return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${timezone}`;
    },

    /**
     * Formatar data para exibição em formato brasileiro
     * Aceita: DD/MM/AAAA, AAAAMMDD, AAAAMMDDHHMMSS, ISO 8601
     *
     * @param {string} data - Data em qualquer formato suportado
     * @returns {string} - Data formatada DD/MM/AAAA ou DD/MM/AAAA HH:MM:SS
     */
    formatarParaExibicao(data) {
        if (!data) return 'N/A';

        data = data.toString().trim();

        // Já está formatado
        if (data.includes('/')) {
            return data;
        }

        // ISO 8601 (2025-03-12T12:00:50-03:00)
        if (data.includes('T')) {
            try {
                const parts = data.split('T');
                const [ano, mes, dia] = parts[0].split('-');
                const hora = parts[1].substring(0, 8); // HH:MM:SS

                if (hora !== '00:00:00') {
                    return `${dia}/${mes}/${ano} ${hora}`;
                }
                return `${dia}/${mes}/${ano}`;
            } catch (e) {
                return data;
            }
        }

        // AAAAMMDDHHMMSS (14 dígitos)
        if (data.length === 14 && /^\d{14}$/.test(data)) {
            const dia = data.substring(6, 8);
            const mes = data.substring(4, 6);
            const ano = data.substring(0, 4);
            const hora = data.substring(8, 10);
            const minuto = data.substring(10, 12);
            const segundo = data.substring(12, 14);

            if (hora === '00' && minuto === '00' && segundo === '00') {
                return `${dia}/${mes}/${ano}`;
            }
            return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
        }

        // AAAAMMDD (8 dígitos)
        if (data.length === 8 && /^\d{8}$/.test(data)) {
            const dia = data.substring(6, 8);
            const mes = data.substring(4, 6);
            const ano = data.substring(0, 4);
            return `${dia}/${mes}/${ano}`;
        }

        return data;
    },

    /**
     * Obter apenas números da data formatada
     *
     * @param {string} dataFormatada - Data formatada DD/MM/AAAA HH:MM:SS
     * @returns {string} - Apenas números (DDMMAAAAHHMSS)
     */
    obterSoNumeros(dataFormatada) {
        return dataFormatada.replace(/\D/g, '').substring(0, 14);
    },

    /**
     * Validar se data está no formato correto
     *
     * @param {string} data - Data a validar
     * @returns {boolean} - True se válida
     */
    validar(data) {
        if (!data || typeof data !== 'string') return false;

        data = data.trim();

        // Formato DD/MM/AAAA HH:MM:SS
        const regexCompleto = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/;
        const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;

        if (regexCompleto.test(data)) {
            try {
                this.converterParaMNI(data);
                return true;
            } catch (e) {
                return false;
            }
        }

        if (regexData.test(data)) {
            try {
                this.converterParaMNI(data);
                return true;
            } catch (e) {
                return false;
            }
        }

        return false;
    }
};
