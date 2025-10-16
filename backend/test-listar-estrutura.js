// Script para listar TODAS as tabelas disponíveis
const tabelaClient = require('./services/tabelaClient');

async function listarEstrutura() {
    try {
        console.log('======================================');
        console.log('Listando TODAS as tabelas disponíveis');
        console.log('======================================\n');

        await tabelaClient.initialize();

        // Tentar método listarEstrutura
        if (typeof tabelaClient.client.listarEstruturaAsync === 'function') {
            console.log('Usando listarEstruturaAsync...\n');
            const [result] = await tabelaClient.client.listarEstruturaAsync({});

            console.log('Resultado completo:');
            console.log(JSON.stringify(result, null, 2));
        } else if (typeof tabelaClient.client.listarEstrutura === 'function') {
            console.log('Usando listarEstrutura...\n');
            const result = await new Promise((resolve, reject) => {
                tabelaClient.client.listarEstrutura({}, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });

            console.log('Resultado completo:');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('Método listarEstrutura não disponível');
        }

        // Tentar listarTabelas também
        console.log('\n\n======================================');
        console.log('Tentando listarTabelasAsync...');
        console.log('======================================\n');

        if (typeof tabelaClient.client.listarTabelasAsync === 'function') {
            try {
                const [result] = await tabelaClient.client.listarTabelasAsync({});
                console.log('Resultado listarTabelas:');
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.log('Erro ao listar tabelas:', error.message);
            }
        }

    } catch (error) {
        console.error('Erro:', error.message);
        console.error('Stack:', error.stack);
    }
}

listarEstrutura()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
