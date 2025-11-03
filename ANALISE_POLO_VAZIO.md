# 🔍 Análise Completa: Erro "Polo Vazio"

## 📅 Data: 03/11/2025

## 🔴 Erro Reportado

```
❌ Erro ao enviar petição: Parâmetro do método [setNumIdPessoaProcessoParte]
   é um array vazio. [Identificador: -vQiR5oBOzdgV_oGqBYM]
```

---

## 🔬 Análise do Fluxo de Dados

### 1️⃣ Frontend - Coleta de Dados (peticionamento-inicial.js)

**Função `extrairPartes()` - Linhas 691-718:**

```javascript
function extrairPartes(tipoPolo) {
    const container = document.getElementById(tipoPolo === 'ativo' ? 'poloAtivoContainer' : 'poloPassivoContainer');
    const partesItems = container.querySelectorAll('.parte-item');
    const partes = [];

    partesItems.forEach(item => {
        const tipoPessoa = item.querySelector('.tipoPessoa').value;

        if (tipoPessoa === 'fisica') {
            partes.push({
                tipoPessoa: 'fisica',
                nome: item.querySelector('.nomeCompleto').value.trim(),
                cpf: item.querySelector('.cpf').value.trim().replace(/\D/g, ''),
                dataNascimento: item.querySelector('.dataNascimento').value.trim(),
                sexo: item.querySelector('.sexo').value
            });
        } else {
            partes.push({
                tipoPessoa: 'juridica',
                nome: item.querySelector('.razaoSocial').value.trim(),
                razaoSocial: item.querySelector('.razaoSocial').value.trim(),
                cnpj: item.querySelector('.cnpj').value.trim().replace(/\D/g, '')
            });
        }
    });

    return partes;
}
```

**✅ O que o frontend está enviando:**
- Pessoa Física: `{ tipoPessoa, nome, cpf, dataNascimento, sexo }`
- Pessoa Jurídica: `{ tipoPessoa, nome, razaoSocial, cnpj }`

**❌ O que está FALTANDO:**
- **NÃO há campo `endereco`!**

### 2️⃣ Backend - Construção do XML (mni3Client.js)

**Função `construirPoloXML()` - Linhas 2078-2127:**

```javascript
construirPoloXML(tipoPolo, parte) {
    const isFisica = parte.tipoPessoa === 'fisica' || parte.cpf;
    const qualificacao = isFisica ? 'FIS' : 'JUR';
    const documento = isFisica ? parte.cpf.replace(/\D/g, '') : parte.cnpj.replace(/\D/g, '');
    const tipoDoc = isFisica ? 'CPF' : 'CMF';
    const nome = isFisica ? parte.nome : (parte.razaoSocial || parte.nome);

    // ⚠️ PROBLEMA: Se parte.cpf ou parte.cnpj for string vazia, documento será vazio
    // Endereço com fallback (está correto)
    const endereco = parte.endereco || {
        logradouro: 'Rua Desconhecida',
        numero: 'S/N',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01000000',
        codigoIBGE: '3550308'
    };

    return `
        <int:polo polo="${tipoPolo}">
            <int:parte>
                <int:pessoa>
                    <int:dadosBasicos>
                        <int:nome>${nome}</int:nome>
                        <int:qualificacaoPessoa>${qualificacao}</int:qualificacaoPessoa>
                        <int:numeroDocumentoPrincipal>${documento}</int:numeroDocumentoPrincipal>
                    </int:dadosBasicos>
                    <int:documento codigoDocumento="${documento}" emissorDocumento="RFB" tipoDocumento="${tipoDoc}"/>
                    <int:endereco>
                        ...
                    </int:endereco>
                </int:pessoa>
            </int:parte>
        </int:polo>`;
}
```

---

## 🎯 Causas Prováveis do Erro

### Causa #1: CPF/CNPJ Vazio (MAIS PROVÁVEL) ⚠️

Se o usuário não preencher o campo CPF/CNPJ no formulário:

```javascript
// Frontend:
cpf: item.querySelector('.cpf').value.trim().replace(/\D/g, '')
// Se o campo estiver vazio → cpf = ""

// Backend:
const documento = isFisica ? parte.cpf.replace(/\D/g, '') : ...
// "".replace(/\D/g, '') → "" (string vazia)

// XML gerado:
<int:numeroDocumentoPrincipal></int:numeroDocumentoPrincipal>  ← VAZIO!
<int:documento codigoDocumento="" .../>  ← VAZIO!
```

**Resultado:** MNI rejeita porque `numeroDocumentoPrincipal` está vazio → "array vazio"

---

### Causa #2: Nome Vazio

```javascript
// Se o nome também estiver vazio:
<int:nome></int:nome>  ← VAZIO!
```

**Resultado:** MNI rejeita porque não consegue identificar a parte

