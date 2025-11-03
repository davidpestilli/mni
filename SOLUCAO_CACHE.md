# 🔧 Solução: Cache Não Atualizado

## 🔴 Problema
As mudanças estão nos arquivos, mas não estão sendo aplicadas quando você testa.

---

## ✅ Solução Passo a Passo

### Passo 1: Hard Refresh no Navegador (IMPORTANTE!)

**Windows:**
```
Ctrl + Shift + R
ou
Ctrl + F5
```

**O que isso faz:** Ignora o cache do navegador e recarrega todos os arquivos JavaScript do servidor.

---

### Passo 2: Limpar Cache Completamente

**No navegador:**
1. Pressionar **F12** (abrir DevTools)
2. Clicar com **botão direito** no botão de recarregar (🔄) da barra de endereço
3. Selecionar **"Limpar cache e fazer hard refresh"** ou **"Empty Cache and Hard Reload"**

---

### Passo 3: Verificar se o Arquivo JavaScript Está Atualizado

**No navegador (DevTools aberto):**
1. Ir na aba **"Sources"** (Fontes)
2. No painel esquerdo, expandir: **localhost:3000 → js**
3. Clicar em **peticionamento-inicial.js**
4. Procurar pela linha 705-714 (usar Ctrl+G para ir para linha)
5. **Verificar se tem este código:**

```javascript
// ✅ VALIDAÇÃO ADICIONADA
if (!nome) {
    throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: Nome é obrigatório`);
}
if (!cpf) {
    throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CPF é obrigatório`);
}
```

**Se NÃO tiver esse código:** O navegador ainda está usando cache antigo!

---

### Passo 4: Teste de Validação Frontend

1. Abrir **http://localhost:3000/peticionamento-inicial.html**
2. **NÃO preencher nenhum campo** (deixar tudo vazio)
3. Selecionar apenas:
   - Localidade (qualquer uma)
   - Classe (qualquer uma)
   - Anexar um PDF qualquer
4. Clicar em **"Enviar Petição Inicial"**

**Resultado esperado COM validação:**
```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: Nome é obrigatório
```

**Resultado SEM validação (cache antigo):**
```
❌ Erro ao enviar petição: É necessário informar ao menos uma parte no polo ativo
```
(Ou o erro vai até o MNI: "array vazio")

---

### Passo 5: Se Ainda Não Funcionar - Modo Anônimo

1. Fechar todos os navegadores
2. Abrir em **Modo Anônimo/Privado:**
   - Chrome/Edge: **Ctrl + Shift + N**
   - Firefox: **Ctrl + Shift + P**
3. Acessar **http://localhost:3000/peticionamento-inicial.html**
4. Fazer login
5. Testar novamente

**O modo anônimo NÃO usa cache**, então se funcionar aqui, o problema é definitivamente cache.

---

### Passo 6: Verificar Logs do Servidor

**MUITO IMPORTANTE:** Me enviar os logs do servidor quando você tenta fazer o peticionamento.

**Procurar por:**

✅ **Se a validação backend está funcionando:**
```
[MNI 3.0] ❌ CPF inválido para parte: {...}
CPF inválido ou vazio para a parte "..."
```

✅ **Se os logs de debug estão aparecendo:**
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [...]
[MNI 3.0] - poloPassivo: [...]
[MNI 3.0] ========================================
```

---

## 🧪 Teste Definitivo

Execute este teste exato e me diga o resultado:

### Teste A: Campo Vazio (Deve Bloquear no Frontend)

1. **Hard refresh:** Ctrl + Shift + R
2. Abrir formulário
3. Clicar em **"🚀 Preencher Dados de Teste"** (preenche tudo automaticamente)
4. **APAGAR manualmente** o CPF do Polo Ativo (deixar campo vazio)
5. Selecionar localidade, classe, anexar PDF
6. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
❌ Erro: Polo Ativo (Autor), Parte 1: CPF é obrigatório
```

**Se der erro diferente, copiar EXATAMENTE a mensagem de erro**

---

### Teste B: Todos os Campos Preenchidos

1. **Hard refresh:** Ctrl + Shift + R
2. Abrir formulário
3. Clicar em **"🚀 Preencher Dados de Teste"**
4. Selecionar localidade, classe, anexar PDF
5. **NÃO apagar nada**
6. Clicar em "Enviar Petição Inicial"

**Copiar:**
- Mensagem de erro ou sucesso do navegador
- **TODO o log do console do servidor** (desde que aparece `[MNI 3.0] DEBUG - Dados dos Polos:`)

---

## 📋 Checklist

Antes de testar, confirmar:

- [ ] Servidor foi reiniciado (parar com Ctrl+C, iniciar de novo)
- [ ] Navegador foi fechado e aberto de novo
- [ ] Hard refresh (Ctrl+Shift+R) foi feito
- [ ] Console do navegador (F12) está aberto para ver erros
- [ ] Estou usando http://localhost:3000 (não outro domínio/IP)

---

## 🔍 Comandos para Verificar Arquivos

Execute no terminal do Windows (no diretório do projeto):

```bash
# Ver data de modificação dos arquivos
dir frontend\js\peticionamento-inicial.js

# Ver se as mudanças estão mesmo no arquivo
findstr /C:"VALIDAÇÃO ADICIONADA" frontend\js\peticionamento-inicial.js
findstr /C:"VALIDAÇÃO ADICIONADA" backend\services\mni3Client.js
```

**Resultado esperado:**
```
frontend\js\peticionamento-inicial.js:            // ✅ VALIDAÇÃO ADICIONADA
frontend\js\peticionamento-inicial.js:            // ✅ VALIDAÇÃO ADICIONADA

backend\services\mni3Client.js:        // ✅ VALIDAÇÃO ADICIONADA
```

**Se NÃO aparecer nada:** Os arquivos não foram salvos corretamente!

---

## 💡 Última Solução: Forçar Atualização

Se nada funcionar, fazer:

```bash
# Parar o servidor (Ctrl+C)

# Limpar cache do Node.js (se existir)
rd /s /q node_modules\.cache

# Reiniciar o servidor
node server.js
```

---

## 📤 O Que Me Enviar

Por favor, me envie:

1. **Screenshot ou texto** do console do navegador (F12 → Console) quando você tenta enviar
2. **Log completo** do servidor desde o momento que você clica em "Enviar"
3. **Resultado dos comandos de verificação** (findstr)
4. **Qual teste você fez** (Teste A ou Teste B)

---

**Com essas informações, vou conseguir identificar exatamente onde está o problema!**
