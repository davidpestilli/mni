/**
 * Middleware e serviço para auto-roteamento de peticionamento
 * Detecta o ambiente/sistema e redireciona para a rota correta
 */

const mni3Client = require('./mni3Client');
const mniClient = require('./mniClient');
const { gerarSenhaHashMNI } = require('./hashUtils');
const { suportaMNI2_2, suportaMNI3_0 } = require('../config/ambiente');

/**
 * Serviço unificado de peticionamento intermediário
 * Usa MNI 2.2 ou 3.0 automaticamente baseado no sistema
 * 
 * @param {string} usuario - CPF/Sigla do usuário
 * @param {string} senha - Senha (em texto plano, será hasheada internamente)
 * @param {string} numeroProcesso - Número do processo (20 dígitos)
 * @param {object} peticao - Dados da petição
 * @returns {Promise<object>} Resultado da operação
 */
async function entregarPeticaoAuto(usuario, senha, numeroProcesso, peticao) {
    try {
        // Determinar qual versão usar
        const usarMNI3 = suportaMNI2_2() === false || (suportaMNI3_0() && peticao.codigoTipoDocumento);
        
        console.log('[PETICIONAMENTO AUTO] ========================================');
        console.log('[PETICIONAMENTO AUTO] Sistema suporta MNI 2.2:', suportaMNI2_2());
        console.log('[PETICIONAMENTO AUTO] Sistema suporta MNI 3.0:', suportaMNI3_0());
        console.log('[PETICIONAMENTO AUTO] Usando MNI 3.0:', usarMNI3);
        console.log('[PETICIONAMENTO AUTO] ========================================');
        
        if (usarMNI3) {
            // Usar MNI 3.0
            console.log('[PETICIONAMENTO AUTO] Delegando para MNI 3.0 (entregarPeticao)');
            return await mni3Client.entregarPeticao(usuario, senha, numeroProcesso, peticao);
        } else {
            // Usar MNI 2.2
            console.log('[PETICIONAMENTO AUTO] Delegando para MNI 2.2 (entregarManifestacao)');
            
            // Preparar dados no formato esperado pelo MNI 2.2
            const manifestacao = {
                tipoDocumento: peticao.tipoDocumento || peticao.codigoTipoDocumento || 13,
                documento: peticao.documento,
                nomeDocumento: peticao.nomeDocumento || 'Petição.pdf',
                mimetype: peticao.mimetype || 'application/pdf',
                nivelSigilo: peticao.nivelSigilo || 0,
                descricaoDocumento: peticao.descricaoDocumento
            };
            
            // Gerar hash da senha (MNI 2.2 já faz internamente, mas deixar explícito)
            const senhaHash = gerarSenhaHashMNI(senha);
            
            return await mniClient.entregarManifestacao(
                usuario,
                senhaHash,
                numeroProcesso,
                manifestacao
            );
        }
        
    } catch (error) {
        console.error('[PETICIONAMENTO AUTO] Erro:', error.message);
        throw error;
    }
}

/**
 * Determinar qual rota o frontend deve usar
 * Retorna informações sobre qual versão usar
 */
function getInfoRotasPeticionamento() {
    const suportaMNI2 = suportaMNI2_2();
    const suportaMNI3 = suportaMNI3_0();
    
    let rotaRecomendada, rotaAlternativa;
    let descricao;
    
    if (!suportaMNI2 && suportaMNI3) {
        // Apenas MNI 3.0 (Execução Fiscal)
        rotaRecomendada = '/api/mni3/peticao';
        descricao = 'Este sistema suporta APENAS MNI 3.0. Use a rota recomendada.';
    } else if (suportaMNI2 && suportaMNI3) {
        // Ambas disponíveis (pode usar qualquer uma)
        rotaRecomendada = '/api/peticionamento/intermediario';
        rotaAlternativa = '/api/mni3/peticao';
        descricao = 'Este sistema suporta tanto MNI 2.2 quanto MNI 3.0. Use a rota recomendada ou a alternativa.';
    } else if (suportaMNI2 && !suportaMNI3) {
        // Apenas MNI 2.2
        rotaRecomendada = '/api/peticionamento/intermediario';
        descricao = 'Este sistema suporta APENAS MNI 2.2. Use a rota recomendada.';
    } else {
        // Nenhuma disponível (situação rara)
        descricao = 'Nenhuma versão do MNI está disponível para peticionamento.';
    }
    
    return {
        suportaMNI2_2: suportaMNI2,
        suportaMNI3_0: suportaMNI3,
        rotaRecomendada: rotaRecomendada,
        rotaAlternativa: rotaAlternativa,
        descricao: descricao,
        rotas: {
            mni2_2: {
                url: '/api/peticionamento/intermediario',
                disponivel: suportaMNI2
            },
            mni3_0: {
                url: '/api/mni3/peticao',
                disponivel: suportaMNI3
            }
        }
    };
}

module.exports = {
    entregarPeticaoAuto,
    getInfoRotasPeticionamento
};
