/**
 * Gerenciador de Ambiente (HML/PROD)
 * Retorna os endpoints corretos baseado no ambiente ativo
 */

require('dotenv').config();

// Estado global do ambiente (pode ser mudado via API)
let ambienteAtual = process.env.AMBIENTE_ATIVO || 'HML';

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
 * Obter endpoints do MNI 3.0 baseado no ambiente atual
 */
function getEndpoints3_0() {
    const ambiente = ambienteAtual.toUpperCase();

    if (ambiente === 'PROD') {
        return {
            endpoint: process.env.MNI_3_0_PROD_ENDPOINT,
            wsdlUrl: process.env.MNI_3_0_PROD_WSDL_URL,
            ambiente: 'PRODUÇÃO',
            versao: '3.0'
        };
    } else {
        return {
            endpoint: process.env.MNI_3_0_HML_ENDPOINT,
            wsdlUrl: process.env.MNI_3_0_HML_WSDL_URL,
            ambiente: 'HOMOLOGAÇÃO',
            versao: '3.0'
        };
    }
}

/**
 * Obter ambiente atual
 */
function getAmbienteAtual() {
    return ambienteAtual.toUpperCase();
}

/**
 * Mudar ambiente (HML ou PROD)
 */
function setAmbiente(novoAmbiente) {
    const env = novoAmbiente.toUpperCase();

    if (env !== 'HML' && env !== 'PROD') {
        throw new Error('Ambiente inválido. Use "HML" ou "PROD"');
    }

    ambienteAtual = env;

    console.log(`[AMBIENTE] Ambiente alterado para: ${ambienteAtual}`);
    console.log(`[AMBIENTE] MNI 2.2 Endpoint: ${getEndpoints2_2().endpoint}`);
    console.log(`[AMBIENTE] MNI 3.0 Endpoint: ${getEndpoints3_0().endpoint}`);

    return {
        sucesso: true,
        ambiente: ambienteAtual,
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
        mni2_2: getEndpoints2_2(),
        mni3_0: getEndpoints3_0()
    };
}

module.exports = {
    getEndpoints2_2,
    getEndpoints3_0,
    getAmbienteAtual,
    setAmbiente,
    getEndpointsAtivos
};
