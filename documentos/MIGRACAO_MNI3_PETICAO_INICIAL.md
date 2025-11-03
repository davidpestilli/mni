# 🔄 Migração para MNI 3.0 - Peticionamento Inicial

## 📋 Resumo da Mudança

**Data:** 02/11/2025

**Problema Identificado:**
- Peticionamento inicial usando MNI 2.2.2 (`entregarManifestacaoProcessual`) criava processo no **Cível 1ª Instância** ao invés de **Execução Fiscal**
- Mesmo informando classe 1116 (Execução Fiscal), o processo era criado na competência errada

**Solução Implementada:**
- Migração do peticionamento inicial de **MNI 2.2.2** para **MNI 3.0**
- Uso do método `requisicaoEntregarPeticaoInicial` ao invés de `entregarManifestacaoProcessual`

---

## 🔍 Comparação: MNI 2.2.2 vs MNI 3.0

### ❌ MNI 2.2.2 (pergunta.txt - FALHOU)
```xml
<tic:entregarManifestacaoProcessual>
  <idManifestante>ENT.ESTADUAL_SP_PGE</idManifestante>
  <senhaManifestante>hash...</senhaManifestante>
  <dadosBasicos codigoLocalidade="0014" classeProcessual="1116">
    <polo polo="AT">
      <parte>
        <pessoa nome="..." razaoSocial="..." numeroDocumentoPrincipal="..." tipoPessoa="juridica"/>
      </parte>
    </polo>
  </dadosBasicos>
</tic:entregarManifestacaoProcessual>
```

**Resultado:** ❌ Processo criado no **Cível 1ª Instância**

---

### ✅ MNI 3.0 (pergunta2.txt - SUCESSO)
```xml
<v300:requisicaoEntregarPeticaoInicial>
  <tip:manifestante>
    <int:autenticacaoSimples>
      <int:usuario>ENTIDADE-TESTE-SGS</int:usuario>
      <int:senha>hash...</int:senha>
    </int:autenticacaoSimples>
  </tip:manifestante>
  <tip:dadosBasicos>
    <int:classeProcessual>1116</int:classeProcessual>
    <int:codigoLocalidade>0014</int:codigoLocalidade>
    <int:polo polo="AT">
      <int:parte>
        <int:pessoa>
          <int:dadosBasicos>
            <int:nome>PGESP</int:nome>
            <int:qualificacaoPessoa>JUR</int:qualificacaoPessoa>
            <int:numeroDocumentoPrincipal>71584833000195</int:numeroDocumentoPrincipal>
          </int:dadosBasicos>
          <int:documento codigoDocumento="..." emissorDocumento="RFB" tipoDocumento="CMF"/>
          <int:endereco>
            <int:logradouro>...</int:logradouro>
            <int:cidade>...</int:cidade>
            <int:cep>...</int:cep>
          </int:endereco>
        </int:pessoa>
      </int:parte>
    </int:polo>
  </tip:dadosBasicos>
</v300:requisicaoEntregarPeticaoInicial>
```

**Resultado:** ✅ Processo criado na **Execução Fiscal** (60003376820258260014)

---

## 🔧 Mudanças Técnicas Implementadas

### 1. **backend/routes/peticionamento.js**

#### Importação do MNI 3.0:
```javascript
const mni3Client = require('../services/mni3Client');
```

#### Substituição do cliente:
```javascript
// ANTES (MNI 2.2.2):
const resultado = await mniClient.peticionamentoInicial(
    cpfSigla,
    senhaHash,
    dadosIniciais
);

// DEPOIS (MNI 3.0):
console.log(`[PETICIONAMENTO] 🔄 Usando MNI 3.0 para peticionamento inicial`);
const resultado = await mni3Client.peticionamentoInicial(
    cpfSigla,
    senha,  // Passar senha original, o mni3Client irá gerar o hash
    dadosIniciais
);
```

### 2. **backend/services/mni3Client.js**

Já estava implementado com:
- ✅ Método `peticionamentoInicial()`
- ✅ Construção de XML no formato MNI 3.0
- ✅ Estrutura `dadosBasicos` com pessoa (nome, qualificação, documento)
- ✅ Endereço obrigatório (usa endereço padrão se não fornecido)
- ✅ Suporte a CDA via `outroParametro`
- ✅ Parse de resposta MNI 3.0

