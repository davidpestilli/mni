/**
 * Gerenciador de Ambiente (HML/PROD) e Sistema (1G_CIVIL/1G_EXEC_FISCAL)
 * Retorna os endpoints corretos baseado no ambiente e sistema ativo
 */

require('dotenv').config();

// Estado global do ambiente e sistema (podem ser mudados via API)
let ambienteAtual = process.env.AMBIENTE_ATIVO || 'HML';
let sistemaAtual = process.env.SISTEMA_ATIVO || '1G_CIVIL';

// Sistemas disponíveis
const SISTEMAS_DISPONÍVEIS = {
    '1G_CIVIL': {
        nome: 'Primeiro Grau Civil',
        ambientesDisponiveis: ['HML', 'PROD']
    },
    '1G_EXEC_FISCAL': {
        nome: 'Primeiro Grau Execução Fiscal',
        ambientesDisponiveis: ['HML'] // Por enquanto, apenas HML está disponível
    }
};

/**
 * Obter endpoints do MNI 2.2 baseado no ambiente atual
 */
function getEndpoints2_2() {
    const ambiente = ambienteAtual.toUpperCase();

    if (ambiente === 'PROD') {
        return {
            endpoint: process.env.MNI_2_2_PROD_ENDPOINT,
            wsdlUrl: process.env.MNI_2_2_PROD_WSDL_URL,
            ambiente: 'PRODUÇÃO',
            versao: '2.2'
        };
    } else {
        return {
            endpoint: process.env.MNI_2_2_HML_ENDPOINT,
            wsdlUrl: process.env.MNI_2_2_HML_WSDL_URL,
            ambiente: 'HOMOLOGAÇÃO',
            versao: '2.2'
        };
    }
}

/**
 * Obter endpoints do MNI 3.0 baseado no ambiente e sistema atual
 */
function getEndpoints3_0() {
    const ambiente = ambienteAtual.toUpperCase();
    const sistema = sistemaAtual.toUpperCase();

    let endpoint, wsdlUrl;

    // Determinar endpoints baseado no sistema
    if (sistema === '1G_EXEC_FISCAL') {
        // Sistema Execução Fiscal
        if (ambiente === 'PROD') {
            endpoint = process.env.MNI_3_0_EXEC_FISCAL_PROD_ENDPOINT;
            wsdlUrl = process.env.MNI_3_0_EXEC_FISCAL_PROD_WSDL_URL;
        } else {
            endpoint = process.env.MNI_3_0_EXEC_FISCAL_HML_ENDPOINT;
            wsdlUrl = process.env.MNI_3_0_EXEC_FISCAL_HML_WSDL_URL;
        }
    } else {
        // Sistema 1G Civil (padrão)
        if (ambiente === 'PROD') {
            endpoint = process.env.MNI_3_0_PROD_ENDPOINT;
            wsdlUrl = process.env.MNI_3_0_PROD_WSDL_URL;
        } else {
            endpoint = process.env.MNI_3_0_HML_ENDPOINT;
            wsdlUrl = process.env.MNI_3_0_HML_WSDL_URL;
        }
    }

    return {
        endpoint: endpoint,
        wsdlUrl: wsdlUrl,
        ambiente: ambiente === 'PROD' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO',
        versao: '3.0',
        sistema: SISTEMAS_DISPONÍVEIS[sistema]?.nome || sistema
    };
}

/**
 * Obter ambiente atual
 */
function getAmbienteAtual() {
    return ambienteAtual.toUpperCase();
}

/**
 * Obter sistema atual
 */
function getSistemaAtual() {
    return sistemaAtual.toUpperCase();
}

/**
 * Obter informações do sistema atual
 */
function getInfoSistemaAtual() {
    const sistema = sistemaAtual.toUpperCase();
    return {
        sistema: sistema,
        nome: SISTEMAS_DISPONÍVEIS[sistema]?.nome || sistema,
        ambientesDisponiveis: SISTEMAS_DISPONÍVEIS[sistema]?.ambientesDisponiveis || []
    };
}

/**
 * Mudar ambiente (HML ou PROD)
 * Valida se o ambiente é suportado pelo sistema atual
 */
