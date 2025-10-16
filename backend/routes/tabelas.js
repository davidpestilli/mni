const express = require('express');
const router = express.Router();
const tabelaClient = require('../services/tabelaClient');

/**
 * GET /api/tabelas
 * Listar tabelas disponíveis
 */
router.get('/', async (req, res) => {
    try {
        const tabelas = await tabelaClient.listarTabelas();

        res.json({
            success: true,
            data: tabelas
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao listar tabelas:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao listar tabelas'
        });
    }
});

/**
 * GET /api/tabelas/:nomeTabela
 * Consultar uma tabela específica
 */
router.get('/:nomeTabela', async (req, res) => {
    try {
        const { nomeTabela } = req.params;

        const registros = await tabelaClient.consultarTabela(nomeTabela);

        res.json({
            success: true,
            tabela: nomeTabela,
            count: Array.isArray(registros) ? registros.length : 0,
            data: registros
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao consultar tabela:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar tabela'
        });
    }
});

/**
 * GET /api/tabelas/tipos-documento/listar
 * Atalho para listar tipos de documento
 */
router.get('/tipos-documento/listar', async (req, res) => {
    try {
        const tipos = await tabelaClient.consultarTiposDocumento();

        res.json({
            success: true,
            tabela: 'TipoDocumento',
            count: Array.isArray(tipos) ? tipos.length : 0,
            data: tipos
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao consultar tipos de documento:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar tipos de documento'
        });
    }
});

/**
 * GET /api/tabelas/localidades/listar
 * Atalho para listar localidades judiciais (comarcas)
 */
router.get('/localidades/listar', async (req, res) => {
    try {
        const localidades = await tabelaClient.consultarLocalidades();

        // Formatar para facilitar uso no frontend
        const localidadesFormatadas = Array.isArray(localidades)
            ? localidades.map(l => ({
                codigo: l.CodLocalidadeJudicial || l.codigo,
                descricao: l.DesLocalidadeJudicial || l.descricao,
                uf: l.SigUfLocalidadeJudicial || 'SP',
                codigoLocalidade: l.CodLocalidade,
                ...l
            }))
            : localidades;

        res.json({
            success: true,
            tabela: 'LocalidadeJudicial',
            count: Array.isArray(localidadesFormatadas) ? localidadesFormatadas.length : 0,
            data: localidadesFormatadas
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao consultar localidades:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao consultar localidades'
        });
    }
});

/**
 * GET /api/tabelas/classes-processuais/listar
 * Atalho para listar classes processuais
 * Usa tabela estática como fallback se o TJSP retornar erro
 */
router.get('/classes-processuais/listar', async (req, res) => {
    try {
        // Tentar consultar do TJSP primeiro (usando nome correto: ClasseJudicial)
        const classes = await tabelaClient.consultarClassesJudiciais();

        res.json({
            success: true,
            tabela: 'ClasseProcessual',
            fonte: 'TJSP',
            count: Array.isArray(classes) ? classes.length : 0,
            data: classes
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao consultar classes processuais do TJSP:', error.message);

        // Fallback: usar tabela estática (CNJ)
        try {
            const classesEstaticas = require('../data/classes-processuais.json');
            console.log('[TABELAS] Usando tabela estática de classes processuais (CNJ)');

            res.json({
                success: true,
                tabela: 'ClasseProcessual',
                fonte: 'CNJ (Estática)',
                count: classesEstaticas.length,
                data: classesEstaticas,
                warning: 'Dados retornados da tabela local (CNJ). Serviço do TJSP indisponível.'
            });
        } catch (fallbackError) {
            res.status(500).json({
                success: false,
                message: 'Erro ao consultar classes processuais: ' + error.message,
                data: []
            });
        }
    }
});

/**
 * GET /api/tabelas/assuntos/listar
 * Atalho para listar assuntos processuais
 * Usa tabela estática como fallback se o TJSP retornar erro
 */
router.get('/assuntos/listar', async (req, res) => {
    try {
        // Tentar consultar do TJSP primeiro (usando nome correto: AssuntoJudicial)
        const assuntos = await tabelaClient.consultarAssuntosJudiciais();

        res.json({
            success: true,
            tabela: 'AssuntoProcessual',
            fonte: 'TJSP',
            count: Array.isArray(assuntos) ? assuntos.length : 0,
            data: assuntos
        });

    } catch (error) {
        console.error('[TABELAS] Erro ao consultar assuntos processuais do TJSP:', error.message);

        // Fallback: usar tabela estática (CNJ)
        try {
            const assuntosEstaticos = require('../data/assuntos-processuais.json');
            console.log('[TABELAS] Usando tabela estática de assuntos processuais (CNJ)');

            res.json({
                success: true,
                tabela: 'AssuntoProcessual',
                fonte: 'CNJ (Estática)',
                count: assuntosEstaticos.length,
                data: assuntosEstaticos,
                warning: 'Dados retornados da tabela local (CNJ). Serviço do TJSP indisponível.'
            });
        } catch (fallbackError) {
            res.status(500).json({
                success: false,
                message: 'Erro ao consultar assuntos processuais: ' + error.message,
                data: []
            });
        }
    }
});

module.exports = router;
