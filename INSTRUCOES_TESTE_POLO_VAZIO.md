# 🧪 Instruções para Testar: Correção do Erro "Polo Vazio"

## 📅 Data: 03/11/2025

---

## 📋 O Que Foi Feito

### ✅ Correções Implementadas

1. **Validação no Frontend** (`frontend/js/peticionamento-inicial.js`)
   - Valida nome, CPF/CNPJ antes de enviar
   - Mostra mensagens de erro claras e específicas
   - Evita envio de dados incompletos

2. **Validação no Backend** (`backend/services/mni3Client.js`)
   - Valida estrutura dos dados recebidos
   - Garante CPF tem 11 dígitos e CNPJ tem 14 dígitos
   - Logs detalhados para debugging

3. **Logs de Debug** (`backend/services/mni3Client.js`)
   - Mostra exatamente quais dados estão chegando
   - Indica quantas partes estão sendo processadas
   - Alerta se polos estão vazios

---

## 🚀 Como Testar (Passo a Passo)

### Passo 1: Reiniciar o Servidor Backend

```bash
# No terminal onde o servidor está rodando:
# Pressionar Ctrl+C para parar

# Iniciar novamente:
node server.js
# OU
npm start
```

**Aguardar mensagem:**
```
✅ Servidor rodando na porta 3000
```

---

### Passo 2: Abrir o Formulário de Peticionamento

1. Abrir navegador
2. Acessar: `http://localhost:3000/peticionamento-inicial.html`
3. Verificar que o formulário carregou corretamente

---

### Passo 3: Fazer Login (Se Necessário)

Se não estiver logado, fazer login primeiro:

1. Acessar: `http://localhost:3000`
2. Fazer login com credenciais
3. Voltar para `http://localhost:3000/peticionamento-inicial.html`

---

### Passo 4: Testar com Botão de Dados de Teste

**Este é o teste mais simples e rápido!**

1. No formulário, clicar no botão **"🚀 Preencher Dados de Teste"**
   - Isso preenche automaticamente:
     - ✅ Polo Ativo: MAYARA MENDES CARDOSO BARBOSA, CPF: 38569492839
     - ✅ Polo Passivo: MAYA SOTERO DICHIRICO PESTILLI, CPF: 54293137858
     - ✅ Signatário: 37450364840

2. Preencher campos obrigatórios restantes:
   - **Localidade:** Selecionar uma comarca (ex: São Paulo)
   - **Classe:** Selecionar uma classe (ex: 1116 - Execução Fiscal)
   - **Assunto:** Selecionar um assunto
   - **Documento PDF:** Anexar qualquer PDF de teste

3. Se for Execução Fiscal (classe 1116):
   - Preencher campos de CDA (já preenchidos automaticamente):
     - Número da CDA
     - Código do Tributo Fiscal
     - Valor da CDA
     - Data de Apuração

4. Clicar em **"📨 Enviar Petição Inicial"**

---

### Passo 5: Verificar os Logs do Servidor

**No terminal do servidor, procurar:**

#### ✅ Cenário de Sucesso - Dados Chegando Corretamente

```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"MAYARA MENDES CARDOSO BARBOSA","cpf":"38569492839","dataNascimento":"17/02/1990","sexo":"Feminino"}]
[MNI 3.0] - poloPassivo: [{"tipoPessoa":"fisica","nome":"MAYA SOTERO DICHIRICO PESTILLI","cpf":"54293137858","dataNascimento":"11/07/2020","sexo":"Feminino"}]
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
[MNI 3.0] ✓ Construindo 1 parte(s) do polo PASSIVO
[MNI 3.0] ✓ XML dos polos gerado com sucesso
```

**→ SE VOCÊ VER ISSO:** Os dados estão chegando corretamente! 🎉

**Se ainda assim der erro do MNI**, o problema está na estrutura do XML ou em algum outro campo (não nos polos).

---

#### ❌ Cenário de Problema - Polos Vazios

```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: []
[MNI 3.0] - poloPassivo: []
[MNI 3.0] ========================================
[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!
[MNI 3.0] ⚠️ ERRO: Polo Passivo vazio ou indefinido!
[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!
```

**→ SE VOCÊ VER ISSO:** O frontend não está enviando os dados!

**Ações:**
1. Verificar se os campos foram realmente preenchidos
2. Abrir DevTools do navegador (F12) → Console
3. Procurar por erros JavaScript
4. Me enviar o log completo

---

#### ⚠️ Cenário de Problema - CPF/Nome Vazio

```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"","cpf":"","dataNascimento":"","sexo":"Masculino"}]
[MNI 3.0] - poloPassivo: [{"tipoPessoa":"fisica","nome":"MAYA...","cpf":"54293137858",...}]
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 0 parte(s) do polo ATIVO  ← ZERO partes!
```

**→ SE VOCÊ VER ISSO:** Os campos não foram preenchidos corretamente!

**Mas agora isso NÃO deve acontecer** porque a validação frontend vai impedir o envio!

---

### Passo 6: Verificar a Resposta no Navegador

#### ✅ Sucesso

```
✅ Petição Inicial Enviada com Sucesso! (MNI 3.0)

Número do Processo: 60003376820258260014
Protocolo: 611762127908521044252503382205
Data: 2025-11-03T00:22:54-03:00
```

**→ SUCESSO TOTAL!** 🎉🎉🎉

---

#### ❌ Erro de Validação (Frontend)

```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: CPF é obrigatório
```

**→ ISSO É BOM!** A validação está funcionando e impedindo envio de dados inválidos.

**Ação:** Preencher o campo CPF e tentar novamente.

