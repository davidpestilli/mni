const crypto = require('crypto');

/**
 * Gerar hash SHA256 da senha com data no formato MNI
 * Formato: DD-MM-YYYYSenha
 * Exemplo: 13-10-2025Senha@123456
 */
function gerarSenhaHashMNI(senha) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    // Formato: DD-MM-YYYYSenha
    const senhaComData = `${dia}-${mes}-${ano}${senha}`;

    // Gerar hash SHA256
    const hash = crypto.createHash('sha256')
        .update(senhaComData, 'utf8')
        .digest('hex');

    return hash;
}

/**
 * Gerar hash SHA256 de uma string qualquer
 */
function gerarHash256(texto) {
    return crypto.createHash('sha256')
        .update(texto, 'utf8')
        .digest('hex');
}

module.exports = {
    gerarSenhaHashMNI,
    gerarHash256
};