function setAmbiente(novoAmbiente) {
    const env = novoAmbiente.toUpperCase();
    const sistema = sistemaAtual.toUpperCase();

    // Validar ambiente
    if (env !== 'HML' && env !== 'PROD') {
        throw new Error('Ambiente inválido. Use "HML" ou "PROD"');
    }

    // Validar se o ambiente é suportado pelo sistema
    const ambientesDisponiveis = SISTEMAS_DISPONÍVEIS[sistema]?.ambientesDisponiveis || [];
    if (!ambientesDisponiveis.includes(env)) {
        throw new Error(
            `Ambiente "${env}" não suportado para o sistema "${SISTEMAS_DISPONÍVEIS[sistema]?.nome}". ` +
            `Ambientes disponíveis: ${ambientesDisponiveis.join(', ')}`
        );
    }

    ambienteAtual = env;

    console.log(`[AMBIENTE] Ambiente alterado para: ${ambienteAtual}`);
    console.log(`[SISTEMA] Sistema: ${SISTEMAS_DISPONÍVEIS[sistema]?.nome}`);
    console.log(`[AMBIENTE] MNI 2.2 Endpoint: ${getEndpoints2_2().endpoint}`);
    console.log(`[AMBIENTE] MNI 3.0 Endpoint: ${getEndpoints3_0().endpoint}`);

    return {
        sucesso: true,
        ambiente: ambienteAtual,
        sistema: getInfoSistemaAtual(),
        endpoints: {
            mni2_2: getEndpoints2_2(),
            mni3_0: getEndpoints3_0()
        }
    };
}

/**
 * Mudar sistema (1G_CIVIL ou 1G_EXEC_FISCAL)
 */
function setSistema(novoSistema) {
    const sis = novoSistema.toUpperCase();

    // Validar sistema
    if (!SISTEMAS_DISPONÍVEIS[sis]) {
        const sistemasValidos = Object.keys(SISTEMAS_DISPONÍVEIS).join(', ');
        throw new Error(`Sistema inválido. Sistemas disponíveis: ${sistemasValidos}`);
    }

    sistemaAtual = sis;

    // Se o sistema não suporta o ambiente atual, mudar para HML
    const ambientesDisponiveis = SISTEMAS_DISPONÍVEIS[sis]?.ambientesDisponiveis || [];
    if (!ambientesDisponiveis.includes(ambienteAtual)) {
        console.log(`[SISTEMA] Sistema "${SISTEMAS_DISPONÍVEIS[sis]?.nome}" não suporta ambiente "${ambienteAtual}". Alterando para HML.`);
        ambienteAtual = 'HML';
    }

    console.log(`[SISTEMA] Sistema alterado para: ${SISTEMAS_DISPONÍVEIS[sis]?.nome}`);
    console.log(`[AMBIENTE] Ambiente: ${ambienteAtual}`);
    console.log(`[AMBIENTE] MNI 2.2 Endpoint: ${getEndpoints2_2().endpoint}`);
    console.log(`[AMBIENTE] MNI 3.0 Endpoint: ${getEndpoints3_0().endpoint}`);

    return {
        sucesso: true,
        ambiente: ambienteAtual,
        sistema: getInfoSistemaAtual(),
        endpoints: {
            mni2_2: getEndpoints2_2(),
            mni3_0: getEndpoints3_0()
        }
    };
}

/**
 * Obter todos os endpoints ativos
 */
function getEndpointsAtivos() {
    return {
        ambiente: getAmbienteAtual(),
        sistema: getInfoSistemaAtual(),
        mni2_2: getEndpoints2_2(),
        mni3_0: getEndpoints3_0()
    };
}

/**
 * Validar se o sistema suporta MNI 2.2
 * Retorna true se suporta, false caso contrário
 */
function suportaMNI2_2() {
    const sistema = sistemaAtual.toUpperCase();

    // Execução Fiscal não suporta MNI 2.2, apenas MNI 3.0
    if (sistema === '1G_EXEC_FISCAL') {
        return false;
    }

    return true;
}

/**
 * Validar se o sistema suporta MNI 3.0
 * Retorna true se suporta, false caso contrário
 */
function suportaMNI3_0() {
    // Todos os sistemas suportam MNI 3.0 por enquanto
    return true;
}

/**
 * Middleware Express para bloquear MNI 2.2 em Execução Fiscal
 */
function middlewareMNI2_2Validation(req, res, next) {
    if (!suportaMNI2_2()) {
        return res.status(403).json({
            success: false,
            message: `O sistema "${getInfoSistemaAtual().nome}" não suporta MNI 2.2. Use apenas endpoints MNI 3.0.`,
            sistema: getInfoSistemaAtual(),
            endpoints_disponíveis: {
                mni3_0: getEndpoints3_0()
            }
        });
    }
    next();
}

module.exports = {
    getEndpoints2_2,
    getEndpoints3_0,
    getAmbienteAtual,
    getSistemaAtual,
    getInfoSistemaAtual,
    setAmbiente,
    setSistema,
    getEndpointsAtivos,
    suportaMNI2_2,
    suportaMNI3_0,
    middlewareMNI2_2Validation,
    SISTEMAS_DISPONÍVEIS
};