---

#### ❌ Erro do MNI (Backend)

```
❌ Erro ao enviar petição: Acesso negado, usuário [ENT.ESTADUAL_SP_PGE]
```

**→ Problema de autenticação** (não relacionado aos polos)

**Ação:** Verificar se está usando as credenciais corretas.

---

```
❌ Erro ao enviar petição: Parâmetro do método [setNumIdPessoaProcessoParte] é um array vazio
```

**→ Este é o erro original!** Se ele ainda aparecer:

**Ação:** Copiar TODO o log do servidor e me enviar para análise.

---

## 📊 Checklist de Verificação

Antes de testar, verificar:

### Frontend
- [ ] Navegador aberto em `http://localhost:3000/peticionamento-inicial.html`
- [ ] Botão "Preencher Dados de Teste" funcionando
- [ ] Campos de Polo Ativo visíveis e preenchíveis
- [ ] Campos de Polo Passivo visíveis e preenchíveis
- [ ] Console do navegador (F12) sem erros JavaScript

### Backend
- [ ] Servidor rodando na porta 3000
- [ ] Console mostrando mensagens de log
- [ ] Sem erros ao iniciar o servidor
- [ ] Arquivo `mni3Client.js` com as correções (validação + logs)

### Dados
- [ ] Login realizado com sucesso
- [ ] Token armazenado no localStorage
- [ ] Dados de teste preenchidos automaticamente
- [ ] Documento PDF anexado

---

## 🎯 O Que Enviar Para Mim

Se o erro persistir, enviar:

### 1. Log Completo do Servidor

Copiar TUDO desde:
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
...
```

Até o final da resposta.

### 2. Log do Console do Navegador

1. Abrir DevTools (F12)
2. Ir na aba "Console"
3. Copiar todas as mensagens (principalmente erros em vermelho)

### 3. Dados Enviados

1. Abrir DevTools (F12)
2. Ir na aba "Network" (Rede)
3. Localizar a requisição para `/api/peticionamento/inicial`
4. Clicar nela
5. Ir em "Payload" ou "Request"
6. Copiar o JSON enviado

---

## 💡 Dicas

### Dica 1: Limpar Cache

Se algo estranho acontecer:
1. Pressionar Ctrl+Shift+Delete (Chrome/Edge) ou Ctrl+Shift+Del (Firefox)
2. Limpar "Cached images and files"
3. Recarregar a página (Ctrl+F5)

### Dica 2: Testar em Modo Anônimo

Abrir uma janela anônima/privada e testar lá. Isso elimina problemas de cache/cookies.

### Dica 3: Verificar Versão do Arquivo

Verificar que as modificações foram salvas:

```bash
# No terminal:
cat backend/services/mni3Client.js | grep "VALIDAÇÃO ADICIONADA"
```

**Deve retornar:**
```
// ✅ VALIDAÇÃO ADICIONADA
// ✅ VALIDAÇÃO ADICIONADA: Validar CPF/CNPJ
// ✅ VALIDAÇÃO ADICIONADA: Validar nome
```

---

## 🔍 Análise de Cenários

### Cenário 1: Validação Frontend Funcionou

**Log do navegador:**
```
❌ Erro: Polo Ativo (Autor), Parte 1: CPF é obrigatório
```

**Interpretação:** ✅ Validação está funcionando! Preencher o campo e tentar novamente.

---

### Cenário 2: Dados Chegando no Backend

**Log do servidor:**
```
[MNI 3.0] - poloAtivo: [{"nome":"MAYARA...","cpf":"38569492839",...}]
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
```

**Interpretação:** ✅ Dados chegaram! Se der erro do MNI, problema está em outro lugar (não nos polos).

---

### Cenário 3: Arrays Vazios no Backend

**Log do servidor:**
```
[MNI 3.0] - poloAtivo: []
[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!
```

**Interpretação:** ❌ Frontend não enviou dados. Verificar:
1. Se o formulário está correto
2. Se há erros JavaScript
3. Se a função `extrairPartes()` está correta

---

### Cenário 4: CPF/CNPJ Vazio

**Log do servidor:**
```
[MNI 3.0] ❌ CPF inválido para parte: {...}
CPF inválido ou vazio para a parte "MAYARA..." (esperado: 11 dígitos, recebido: 0)
```

**Interpretação:** ❌ Campo CPF não foi preenchido. Mas isso NÃO deve acontecer se a validação frontend estiver funcionando.

---

## ✅ Resultado Esperado Final

```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"MAYARA MENDES CARDOSO BARBOSA","cpf":"38569492839",...}]
[MNI 3.0] - poloPassivo: [{"tipoPessoa":"fisica","nome":"MAYA SOTERO DICHIRICO PESTILLI","cpf":"54293137858",...}]
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
[MNI 3.0] ✓ Construindo 1 parte(s) do polo PASSIVO
[MNI 3.0] ✓ XML dos polos gerado com sucesso
[MNI 3.0] Endpoint: https://execucao-fiscal-1g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=intercomunicacao3.0
[MNI 3.0] ========================================
[MNI 3.0] PETICIONAMENTO REALIZADO COM SUCESSO!
[MNI 3.0] Número do Processo: 60003376820258260014
[MNI 3.0] Número do Protocolo: 611762127908521044252503382205
[MNI 3.0] Data da Operação: 2025-11-03T00:22:54-03:00
[MNI 3.0] ========================================
```

---

**Boa sorte com os testes!** 🚀

Se tiver qualquer dúvida ou o erro persistir, me envie os logs completos para análise.

---

**Data:** 03/11/2025
**Status:** ✅ Pronto para Testes
