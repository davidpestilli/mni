# ✅ Correção: Validação de Polos (Partes do Processo)

## 📅 Data: 03/11/2025

## 🔴 Problema Identificado

O erro "Parâmetro do método [setNumIdPessoaProcessoParte] é um array vazio" ocorria porque:

1. **Campos obrigatórios não eram validados** antes do envio
2. **CPF/CNPJ vazios** poderiam ser enviados ao MNI
3. **Nomes vazios** poderiam ser enviados ao MNI
4. **Erros eram detectados apenas no MNI**, não no frontend

Isso resultava em:
- ❌ Experiência ruim para o usuário (erro genérico do MNI)
- ❌ XML inválido sendo gerado
- ❌ Dados incompletos sendo enviados

---

## ✅ Correção Implementada

### 1. Validação no Frontend (JavaScript)

**Arquivo:** `frontend/js/peticionamento-inicial.js`
**Função modificada:** `extrairPartes(tipoPolo)` (linhas 691-748)

**O que foi adicionado:**

```javascript
function extrairPartes(tipoPolo) {
    const container = document.getElementById(tipoPolo === 'ativo' ? 'poloAtivoContainer' : 'poloPassivoContainer');
    const partesItems = container.querySelectorAll('.parte-item');
    const partes = [];
    const nomePoloPt = tipoPolo === 'ativo' ? 'Ativo (Autor)' : 'Passivo (Réu)';

    partesItems.forEach((item, index) => {
        const tipoPessoa = item.querySelector('.tipoPessoa').value;
        const numeroParteExibicao = index + 1;

        if (tipoPessoa === 'fisica') {
            const nome = item.querySelector('.nomeCompleto')?.value.trim() || '';
            const cpf = item.querySelector('.cpf')?.value.trim().replace(/\D/g, '') || '';

            // ✅ VALIDAÇÃO ADICIONADA
            if (!nome) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: Nome é obrigatório`);
            }
            if (!cpf) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CPF é obrigatório`);
            }
            if (cpf.length !== 11) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CPF inválido (deve ter 11 dígitos, recebido: ${cpf.length})`);
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
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: Razão Social é obrigatória`);
            }
            if (!cnpj) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CNPJ é obrigatório`);
            }
            if (cnpj.length !== 14) {
                throw new Error(`Polo ${nomePoloPt}, Parte ${numeroParteExibicao}: CNPJ inválido (deve ter 14 dígitos, recebido: ${cnpj.length})`);
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

**Validações implementadas:**

| Campo | Validação | Mensagem de Erro |
|-------|-----------|------------------|
| Nome (PF) | Não pode estar vazio | "Polo X, Parte Y: Nome é obrigatório" |
| CPF | Não pode estar vazio | "Polo X, Parte Y: CPF é obrigatório" |
| CPF | Deve ter exatamente 11 dígitos | "Polo X, Parte Y: CPF inválido (deve ter 11 dígitos, recebido: Z)" |
| Razão Social (PJ) | Não pode estar vazia | "Polo X, Parte Y: Razão Social é obrigatória" |
| CNPJ | Não pode estar vazio | "Polo X, Parte Y: CNPJ é obrigatório" |
| CNPJ | Deve ter exatamente 14 dígitos | "Polo X, Parte Y: CNPJ inválido (deve ter 14 dígitos, recebido: Z)" |

**Benefícios:**
- ✅ Erros detectados IMEDIATAMENTE no navegador
- ✅ Mensagens de erro CLARAS indicando qual campo está errado
- ✅ Usuário sabe EXATAMENTE o que precisa corrigir
- ✅ Evita chamadas desnecessárias ao backend/MNI

---

### 2. Validação no Backend (Node.js)

**Arquivo:** `backend/services/mni3Client.js`
**Função modificada:** `construirPoloXML(tipoPolo, parte)` (linhas 2078-2112)

**O que foi adicionado:**

```javascript
construirPoloXML(tipoPolo, parte) {
    // ✅ VALIDAÇÃO ADICIONADA: Verificar se parte é um objeto válido
    if (!parte || typeof parte !== 'object') {
        console.error('[MNI 3.0] ❌ Parte inválida:', parte);
        throw new Error('Dados da parte inválidos');
    }

    const isFisica = parte.tipoPessoa === 'fisica' || parte.cpf;

    // ✅ VALIDAÇÃO ADICIONADA: Validar CPF/CNPJ
    let documento;
    if (isFisica) {
        documento = (parte.cpf || '').replace(/\D/g, '');
        if (!documento || documento.length !== 11) {
            console.error('[MNI 3.0] ❌ CPF inválido para parte:', parte);
            throw new Error(`CPF inválido ou vazio para a parte "${parte.nome || 'desconhecida'}" (esperado: 11 dígitos, recebido: ${documento.length})`);
        }
    } else {
        documento = (parte.cnpj || '').replace(/\D/g, '');
        if (!documento || documento.length !== 14) {
            console.error('[MNI 3.0] ❌ CNPJ inválido para parte:', parte);
            throw new Error(`CNPJ inválido ou vazio para a parte "${parte.nome || 'desconhecida'}" (esperado: 14 dígitos, recebido: ${documento.length})`);
        }
    }

    // ✅ VALIDAÇÃO ADICIONADA: Validar nome
    const nome = isFisica ? parte.nome : (parte.razaoSocial || parte.nome);
    if (!nome || nome.trim() === '') {
        console.error('[MNI 3.0] ❌ Nome vazio para parte:', parte);
        throw new Error('Nome da parte é obrigatório');
    }

    const qualificacao = isFisica ? 'FIS' : 'JUR';
    const tipoDoc = isFisica ? 'CPF' : 'CMF';

    // ... resto do código continua igual
}
```

**Validações implementadas:**

| Validação | Descrição | Quando falha |
|-----------|-----------|--------------|
| Objeto válido | Verifica se `parte` é um objeto | Quando `parte` é null, undefined ou não é objeto |
| CPF válido | Verifica se CPF tem 11 dígitos | Quando CPF está vazio ou tem tamanho diferente de 11 |
| CNPJ válido | Verifica se CNPJ tem 14 dígitos | Quando CNPJ está vazio ou tem tamanho diferente de 14 |
| Nome válido | Verifica se nome não está vazio | Quando nome é string vazia ou só espaços |

**Benefícios:**
- ✅ **Camada adicional de segurança** (defesa em profundidade)
- ✅ Protege contra chamadas diretas à API (sem passar pelo frontend)
- ✅ Logs detalhados para debugging
- ✅ Evita geração de XML inválido

---

## 🔄 Arquitetura de Validação em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO PREENCHE FORMULÁRIO               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 1: Validação Frontend (JavaScript)                  │
│  ✅ Detecta campos vazios                                    │
│  ✅ Valida tamanho de CPF/CNPJ                              │
│  ✅ Mostra erro IMEDIATAMENTE ao usuário                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ (Se OK, envia para backend)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 2: Validação Backend Route (Node.js)               │
│  ✅ Valida arrays não vazios (já existia)                   │
│  ✅ Valida campos obrigatórios                               │
└─────────────────────────┬───────────────────────────────────┘
                          │ (Se OK, passa para mni3Client)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 3: Validação mni3Client (Node.js) - NOVA!          │
│  ✅ Valida estrutura dos dados                               │
│  ✅ Valida CPF/CNPJ com tamanho correto                     │
│  ✅ Valida nome não vazio                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ (Se OK, gera XML)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CAMADA 4: Validação MNI Server (TJSP)                      │
│  ✅ Valida XML completo                                      │
│  ✅ Valida regras de negócio do tribunal                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparação: Antes vs Depois

### ANTES (Sem Validação)

```
Usuário preenche formulário → CPF vazio → Envia para backend →
Gera XML inválido → Envia para MNI → MNI rejeita →
Erro genérico: "array vazio" 😕
```

**Problemas:**
- ❌ Usuário não sabe o que está errado
- ❌ XML inválido é gerado
- ❌ Requisição desnecessária para o MNI
- ❌ Tempo perdido em debugging

### DEPOIS (Com Validação em 3 Camadas)

```
Usuário preenche formulário → CPF vazio →
Validação Frontend detecta → Erro claro:
"Polo Ativo (Autor), Parte 1: CPF é obrigatório" ✅
```

**Benefícios:**
- ✅ Erro detectado INSTANTANEAMENTE
- ✅ Mensagem CLARA e ESPECÍFICA
- ✅ Usuário sabe EXATAMENTE o que corrigir
- ✅ Sem chamadas desnecessárias ao servidor

---

## 🧪 Como Testar

### Teste 1: Campo Nome Vazio

1. Abrir formulário de peticionamento inicial
2. Deixar campo "Nome Completo" vazio no Polo Ativo
3. Preencher outros campos (CPF, etc.)
4. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: Nome é obrigatório
```

---

### Teste 2: CPF Vazio

1. Preencher "Nome Completo"
2. Deixar campo "CPF" vazio
3. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: CPF é obrigatório
```

---

### Teste 3: CPF com Menos de 11 Dígitos

1. Preencher "Nome Completo"
2. Preencher CPF com "123456789" (9 dígitos)
3. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: CPF inválido (deve ter 11 dígitos, recebido: 9)
```

---

### Teste 4: CNPJ Inválido (Pessoa Jurídica)

1. Mudar tipo de pessoa para "Pessoa Jurídica"
2. Preencher "Razão Social"
3. Preencher CNPJ com "12345678901" (11 dígitos, em vez de 14)
4. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
❌ Erro ao enviar petição: Polo Ativo (Autor), Parte 1: CNPJ inválido (deve ter 14 dígitos, recebido: 11)
```

---

### Teste 5: Dados Corretos

1. Clicar no botão **"🚀 Preencher Dados de Teste"**
   - Preenche automaticamente autor e réu com dados válidos
2. Anexar documento PDF
3. Clicar em "Enviar Petição Inicial"

**Resultado esperado:**
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"tipoPessoa":"fisica","nome":"MAYARA...","cpf":"38569492839",...}]
[MNI 3.0] - poloPassivo: [{"tipoPessoa":"fisica","nome":"MAYA...","cpf":"54293137858",...}]
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
[MNI 3.0] ✓ Construindo 1 parte(s) do polo PASSIVO
[MNI 3.0] ✓ XML dos polos gerado com sucesso
...
✅ Petição enviada com sucesso!
```

---

## 📝 Mensagens de Erro Possíveis

| Mensagem | Causa | Solução |
|----------|-------|---------|
| "Polo Ativo (Autor), Parte 1: Nome é obrigatório" | Campo nome vazio | Preencher o nome completo |
| "Polo Ativo (Autor), Parte 1: CPF é obrigatório" | Campo CPF vazio | Preencher o CPF |
| "Polo Ativo (Autor), Parte 1: CPF inválido (deve ter 11 dígitos, recebido: X)" | CPF com quantidade errada de dígitos | Corrigir o CPF (deve ter 11 dígitos) |
| "Polo Passivo (Réu), Parte 2: Razão Social é obrigatória" | Campo razão social vazio (PJ) | Preencher a razão social |
| "Polo Passivo (Réu), Parte 2: CNPJ é obrigatório" | Campo CNPJ vazio | Preencher o CNPJ |
| "Polo Passivo (Réu), Parte 2: CNPJ inválido (deve ter 14 dígitos, recebido: X)" | CNPJ com quantidade errada de dígitos | Corrigir o CNPJ (deve ter 14 dígitos) |

---

## 🎯 Próximos Passos

### ✅ Já Implementado

1. ✅ Validação de campos obrigatórios (nome, CPF/CNPJ)
2. ✅ Validação de tamanho de CPF (11 dígitos)
3. ✅ Validação de tamanho de CNPJ (14 dígitos)
4. ✅ Mensagens de erro claras e específicas
5. ✅ Validação em múltiplas camadas (frontend + backend)
6. ✅ Logs de debug detalhados

### 🔜 Melhorias Futuras (Opcional)

1. **Validação de CPF/CNPJ com dígito verificador**
   - Calcular e validar os dígitos verificadores
   - Rejeitar CPFs/CNPJs inválidos (ex: 11111111111)

2. **Campos de endereço no formulário**
   - Adicionar campos de CEP, logradouro, número, etc.
   - Integração com API de CEP (ViaCEP)
   - Por enquanto, endereço padrão está funcionando

3. **Validação de data de nascimento**
   - Validar formato DD/MM/YYYY
   - Validar data não futura
   - Validar idade mínima (ex: maior de 18 anos)

4. **Feedback visual em tempo real**
   - Destacar campos inválidos em vermelho
   - Mostrar ícone ✓ em campos válidos
   - Mensagens de erro ao lado de cada campo

---

## ✅ Status Final

| Componente | Status |
|------------|--------|
| Validação Frontend | ✅ Implementada |
| Validação Backend | ✅ Implementada |
| Mensagens de Erro | ✅ Claras e Específicas |
| Logs de Debug | ✅ Funcionando |
| Testes | ⏳ Aguardando execução |

---

## 💡 Dica

Use o botão **"🚀 Preencher Dados de Teste"** no formulário para preencher automaticamente todos os campos com dados válidos. Isso facilita o teste do peticionamento.

---

**Data da Correção:** 03/11/2025
**Versão do MNI:** 3.0
**Status:** ✅ IMPLEMENTADO - Aguardando Testes
