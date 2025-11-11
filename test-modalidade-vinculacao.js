#!/usr/bin/env node

const TabelaClient = require('./backend/services/tabelaClient');

async function testarModalidadeVinculacao() {
    console.log('='.repeat(70));
    console.log('Teste de Consulta da Tabela ModalidadeVinculacaoProcesso');
    console.log('='.repeat(70));

    const tabelasParaTentar = [
        'ModalidadeVinculacaoProcesso',
        'ModalidadeVinculacao',
        'VinculacaoProcesso',
        'Vinculacao',
        'TipoVinculacao',
        'ModalidadeVinc'
    ];

    for (const tabela of tabelasParaTentar) {
        try {
            console.log(`\n${'─'.repeat(70)}`);
            console.log(`Tentando consultar tabela: ${tabela}`);
            console.log('─'.repeat(70));

            const resultado = await TabelaClient.consultarTabela(tabela);

            if (Array.isArray(resultado) && resultado.length > 0) {
                console.log(`✓ SUCESSO! Encontrado ${resultado.length} registros\n`);
                console.log('Primeiros 10 registros:');
                resultado.slice(0, 10).forEach((item, idx) => {
                    console.log(`\n${idx + 1}. Código: ${item.codigo || item.CodModalidade || 'N/A'}`);
                    console.log(`   Descrição: ${item.descricao || item.DesTipoParte || item.nome || 'N/A'}`);
                    console.log(`   Sigla: ${item.SigParte || item.sigla || 'N/A'}`);
                    console.log(`   Completo: ${JSON.stringify(item).substring(0, 150)}...`);
                });
                return;
            } else if (resultado && typeof resultado === 'object') {
                console.log(`⚠ Resultado não vazio, estrutura diferente:`);
                console.log(JSON.stringify(resultado, null, 2).substring(0, 500));
            } else {
                console.log(`✗ Nenhum resultado ou formato inesperado`);
            }
        } catch (error) {
            console.log(`✗ Erro: ${error.message}`);
        }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('Teste concluído. Nenhuma das tabelas foi encontrada.');
    console.log('='.repeat(70));
}

testarModalidadeVinculacao();
