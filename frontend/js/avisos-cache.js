// ========================================
// SISTEMA DE CACHE DE AVISOS
// ========================================
// Cache usando sessionStorage para manter avisos enquanto a sessão persistir
//
// Este módulo gerencia o cache de avisos pendentes durante a sessão do usuário
// Eliminando a necessidade de refazer requisições ao servidor cada vez que
// o usuário volta à aba de Avisos Pendentes

const CACHE_AVISOS = {
    KEYS: {
        avisos_aguardando: 'mni_avisos_aguardando',
        avisos_abertos: 'mni_avisos_abertos',
        idRepresentado: 'mni_representado_id_cache',
        timestamp: 'mni_avisos_timestamp'
    },

    /**
     * Obter avisos do cache de sessão
     * Retorna null se cache não existir ou estiver vazio
     */
    obterDoCache() {
        try {
            const avisosAguardando = sessionStorage.getItem(this.KEYS.avisos_aguardando);
            const avisosAbertos = sessionStorage.getItem(this.KEYS.avisos_abertos);

            if (avisosAguardando && avisosAbertos) {
                console.log('📦 Avisos recuperados do cache de sessão');
                const timestamp = sessionStorage.getItem(this.KEYS.timestamp);
                if (timestamp) {
                    const dataCache = new Date(timestamp);
                    const tempoDecorrido = Math.floor((Date.now() - dataCache.getTime()) / 1000);
                    console.log(`📅 Cache salvo há ${tempoDecorrido} segundos`);
                }

                const idRepresentadoCache = sessionStorage.getItem(this.KEYS.idRepresentado);

                return {
                    aguardando: JSON.parse(avisosAguardando),
                    abertos: JSON.parse(avisosAbertos),
                    idRepresentado: idRepresentadoCache
                };
            }
            console.log('📭 Cache vazio ou não encontrado');
            return null;
        } catch (error) {
            console.error('❌ Erro ao obter avisos do cache:', error);
            return null;
        }
    },

    /**
     * Salvar avisos no cache de sessão
     */
    salvarNoCache(avisosAguardando, avisosAbertos, idRepresentado) {
        try {
            sessionStorage.setItem(
                this.KEYS.avisos_aguardando,
                JSON.stringify(avisosAguardando || [])
            );
            sessionStorage.setItem(
                this.KEYS.avisos_abertos,
                JSON.stringify(avisosAbertos || [])
            );

            if (idRepresentado) {
                sessionStorage.setItem(this.KEYS.idRepresentado, idRepresentado);
            } else {
                sessionStorage.removeItem(this.KEYS.idRepresentado);
            }

            sessionStorage.setItem(this.KEYS.timestamp, new Date().toISOString());

            const total = (avisosAguardando?.length || 0) + (avisosAbertos?.length || 0);
            console.log(`✅ ${total} avisos salvos no cache de sessão`);
        } catch (error) {
            console.error('❌ Erro ao salvar avisos no cache:', error);
        }
    },

    /**
     * Limpar cache de avisos
     */
    limpar() {
        try {
            sessionStorage.removeItem(this.KEYS.avisos_aguardando);
            sessionStorage.removeItem(this.KEYS.avisos_abertos);
            sessionStorage.removeItem(this.KEYS.idRepresentado);
            sessionStorage.removeItem(this.KEYS.timestamp);
            console.log('🗑️ Cache de avisos foi limpo');
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    },

    /**
     * Verificar se o cache é válido para o filtro atual
     * Retorna false se o idRepresentado mudou
     */
    ehValido(idRepresentadoAtual) {
        try {
            const cache = this.obterDoCache();
            if (!cache) return false;

            // Se há filtro, validar que é o mesmo
            if (idRepresentadoAtual && cache.idRepresentado !== idRepresentadoAtual) {
                console.log('⚠️ Filtro de representado mudou, invalidando cache');
                return false;
            }

            // Se não há filtro atual mas há no cache, também invalidar
            if (!idRepresentadoAtual && cache.idRepresentado) {
                console.log('⚠️ Filtro foi removido, invalidando cache');
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao validar cache:', error);
            return false;
        }
    },

    /**
     * Atualizar apenas a lista de avisos aguardando (quando um prazo é aberto)
     */
    atualizarAguardando(novoAvisos, idRepresentado) {
        try {
            const avisosAbertos = sessionStorage.getItem(this.KEYS.avisos_abertos);
            if (avisosAbertos) {
                this.salvarNoCache(novoAvisos, JSON.parse(avisosAbertos), idRepresentado);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar cache de aguardando:', error);
        }
    },

    /**
     * Atualizar apenas a lista de avisos abertos (quando um prazo é aberto)
     */
    atualizarAbertos(novoAvisos, idRepresentado) {
        try {
            const avisosAguardando = sessionStorage.getItem(this.KEYS.avisos_aguardando);
            if (avisosAguardando) {
                this.salvarNoCache(JSON.parse(avisosAguardando), novoAvisos, idRepresentado);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar cache de abertos:', error);
        }
    }
};
