// Script para testar consulta de tabelas com NOMES CORRETOS
const tabelaClient = require('./services/tabelaClient');

async function testarTabelasCorretas() {
    try {
        console.log('=========================================');
        console.log('Testando Tabelas com NOMES CORRETOS');
        console.log('=========================================\n');

        // Tabelas principais para peticionamento
        const tabelasParaTestar = [
            'ClasseJudicial',        // CORRIGIDO (antes: ClasseProcessual)
            'AssuntoJudicial',       // CORRIGIDO (antes: AssuntoProcessual)
            'CompetenciaJudicial',   // CORRIGIDO (antes: Competencia)
            'Orgao',                 // CORRIGIDO (antes: OrgaoJulgador)
            'LocalidadeJudicial',    // JÁ ESTAVA CORRETO
            'TipoDocumento',         // JÁ ESTAVA CORRETO
            'TipoPeticaoJudicial',   // NOVA
            'TipoParte'              // NOVA
        ];

        for (const nomeTabela of tabelasParaTestar) {
            try {
                console.log(`\n📋 Consultando: ${nomeTabela}...`);
                const dados = await tabelaClient.consultarTabela(nomeTabela);

                if (Array.isArray(dados)) {
                    console.log(`   ✅ SUCESSO!`);
                    console.log(`   📊 Total de registros: ${dados.length}`);

                    if (dados.length > 0) {
                        console.log(`   📄 Primeiro registro:`);
                        console.log('   ', JSON.stringify(dados[0], null, 2).substring(0, 200) + '...');
                    }
                } else {
                    console.log('   ⚠️  Resposta não é array:', typeof dados);
                }
            } catch (error) {
                console.log(`   ❌ ERRO:`, error.message);
            }
        }

        console.log('\n=========================================');
        console.log('Teste concluído!');
        console.log('=========================================');

    } catch (error) {
        console.error('Erro no teste:', error);
    }
}

testarTabelasCorretas()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
