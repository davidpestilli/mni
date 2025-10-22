require('dotenv').config();
const ambienteManager = require('./ambiente');

// Obter endpoints baseado no ambiente ativo
const endpoints2_2 = ambienteManager.getEndpoints2_2();

module.exports = {
    endpoint: endpoints2_2.endpoint,
    wsdlUrl: endpoints2_2.wsdlUrl,
    ambiente: endpoints2_2.ambiente,
    versao: endpoints2_2.versao,
    namespaces: {
        service: process.env.MNI_NAMESPACE_SERVICE,
        types: process.env.MNI_NAMESPACE_TYPES
    },
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 60000,
    debugMode: process.env.DEBUG_MODE === 'true'
};
