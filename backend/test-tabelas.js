// Script para testar consulta de tabelas
const tabelaClient = require('./services/tabelaClient');

async function testarTabelas() {
    try {
        console.log('=================================');
        console.log('Testando Consulta de Tabelas MNI');
        console.log('=================================\n');

        // 1. Listar tabelas disponíveis
        console.log('1. Listando tabelas disponíveis...');
        const tabelas = await tabelaClient.listarTabelas();
        console.log('Tabelas encontradas:', tabelas);
        console.log('');

        // 2. Consultar tabelas importantes para peticionamento inicial
        const tabelasImportantes = [
            'ClasseProcessual',
            'AssuntoProcessual',
            'LocalidadeJudicial',
            'TipoDocumento',
            'OrgaoJulgador',
            'Competencia'
        ];

        for (const nomeTabela of tabelasImportantes) {
            try {
                console.log(`\n2. Consultando tabela: ${nomeTabela}...`);
                const dados = await tabelaClient.consultarTabela(nomeTabela);

                if (Array.isArray(dados)) {
                    console.log(`   ✓ Total de registros: ${dados.length}`);
                    if (dados.length > 0) {
                        console.log(`   ✓ Exemplo (primeiro registro):`);
                        console.log('   ', JSON.stringify(dados[0], null, 2));
                    }
                } else {
                    console.log('   ! Resposta não é array:', typeof dados);
                }
            } catch (error) {
                console.log(`   ✗ Erro ao consultar ${nomeTabela}:`, error.message);
            }
        }

        console.log('\n=================================');
        console.log('Teste concluído!');
        console.log('=================================');

    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

// Executar teste
testarTabelas()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
