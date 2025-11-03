# 🔴 Debug: Parâmetro [setNumIdPessoaProcessoParte] é um array vazio

## 📅 Data: 03/11/2025

## 🔴 Erro Reportado

```
❌ Erro ao enviar petição: Parâmetro do método [setNumIdPessoaProcessoParte]
   é um array vazio. [Identificador: -vQiR5oBOzdgV_oGqBYM]
```

---

## 🔍 Causa do Problema

Este erro indica que **as partes do processo (polo ativo e polo passivo) não estão sendo enviadas** ou estão vazias.

O MNI rejeita petições que não têm pelo menos **1 parte no polo ativo** E **1 parte no polo passivo**.

---

## 🛠️ Correção Implementada: Logs de Debug

Adicionei logs detalhados para identificar exatamente o que está acontecendo:

**Arquivo:** `backend/services/mni3Client.js:1801-1832`

```javascript
console.log('[MNI 3.0] ========================================');
console.log('[MNI 3.0] DEBUG - Dados dos Polos:');
console.log('[MNI 3.0] - poloAtivo:', JSON.stringify(dadosIniciais.poloAtivo));
console.log('[MNI 3.0] - poloPassivo:', JSON.stringify(dadosIniciais.poloPassivo));
console.log('[MNI 3.0] ========================================');

// Polo Ativo
if (dadosIniciais.poloAtivo && dadosIniciais.poloAtivo.length > 0) {
    console.log('[MNI 3.0] ✓ Construindo', dadosIniciais.poloAtivo.length, 'parte(s) do polo ATIVO');
    // ... constrói XML
} else {
    console.log('[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!');
}

// Polo Passivo
if (dadosIniciais.poloPassivo && dadosIniciais.poloPassivo.length > 0) {
    console.log('[MNI 3.0] ✓ Construindo', dadosIniciais.poloPassivo.length, 'parte(s) do polo PASSIVO');
    // ... constrói XML
} else {
    console.log('[MNI 3.0] ⚠️ ERRO: Polo Passivo vazio ou indefinido!');
}

// Validação final
if (!polosXML || polosXML.trim() === '') {
    console.error('[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!');
    throw new Error('Polo Ativo e Polo Passivo são obrigatórios para peticionamento inicial');
}
```

---

## 🧪 Como Testar e Identificar o Problema

### Passo 1: Reiniciar o Servidor
```bash
# Reinicie o servidor backend para aplicar os logs
```

### Passo 2: Tentar Fazer Peticionamento

Ao tentar fazer o peticionamento, verifique o console do servidor.

---

## 📊 Cenários Possíveis nos Logs

### ✅ Cenário 1: Dados Chegando Corretamente
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"nome":"FAZENDA PÚBLICA","cnpj":"12345678000190",...}]
[MNI 3.0] - poloPassivo: [{"nome":"EMPRESA XYZ","cnpj":"98765432000100",...}]
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
[MNI 3.0] ✓ Construindo 1 parte(s) do polo PASSIVO
[MNI 3.0] ✓ XML dos polos gerado com sucesso
```
**Ação:** Se você vê isso mas ainda dá erro, o problema está na estrutura do XML gerado.

---

### ❌ Cenário 2: Polo Ativo Vazio
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: []  ← VAZIO!
[MNI 3.0] - poloPassivo: [{"nome":"EMPRESA XYZ",...}]
[MNI 3.0] ========================================
[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!
[MNI 3.0] ✓ Construindo 1 parte(s) do polo PASSIVO
[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!
```
**Causa:** Frontend não está enviando dados do polo ativo.
**Ação:** Verificar formulário de peticionamento inicial → Autor/Exequente

---