---

### Causa #3: Campos do Formulário Não Encontrados

Se houver erro no seletor (`.querySelector()`), os campos retornam `null`:

```javascript
item.querySelector('.nomeCompleto')  // → null se elemento não existe
null.value  // → Erro: Cannot read property 'value' of null
```

**Resultado:** Frontend falha ao construir o array, envia array vazio ou incompleto

---

## 🔧 Soluções

### Solução #1: Adicionar Validação no Frontend (RECOMENDADO)

**Arquivo: `frontend/js/peticionamento-inicial.js`**

Modificar a função `extrairPartes()` para validar campos obrigatórios:

```javascript
function extrairPartes(tipoPolo) {
    const container = document.getElementById(tipoPolo === 'ativo' ? 'poloAtivoContainer' : 'poloPassivoContainer');
    const partesItems = container.querySelectorAll('.parte-item');
    const partes = [];

    partesItems.forEach((item, index) => {
        const tipoPessoa = item.querySelector('.tipoPessoa').value;

        if (tipoPessoa === 'fisica') {
            const nome = item.querySelector('.nomeCompleto')?.value.trim() || '';
            const cpf = item.querySelector('.cpf')?.value.trim().replace(/\D/g, '') || '';

            // ✅ VALIDAÇÃO ADICIONADA
            if (!nome) {
                throw new Error(`Polo ${tipoPolo}: Parte ${index + 1} - Nome é obrigatório`);
            }
            if (!cpf || cpf.length !== 11) {
                throw new Error(`Polo ${tipoPolo}: Parte ${index + 1} - CPF inválido (deve ter 11 dígitos)`);
            }

            partes.push({
                tipoPessoa: 'fisica',
                nome: nome,
                cpf: cpf,
                dataNascimento: item.querySelector('.dataNascimento')?.value.trim() || '',
                sexo: item.querySelector('.sexo')?.value || 'Masculino'
            });
        } else {
            const nome = item.querySelector('.razaoSocial')?.value.trim() || '';
            const cnpj = item.querySelector('.cnpj')?.value.trim().replace(/\D/g, '') || '';

            // ✅ VALIDAÇÃO ADICIONADA
            if (!nome) {
                throw new Error(`Polo ${tipoPolo}: Parte ${index + 1} - Razão Social é obrigatória`);
            }
            if (!cnpj || cnpj.length !== 14) {
                throw new Error(`Polo ${tipoPolo}: Parte ${index + 1} - CNPJ inválido (deve ter 14 dígitos)`);
            }

            partes.push({
                tipoPessoa: 'juridica',
                nome: nome,
                razaoSocial: nome,
                cnpj: cnpj
            });
        }
    });

    return partes;
}
```

---

### Solução #2: Adicionar Validação no Backend

**Arquivo: `backend/services/mni3Client.js` - Função `construirPoloXML()`**

Adicionar validação antes de construir o XML:

```javascript
construirPoloXML(tipoPolo, parte) {
    // ✅ VALIDAÇÃO ADICIONADA
    if (!parte || typeof parte !== 'object') {
        console.error('[MNI 3.0] ❌ Parte inválida:', parte);
        throw new Error('Dados da parte inválidos');
    }

    const isFisica = parte.tipoPessoa === 'fisica' || parte.cpf;

    // Validar documento
    let documento;
    if (isFisica) {
        documento = (parte.cpf || '').replace(/\D/g, '');
        if (!documento || documento.length !== 11) {
            console.error('[MNI 3.0] ❌ CPF inválido:', parte);
            throw new Error(`CPF inválido ou vazio para a parte "${parte.nome || 'desconhecida'}"`);
        }
    } else {
        documento = (parte.cnpj || '').replace(/\D/g, '');
        if (!documento || documento.length !== 14) {
            console.error('[MNI 3.0] ❌ CNPJ inválido:', parte);
            throw new Error(`CNPJ inválido ou vazio para a parte "${parte.nome || 'desconhecida'}"`);
        }
    }

    // Validar nome
    const nome = isFisica ? parte.nome : (parte.razaoSocial || parte.nome);
    if (!nome || nome.trim() === '') {
        console.error('[MNI 3.0] ❌ Nome vazio:', parte);
        throw new Error('Nome da parte é obrigatório');
    }

    const qualificacao = isFisica ? 'FIS' : 'JUR';
    const tipoDoc = isFisica ? 'CPF' : 'CMF';

    // ... resto do código continua igual
}
```

---

### Solução #3: Adicionar Campos de Endereço no HTML (FUTURO)

**Arquivo: `frontend/peticionamento-inicial.html`**

Para completar a implementação, adicionar campos de endereço no formulário:

