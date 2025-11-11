#!/usr/bin/env node

const TabelaClient = require('./backend/services/tabelaClient');

async function testarTipoParte() {
    console.log('='.repeat(60));
    console.log('Teste de Consulta da Tabela TipoParte');
    console.log('='.repeat(60));

    try {
        console.log('\n1. Consultando tabela TipoParte...\n');
        const resultado = await TabelaClient.consultarTabela('TipoParte');

        console.log('Resultado recebido:');
        console.log(JSON.stringify(resultado, null, 2));

        if (Array.isArray(resultado) && resultado.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('SUCESSO! Dados encontrados:');
            console.log('='.repeat(60));
            console.log(`Total de registros: ${resultado.length}`);
            console.log('\nPrimeiros 5 registros:');
            resultado.slice(0, 5).forEach((item, idx) => {
                console.log(`\n${idx + 1}. ${item.codigo} - ${item.descricao || item.nome || 'SEM DESCRIÇÃO'}`);
                console.log(`   Completo: ${JSON.stringify(item)}`);
            });
        } else {
            console.log('\nNenhum dado encontrado ou formato inesperado');
        }

    } catch (error) {
        console.error('\nERRO ao consultar TipoParte:');
        console.error(error.message);
        console.error('\nStack trace completo:');
        console.error(error);
    }
}

testarTipoParte();
