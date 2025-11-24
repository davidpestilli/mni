/**
 * Script de Verificação de Implementação
 * Execute este script no Console do Navegador (F12) para verificar se tudo está funcionando
 */

console.log('%c=== VERIFICAÇÃO DE IMPLEMENTAÇÃO ===', 'background: #667eea; color: white; padding: 10px; font-size: 16px; font-weight: bold');

// Teste 1: Função buscarDescricaoCompetencia
console.log('\n%c[TESTE 1] Verificando função buscarDescricaoCompetencia...', 'color: #2196F3; font-weight: bold');
if (typeof buscarDescricaoCompetencia === 'function') {
    console.log('%c✅ PASSOU - Função existe e está disponível', 'color: green');
} else {
    console.log('%c❌ FALHOU - Função não encontrada! Cache do navegador pode estar ativo.', 'color: red');
    console.log('%c   Solução: Pressione Ctrl+Shift+R para recarregar sem cache', 'color: orange');
}

// Teste 2: Parser de Data
console.log('\n%c[TESTE 2] Verificando parser de data...', 'color: #2196F3; font-weight: bold');
if (typeof formatarDataMNI === 'function') {
    const testeCases = [
        { input: '2025-11-23T08:11:02-03:00', expected: '23/11/2025' },
        { input: '2025-11-23', expected: '23/11/2025' },
        { input: '20251123', expected: '23/11/2025' }
    ];

    let todosCorretos = true;
    testeCases.forEach((teste, i) => {
        const resultado = formatarDataMNI(teste.input);
        const passou = resultado === teste.expected;
        todosCorretos = todosCorretos && passou;

        if (passou) {
            console.log(`%c   ✅ Teste ${i+1} PASSOU: ${teste.input} → ${resultado}`, 'color: green');
        } else {
            console.log(`%c   ❌ Teste ${i+1} FALHOU: ${teste.input} → ${resultado} (esperado: ${teste.expected})`, 'color: red');
        }
    });

    if (todosCorretos) {
        console.log('%c✅ PASSOU - Parser de data funcionando corretamente', 'color: green');
    } else {
        console.log('%c❌ FALHOU - Parser de data com problemas', 'color: red');
    }

    // Verificar se é a versão nova do código
    const codigoFuncao = formatarDataMNI.toString();
    if (codigoFuncao.includes('datePart.split')) {
        console.log('%c   ✅ Código NOVO detectado (parse manual de data)', 'color: green');
    } else {
        console.log('%c   ❌ Código ANTIGO detectado (usando new Date())', 'color: red');
        console.log('%c   Solução: Limpe o cache do navegador completamente', 'color: orange');
    }
} else {
    console.log('%c❌ FALHOU - Função formatarDataMNI não encontrada', 'color: red');
}

// Teste 3: Cache de Competências
console.log('\n%c[TESTE 3] Verificando cache de competências...', 'color: #2196F3; font-weight: bold');
if (typeof mapeamentoCache !== 'undefined') {
    if (mapeamentoCache.hasOwnProperty('competencias')) {
        console.log('%c✅ PASSOU - Cache de competências existe', 'color: green');
    } else {
        console.log('%c❌ FALHOU - Cache de competências não encontrado', 'color: red');
    }
} else {
    console.log('%c⚠️  AVISO - mapeamentoCache não está no escopo global', 'color: orange');
}

// Resumo
console.log('\n%c=== RESUMO ===', 'background: #667eea; color: white; padding: 10px; font-size: 14px; font-weight: bold');
console.log('%cSe algum teste FALHOU, siga estas etapas:', 'font-weight: bold');
console.log('%c1. Pressione Ctrl+Shift+Delete', 'color: #666');
console.log('%c2. Limpe "Imagens e arquivos em cache"', 'color: #666');
console.log('%c3. Recarregue a página com Ctrl+Shift+R', 'color: #666');
console.log('%c4. Execute este script novamente', 'color: #666');
console.log('\n%cOu use uma janela anônima: Ctrl+Shift+N', 'color: #2196F3');

console.log('\n%c📝 Para ver este script novamente, cole este código no console:', 'color: #999');
console.log('fetch("/verificar-implementacao.js").then(r=>r.text()).then(eval)');