```html
<!-- Adicionar após campos de CPF/CNPJ -->
<fieldset style="border: 1px dashed #ccc; padding: 15px; margin-top: 10px;">
    <legend>📍 Endereço</legend>

    <div class="form-group">
        <label>CEP:</label>
        <input type="text" class="cep" placeholder="01000-000" maxlength="9">
    </div>

    <div class="form-group">
        <label>Logradouro:</label>
        <input type="text" class="logradouro" placeholder="Rua, Avenida, etc.">
    </div>

    <div class="form-grid">
        <div class="form-group">
            <label>Número:</label>
            <input type="text" class="numero" placeholder="123">
        </div>

        <div class="form-group">
            <label>Complemento:</label>
            <input type="text" class="complemento" placeholder="Apto 45">
        </div>
    </div>

    <!-- ... mais campos ... -->
</fieldset>
```

E modificar `extrairPartes()` para incluir endereço:

```javascript
endereco: {
    cep: item.querySelector('.cep')?.value.trim() || '',
    logradouro: item.querySelector('.logradouro')?.value.trim() || '',
    numero: item.querySelector('.numero')?.value.trim() || '',
    complemento: item.querySelector('.complemento')?.value.trim() || '',
    bairro: item.querySelector('.bairro')?.value.trim() || '',
    cidade: item.querySelector('.cidade')?.value.trim() || '',
    uf: item.querySelector('.uf')?.value || '',
    codigoIBGE: item.querySelector('.codigoIBGE')?.value || ''
}
```

**Nota:** Por enquanto, o backend usa endereço padrão se não for fornecido, então esta solução é opcional.

---

## 🧪 Como Testar com os Logs de Debug

### Passo 1: Reiniciar o Servidor

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
```

### Passo 2: Tentar Peticionamento

1. **IMPORTANTE:** Preencher TODOS os campos obrigatórios:
   - ✅ Nome completo (Autor e Réu)
   - ✅ CPF válido de 11 dígitos (Autor e Réu)
   - ✅ Signatário CPF
   - ✅ Documentos PDF

2. Clicar em "Enviar Petição Inicial"

### Passo 3: Analisar os Logs

Procurar no console do servidor:

```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"...","cpf":"..."}]
[MNI 3.0] - poloPassivo: [{"tipoPessoa":"fisica","nome":"...","cpf":"..."}]
[MNI 3.0] ========================================
```

**Verificar:**

✅ **Se os arrays têm dados:**
```
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"MAYARA...","cpf":"38569492839",...}]
```
→ **Dados estão chegando!** Problema pode ser no XML ou validação do MNI

❌ **Se os arrays estão vazios:**
```
[MNI 3.0] - poloAtivo: []
[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!
```
→ **Dados NÃO estão chegando!** Problema no frontend

❌ **Se `cpf` está vazio:**
```
[MNI 3.0] - poloAtivo: [{"nome":"MAYARA","cpf":"","...}]
```
→ **Usuário não preencheu o CPF!** Adicionar validação

❌ **Se `nome` está vazio:**
```
[MNI 3.0] - poloAtivo: [{"nome":"","cpf":"38569492839",...}]
```
→ **Usuário não preencheu o nome!** Adicionar validação

---

## 📋 Checklist de Debugging

Antes de testar, verificar:

- [ ] Formulário tem campos de polo ativo e polo passivo visíveis
- [ ] Campos de nome e CPF/CNPJ estão preenchidos
- [ ] `preencherDadosTeste()` funciona corretamente (botão de teste)
- [ ] Servidor foi reiniciado com os novos logs
- [ ] Console do navegador não mostra erros JavaScript
- [ ] Console do servidor mostra logs de debug
- [ ] Logs mostram arrays com dados (não vazios)
- [ ] CPF/CNPJ têm o número correto de dígitos

---

## 🎯 Ação Imediata Recomendada

**Implementar Solução #1 (Validação no Frontend) AGORA:**

Isso vai garantir que:
1. ✅ Campos obrigatórios não sejam deixados em branco
2. ✅ CPF/CNPJ tenham o número correto de dígitos
3. ✅ Erros sejam detectados ANTES de enviar para o backend
4. ✅ Mensagens de erro sejam claras para o usuário

**Depois implementar Solução #2 (Validação no Backend):**

Como camada adicional de segurança.

---

## 💡 Dica para Teste Rápido

Usar o botão **"Preencher Dados de Teste"** que já existe no formulário:

```javascript
function preencherDadosTeste() {
    // ... já preenche automaticamente:
    // Autor: MAYARA MENDES CARDOSO BARBOSA, CPF: 38569492839
    // Réu: MAYA SOTERO DICHIRICO PESTILLI, CPF: 54293137858
    // Signatário: 37450364840
}
```

Se mesmo com dados de teste o erro persistir, o problema está no backend/XML.

---

**Status:** 🔍 Aguardando implementação das validações e novo teste
**Data:** 03/11/2025