### ❌ Cenário 3: Polo Passivo Vazio
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: [{"nome":"FAZENDA PÚBLICA",...}]
[MNI 3.0] - poloPassivo: []  ← VAZIO!
[MNI 3.0] ========================================
[MNI 3.0] ✓ Construindo 1 parte(s) do polo ATIVO
[MNI 3.0] ⚠️ ERRO: Polo Passivo vazio ou indefinido!
[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!
```
**Causa:** Frontend não está enviando dados do polo passivo.
**Ação:** Verificar formulário de peticionamento inicial → Réu/Executado

---

### ❌ Cenário 4: Ambos Vazios ou Undefined
```
[MNI 3.0] ========================================
[MNI 3.0] DEBUG - Dados dos Polos:
[MNI 3.0] - poloAtivo: undefined  ← NÃO ENVIADO!
[MNI 3.0] - poloPassivo: undefined  ← NÃO ENVIADO!
[MNI 3.0] ========================================
[MNI 3.0] ⚠️ ERRO: Polo Ativo vazio ou indefinido!
[MNI 3.0] ⚠️ ERRO: Polo Passivo vazio ou indefinido!
[MNI 3.0] ❌ ERRO CRÍTICO: Nenhum polo foi gerado!
```
**Causa:** Frontend não está enviando campo `poloAtivo` nem `poloPassivo`.
**Ação:** Verificar o código do frontend que envia a requisição para `/api/peticionamento/inicial`

---

## 🔧 Estrutura Esperada dos Dados

### Formato esperado no backend:

```javascript
{
  poloAtivo: [
    {
      nome: "FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO",
      tipoPessoa: "juridica",
      cnpj: "46377222000135",
      endereco: {
        logradouro: "Rua Pamplona",
        numero: "227",
        complemento: "17º andar",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
        cep: "01405-902",
        codigoIBGE: "3550308"
      }
    }
  ],
  poloPassivo: [
    {
      nome: "EMPRESA EXEMPLO LTDA",
      tipoPessoa: "juridica",
      cnpj: "12345678000190",
      endereco: {
        logradouro: "Avenida Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
        cep: "01310-100",
        codigoIBGE: "3550308"
      }
    }
  ]
}
```

---

## 🎯 Próximos Passos

1. **Reiniciar o servidor backend**
2. **Tentar fazer peticionamento inicial novamente**
3. **Verificar os logs no console do servidor**
4. **Copiar TODOS os logs** que aparecem
5. **Me enviar os logs** para análise

---

## 📝 Verificações no Frontend

Se os logs mostrarem que os dados não estão chegando, verifique:

### Arquivo: `frontend/js/peticionamento-inicial.js` (ou similar)

Procure pela função que envia os dados:

```javascript
// Deve ter algo assim:
const dadosIniciais = {
    codigoLocalidade: '...',
    classeProcessual: '...',
    // ...
    poloAtivo: [/* array com as partes do autor */],  ← VERIFICAR
    poloPassivo: [/* array com as partes do réu */],   ← VERIFICAR
    // ...
};

fetch('/api/peticionamento/inicial', {
    method: 'POST',
    body: JSON.stringify(dadosIniciais),
    // ...
});
```

**Verificar se:**
1. ✅ `poloAtivo` está sendo montado corretamente
2. ✅ `poloPassivo` está sendo montado corretamente
3. ✅ Arrays não estão vazios
4. ✅ Estrutura dos objetos está correta (nome, cpf/cnpj, endereco)

---

## 📋 Checklist de Debugging

- [ ] Servidor backend reiniciado com novos logs
- [ ] Tentativa de peticionamento realizada
- [ ] Logs do console copiados
- [ ] Verificado se `poloAtivo` aparece nos logs
- [ ] Verificado se `poloPassivo` aparece nos logs
- [ ] Verificado se os arrays têm elementos
- [ ] Verificado estrutura dos dados no frontend

---

## 💡 Dica

Se você estiver usando o formulário de peticionamento inicial, certifique-se de:

1. **Preencher os dados do Autor/Exequente** (polo ativo)
2. **Preencher os dados do Réu/Executado** (polo passivo)
3. **Incluir endereço completo** para ambas as partes
4. **Incluir CPF/CNPJ** válidos

---

**Status:** 🔍 Aguardando logs do próximo teste
**Data:** 03/11/2025
