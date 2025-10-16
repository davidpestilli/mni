require('dotenv').config();

module.exports = {
    endpoint: process.env.MNI_ENDPOINT,
    wsdlUrl: process.env.MNI_WSDL_URL,
    namespaces: {
        service: process.env.MNI_NAMESPACE_SERVICE,
        types: process.env.MNI_NAMESPACE_TYPES
    },
    timeout: parseInt(process.env.REQUEST_TIMEOUT) || 60000,
    debugMode: process.env.DEBUG_MODE === 'true'
};