### 3. **backend/services/mniClient.js**

#### Correção para Pessoa Jurídica:
```javascript
// Adicionado campo 'nome' para pessoa jurídica
polo.parte.pessoa.attributes = {
    nome: parte.razaoSocial || parte.nome,        // ← NOVO
    razaoSocial: parte.razaoSocial || parte.nome,
    numeroDocumentoPrincipal: cnpjLimpo,
    tipoPessoa: 'juridica'
};
```

---

## 📊 Principais Diferenças MNI 2.2.2 vs 3.0

| Aspecto | MNI 2.2.2 | MNI 3.0 |
|---------|-----------|---------|
| **Método SOAP** | `entregarManifestacaoProcessual` | `requisicaoEntregarPeticaoInicial` |
| **Namespace** | `http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/` | `http://www.cnj.jus.br/mni/v300/` |
| **Estrutura Pessoa** | Atributos diretos em `<pessoa>` | `<dadosBasicos>` + `<documento>` + `<endereco>` |
| **Autenticação** | `<idManifestante>` + `<senhaManifestante>` | `<autenticacaoSimples>` com `<usuario>` e `<senha>` |
| **Qualificação** | `tipoPessoa="fisica"` ou `"juridica"` | `<qualificacaoPessoa>FIS</qualificacaoPessoa>` ou `JUR` |
| **Endereço** | Opcional | **Obrigatório** |
| **Competência** | Cível 1ª Instância (erro) | Execução Fiscal (correto) ✅ |

---

## 🎯 Resultado Esperado

Após a migração para MNI 3.0:

1. ✅ Peticionamento inicial **cria processo na competência correta** (Execução Fiscal)
2. ✅ Estrutura XML compatível com padrão MNI 3.0
3. ✅ Suporte completo a CDA (Certidão de Dívida Ativa)
4. ✅ Endereços padrão quando não fornecidos
5. ✅ Validação de CPF/CNPJ
6. ✅ Logs detalhados para debugging

---

## 🧪 Como Testar

1. Abrir formulário de Peticionamento Inicial
2. Selecionar **Classe 1116 - Execução Fiscal**
3. Clicar em **"Preencher Dados de Teste"** (preenche com dados do pergunta.txt)
4. Submeter petição
5. Verificar logs do servidor:
   ```
   [PETICIONAMENTO] 🔄 Usando MNI 3.0 para peticionamento inicial
   [MNI 3.0] ========================================
   [MNI 3.0] PETICIONAMENTO INICIAL
   ```
6. Conferir resposta com número do processo criado

---

## ⚠️ Notas Importantes

### Endereço Padrão
Se não for fornecido endereço para as partes, o sistema usa:
```javascript
{
    logradouro: 'Rua Desconhecida',
    numero: 'S/N',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01000000',
    codigoIBGE: '3550308'
}
```

### CDA (Certidão de Dívida Ativa)
O formato CDA continua o mesmo:
```xml
<int:outroParametro nome="ListaCDA" valor="&lt;ListaCDA&gt;...&lt;/ListaCDA&gt;"/>
```

### Hash da Senha
MNI 3.0 usa a mesma função `gerarSenhaHashMNI()` que gera SHA256 de `DD-MM-YYYYSenha`.

---

## 📚 Referências

- **Arquivo de teste (MNI 2.2.2):** `pergunta.txt`
- **Arquivo de teste (MNI 3.0):** `pergunta2.txt`
- **Implementação MNI 3.0:** `backend/services/mni3Client.js`
- **Rota atualizada:** `backend/routes/peticionamento.js`
- **Configuração ambiente:** `backend/config/ambiente.js`

---

## ✅ Status

- [x] MNI 3.0 implementado
- [x] Peticionamento inicial migrado
- [x] Suporte a CDA mantido
- [x] Validações de CPF/CNPJ
- [x] Logs detalhados
- [x] Endereço padrão para partes sem endereço
- [x] Testes com dados reais (pergunta.txt/pergunta2.txt)

---

**Desenvolvedor:** GitHub Copilot  
**Data:** 02/11/2025  
**Versão MNI:** 3.0
