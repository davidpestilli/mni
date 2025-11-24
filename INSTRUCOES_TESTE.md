# Instruções para Testar as Implementações

## ✅ Servidor Reiniciado
O servidor backend foi reiniciado e está rodando em: **http://localhost:3000**

## 🔧 Alterações Implementadas

### 1. **Competência com Descrição**
- **Backend**: Endpoint criado em `backend/routes/mni3.js:668-700`
- **Frontend (utils)**: Função `buscarDescricaoCompetencia` criada em `frontend/js/utils.js:272-298`
- **Frontend (display)**: Campo adicionado em `frontend/js/processos.js:261-263` e `357-364`

### 2. **Parser de Data Corrigido**
- **Arquivo**: `frontend/js/processos.js:832-871`
- **Correção**: Parse manual de data ISO 8601 para evitar problemas com timezone

## 🚀 Como Testar

### Passo 1: Limpar Cache do Navegador
**MUITO IMPORTANTE!** O navegador pode estar usando versões antigas dos arquivos JavaScript.

**Opção A - Limpar cache completo (Chrome/Edge):**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Imagens e arquivos em cache"
3. Clique em "Limpar dados"

**Opção B - Forçar reload sem cache:**
1. Abra a página: http://localhost:3000
2. Pressione `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
3. Isso força o navegador a recarregar TODOS os arquivos

**Opção C - Usar modo anônimo/privado:**
1. Abra uma janela anônima (`Ctrl + Shift + N` no Chrome/Edge)
2. Acesse: http://localhost:3000
3. Isso garante que não há cache

### Passo 2: Abrir Console do Navegador
1. Pressione `F12` para abrir as Ferramentas do Desenvolvedor
2. Vá para a aba "Console"
3. Procure por erros em vermelho

### Passo 3: Testar a Página de Teste
1. Acesse: **http://localhost:3000/teste-data-competencia.html**
2. Clique nos botões de teste
3. Verifique se todos os testes passam (✅)

### Passo 4: Testar Consulta de Processo Real
1. Faça login no sistema
2. Vá para a página de Consulta de Processos
3. Consulte um processo (use o número que você tinha antes)
4. Verifique:
   - ✅ A data de ajuizamento deve aparecer como "23/11/2025" (formato DD/MM/YYYY)
   - ✅ Deve aparecer um campo "Competência" junto com Classe, Rito, etc.

## 🔍 Verificar se Alterações Foram Carregadas

No Console do Navegador (F12), execute:

```javascript
// Verificar se a função existe
console.log(typeof buscarDescricaoCompetencia);
// Deve retornar: "function"

// Testar o parser de data
console.log(formatarDataMNI('2025-11-23T08:11:02-03:00'));
// Deve retornar: "23/11/2025"
```

## ❌ Se Ainda Não Funcionar

### Debug 1: Verificar Rede
1. Abra F12 → Aba "Network" (Rede)
2. Filtre por "JS"
3. Recarregue a página com `Ctrl + Shift + R`
4. Verifique se `processos.js` e `utils.js` aparecem na lista
5. Clique neles e veja o conteúdo - procure por "buscarDescricaoCompetencia"

### Debug 2: Verificar Erros no Console
- Se aparecer erro tipo "buscarDescricaoCompetencia is not defined", significa que o utils.js não foi carregado
- Se aparecer erro de sintaxe, pode haver um problema no código

### Debug 3: Versão do Arquivo
No Console, execute:
```javascript
// Ver código da função
console.log(formatarDataMNI.toString());
```

Isso mostra o código da função. Procure pela linha:
```javascript
const [ano, mes, dia] = datePart.split('-');
```

Se essa linha ESTIVER presente = código novo carregado ✅
Se NÃO estiver presente = código antigo em cache ❌

## 📝 Resumo das Mudanças nos Arquivos

### `backend/routes/mni3.js` (linha 663-700)
```javascript
router.get('/descricao-competencia/:codigoLocalidade/:codigo', async (req, res) => {
```

### `frontend/js/utils.js` (linha 200 e 272-298)
```javascript
competencias: new Map(),  // Adicionado ao cache
async function buscarDescricaoCompetencia(codigo, codigoLocalidade) {
```

### `frontend/js/processos.js` (linha 261-263)
```javascript
const codigoCompetencia = dadosBasicosRaiz.competencia || attributes.competencia || '';
const codigoLocalidade = dadosBasicosRaiz.codigoLocalidade || attributes.codigoLocalidade || '0000';
const competencia = codigoCompetencia ? await buscarDescricaoCompetencia(codigoCompetencia, codigoLocalidade) : 'N/A';
```

### `frontend/js/processos.js` (linha 361-364)
```html
<div>
    <div style="opacity: 0.9; font-size: 12px;">Competência</div>
    <div style="font-weight: 600; font-size: 16px;">${competencia}</div>
</div>
```

### `frontend/js/processos.js` (linha 832-871 - função formatarDataMNI)
Parse manual de data ISO 8601

## 🎯 Resultado Esperado

Ao consultar um processo, você deve ver:

```
📋 Processo: 00000-00.0000.0.00.0000

┌─────────────────────┬─────────────────────┬─────────────┬───────────────┬──────────────────┐
│ Classe Processual   │ Competência         │ Rito        │ Valor da      │ Data Ajuizamento │
│                     │                     │             │ Causa         │                  │
│ Procedimento Comum  │ Cível               │ Ordinário   │ R$ 5.000,00   │ 23/11/2025       │
└─────────────────────┴─────────────────────┴─────────────┴───────────────┴──────────────────┘
```

A data deve estar no formato **DD/MM/YYYY** e a competência deve mostrar a **descrição** (não o código).
