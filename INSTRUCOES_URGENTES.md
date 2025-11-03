# 🚨 INSTRUÇÕES URGENTES - Restart Completo

## Passo 1: Matar o Servidor Atual

### Opção A: Pelo terminal onde está rodando
1. **Focar na janela do terminal** onde o servidor Node.js está rodando
2. Pressionar **Ctrl+C** (segure Ctrl e aperte C)
3. Aguardar o servidor parar completamente

### Opção B: Pelo Gerenciador de Tarefas (se Ctrl+C não funcionar)
1. Abrir **Gerenciador de Tarefas** (Ctrl+Shift+Esc)
2. Ir na aba **"Detalhes"**
3. Procurar por processos chamados **"node.exe"**
4. Clicar com botão direito → **"Finalizar tarefa"** em TODOS os node.exe
5. Confirmar

---

## Passo 2: Usar o Script de Restart Automático

1. Abrir **Windows Explorer**
2. Navegar até a pasta do projeto: `C:\Users\david\mni`
3. **Dar duplo clique** no arquivo: **`RESTART_COMPLETO.bat`**

O script vai:
- Matar todos os processos na porta 3000
- Aguardar 2 segundos
- Verificar se a porta foi liberada
- Iniciar o servidor automaticamente

---

## Passo 3: Verificar o Banner de Versão

**MUITO IMPORTANTE:** No console do servidor, você DEVE ver este banner:

```
██████████████████████████████████████████████████████████████
██                                                          ██
██  🔄 MNI 3.0 - CÓDIGO ATUALIZADO - VERSÃO 03/11/2025     ██
██                                                          ██
██████████████████████████████████████████████████████████████
```

### ❌ Se o banner NÃO aparecer quando você tentar fazer peticionamento:
**O servidor NÃO está usando o código atualizado!**

### ✅ Se o banner aparecer:
**O servidor está usando o código correto!**

---

## Passo 4: Testar Novamente

1. Abrir navegador em **modo anônimo** (Ctrl+Shift+N no Chrome/Edge)
2. Acessar: `http://localhost:3000`
3. Fazer login
4. Ir para peticionamento inicial
5. Clicar em **"🚀 Preencher Dados de Teste"**
6. Selecionar localidade, classe
7. Anexar qualquer PDF
8. Clicar em "Enviar Petição Inicial"

---

## Passo 5: Copiar e Me Enviar

**DEPOIS de fazer o teste, copiar do console do servidor:**

1. **O banner de versão** (se apareceu ou não)
2. **Os logs desde:**
```
[MNI 3.0] ========================================
[MNI 3.0] PETICIONAMENTO INICIAL
```

3. **Até o final** (incluindo o erro se houver)

**IMPORTANTE:** Dessa vez os logs vão incluir:
```
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [...]
[MNI 3.0] - poloPassivo: [...]
```

---

## ⚠️ Se o Banner NÃO Aparecer

Significa que o Node.js está usando código em cache. Nesse caso:

1. Parar o servidor (Ctrl+C)
2. Executar no terminal:
```bash
node --version
```

3. Executar:
```bash
node --no-warnings server.js
```

---

## 📤 O Que Me Enviar

Depois de seguir TODOS os passos acima, me enviar:

1. ✅ ou ❌ se o banner apareceu
2. Os logs completos do console
3. A mensagem de erro do navegador (se houver)

---

**Vamos resolver isso agora!** 🚀
