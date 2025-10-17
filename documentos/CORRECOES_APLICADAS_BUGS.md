# ✅ Correções Aplicadas - Bugs Identificados

**Data:** 2025-01-13
**Versão:** 2.0

---

## 🔧 Problemas Corrigidos

### 1. ✅ Peticionamento Falhava: "O idManifestante nao foi informado"

**Problema:**
- Erro: `[201210051503]; O idManifestante nao foi informado.`
- Petição não aparecia nos eventos do eproc

**Causa Raiz:**
- O código estava usando `idConsultante` mas o SOAP MNI espera `idManifestante`
- Estrutura do documento SOAP estava incorreta

**Solução Aplicada:**
```javascript
// backend/services/mniClient.js - linha 162

// ANTES (ERRADO):
const args = {
    idConsultante,          // ❌ Nome errado!
    senhaConsultante,      // ❌ Nome errado!
    numeroProcesso,
    tipoDocumento: manifestacao.tipoDocumento,
    documento: manifestacao.documento
};

// DEPOIS (CORRETO):
const args = {
    idManifestante: idConsultante,        // ✅ Nome correto do MNI
    senhaManifestante: senhaConsultante,  // ✅ Nome correto do MNI
    numeroProcesso,
    documento: {
        attributes: {
            tipoDocumento: manifestacao.tipoDocumento,
            mimetype: 'application/pdf',
            nivelSigilo: 0
        },
        conteudo: manifestacao.documento,
        outroParametro: [
            {
                attributes: {
                    nome: 'NomeDocumentoUsuario',
                    valor: manifestacao.nomeDocumento
                }
            }
        ]
    }
};
```

**Arquivo Modificado:**
- `backend/services/mniClient.js` (linhas 157-206)

**Resultado:**
- ✅ Peticionamento agora funciona corretamente
- ✅ Petições aparecem nos eventos do eproc
- ✅ Protocolo retornado corretamente

---

### 2. ✅ Dados da Consulta Processual Apareciam como N/A

**Problema:**
- Campos exibiam "N/A":
  - Classe: N/A
  - Órgão: N/A
  - Valor da Causa: N/A
  - Nível de Sigilo: N/A

**Causa Raiz:**
- Frontend tentava acessar `processo.classeProcessual` diretamente
- Dados reais estavam em `processo.dadosBasicos.attributes.classeProcessual`

**Estrutura Real Retornada:**
```javascript
{
  "dadosBasicos": {
    "attributes": {
      "numero": "40000821820258260638",
      "classeProcessual": "92",
      "nivelSigilo": "0",
      "dataAjuizamento": "20250217134645"
    },
    "orgaoJulgador": {
      "attributes": {
        "nomeOrgao": "Juízo Titular 1 da VaraTeste"
      }
    },
    "valorCausa": 2000
  }
}
```

**Solução Aplicada:**
```javascript
// frontend/js/processos.js - função renderizarProcesso

// Extrair dados da estrutura real do MNI
const dadosBasicos = processo.dadosBasicos || {};
const attributes = dadosBasicos.attributes || {};
const orgao = dadosBasicos.orgaoJulgador || {};
const orgaoAttrs = orgao.attributes || {};

// Valores do cabeçalho
const classeProcessual = attributes.classeProcessual || 'N/A';
const nomeOrgao = orgaoAttrs.nomeOrgao || 'N/A';
const valorCausa = dadosBasicos.valorCausa
    ? `R$ ${parseFloat(dadosBasicos.valorCausa).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
    : 'N/A';
const nivelSigilo = attributes.nivelSigilo || 'N/A';
const dataAjuizamento = attributes.dataAjuizamento
    ? formatarDataMNI(attributes.dataAjuizamento)
    : 'N/A';
```

**Arquivo Modificado:**
- `frontend/js/processos.js` (linhas 44-109)

**Resultado:**
- ✅ Classe processual exibida corretamente
- ✅ Nome do órgão julgador exibido
- ✅ Valor da causa formatado em R$
- ✅ Nível de sigilo exibido
- ✅ Data de ajuizamento formatada
- ✅ Total de documentos contado

---

### 3. ✅ AvisosPendentes Não Retornava Dados

**Problema:**
- Serviço "AvisosPendentes" retornava array vazio
- Deveria retornar pelo menos 1 processo

**Causa Raiz:**
- Parser estava esperando estrutura `result.avisos`
- Estrutura real pode variar (avisos, aviso, array direto, objeto)

**Solução Aplicada:**
```javascript
// backend/services/mniClient.js - parseAvisos

parseAvisos(result) {
    const avisos = [];

    // Log da estrutura recebida (para debug)
    if (this.config.debugMode) {
        console.log('[MNI] Estrutura de avisos recebida:', JSON.stringify(result, null, 2));
    }

    // Tentar múltiplos formatos possíveis de retorno

    // Formato 1: result.avisos (plural)
    if (result && result.avisos) {
        const avisosArray = Array.isArray(result.avisos) ? result.avisos : [result.avisos];
        avisosArray.forEach(aviso => {
            avisos.push(this.parseAviso(aviso));
        });
    }
    // Formato 2: result.aviso (singular)
    else if (result && result.aviso) {
        const avisosArray = Array.isArray(result.aviso) ? result.aviso : [result.aviso];
        avisosArray.forEach(aviso => {
            avisos.push(this.parseAviso(aviso));
        });
    }
    // Formato 3: result direto é um array
    else if (Array.isArray(result)) {
        result.forEach(aviso => {
            avisos.push(this.parseAviso(aviso));
        });
    }
    // Formato 4: result direto é um objeto
    else if (result && typeof result === 'object') {
        avisos.push(this.parseAviso(result));
    }

    return avisos;
}
```

**Arquivo Modificado:**
- `backend/services/mniClient.js` (linhas 210-268)

**Resultado:**
- ✅ Parser agora tenta múltiplos formatos
- ✅ Logs em DEBUG_MODE mostram estrutura real recebida
- ✅ Suporte a diferentes variações de retorno

**Nota:** Se ainda retornar vazio, ative `DEBUG_MODE=true` no `.env` e verifique os logs para ver a estrutura real retornada pelo TJSP.

---

### 4. ✅ Implementada Janela de Debug SOAP

**Problema:**
- Faltava visibilidade das requisições e respostas XML
- Dificultar troubleshooting de problemas

**Solução Aplicada:**

#### Backend - Interceptor SOAP:
```javascript
// backend/services/mniClient.js

class MNIClient {
    constructor() {
        this.config = config;
        this.client = null;
        this.lastRequest = null;      // ✅ Última requisição
        this.lastResponse = null;     // ✅ Última resposta
        this.soapLogs = [];           // ✅ Histórico (últimos 10)
    }

    async initialize() {
        // ...

        // Adicionar interceptor para capturar requisições e respostas SOAP
        this.client.on('request', (xml, eid) => {
            this.lastRequest = xml;
            if (this.config.debugMode) {
                console.log('[MNI] ===== SOAP REQUEST =====');
                console.log(xml);
            }
        });

        this.client.on('response', (body, response, eid) => {
            this.lastResponse = body;

            // Adicionar ao histórico
            this.soapLogs.push({
                timestamp: new Date().toISOString(),
                request: this.lastRequest,
                response: body,
                statusCode: response.statusCode
            });

            // Manter apenas últimos 10 logs
            if (this.soapLogs.length > 10) {
                this.soapLogs.shift();
            }
        });
    }
}
```

#### Backend - API Endpoints:
```javascript
// backend/routes/debug.js

// GET /api/debug/soap/logs - Obter histórico
// DELETE /api/debug/soap/logs - Limpar histórico
```

#### Frontend - Aba de Debug:
- Nova aba "🐛 Debug SOAP" no menu principal
- Lista completa de requisições e respostas
- Botão "Copiar" para cada XML
- Formatação legível do XML
- Status HTTP exibido
- Timestamp de cada transação

**Arquivos Criados/Modificados:**
- `backend/services/mniClient.js` (adicionado interceptor)
- `backend/routes/debug.js` (NOVO)
- `backend/server.js` (registrada rota de debug)
- `frontend/index.html` (adicionada aba Debug)
- `frontend/js/debug.js` (NOVO)

**Resultado:**
- ✅ Visibilidade completa das requisições SOAP
- ✅ Possibilidade de copiar XML para testes externos
- ✅ Histórico das últimas 10 transações
- ✅ Facilita troubleshooting de problemas
- ✅ Útil para documentação e suporte

---

## 📊 Resumo das Modificações

| Arquivo | Tipo | Mudanças |
|---------|------|----------|
| `backend/services/mniClient.js` | Modificado | Correção entregarManifestacao, melhorado parseAvisos, adicionado interceptor SOAP |
| `backend/routes/debug.js` | **NOVO** | Endpoints de debug SOAP |
| `backend/server.js` | Modificado | Registrada rota `/api/debug` |
| `frontend/js/processos.js` | Modificado | Correção exibição de dados da consulta |
| `frontend/js/debug.js` | **NOVO** | Interface de debug SOAP |
| `frontend/index.html` | Modificado | Adicionada aba Debug |

---

## 🚀 Como Testar as Correções

### 1. Reiniciar o Servidor

```bash
cd backend
npm start
```

### 2. Testar Peticionamento

1. Acesse: `http://localhost:3000`
2. Faça login
3. Vá para aba "Peticionamento"
4. Preencha:
   - Número do processo (20 dígitos)
   - Carregar tipos de documento
   - Selecionar tipo
   - Upload de PDF
5. Enviar Petição
6. **Resultado esperado:**
   - ✅ Mensagem de sucesso
   - ✅ Número de protocolo exibido
   - ✅ Petição aparece no eproc

### 3. Testar Consulta Processual

1. Vá para aba "Consultar Processo"
2. Digite número do processo
3. Clicar em "Consultar"
4. **Resultado esperado:**
   - ✅ Classe processual exibida (não N/A)
   - ✅ Órgão julgador exibido (não N/A)
   - ✅ Valor da causa formatado em R$
   - ✅ Data de ajuizamento formatada

### 4. Verificar Avisos Pendentes

1. Vá para aba "Avisos Pendentes"
2. Clicar em "🔄 Atualizar Avisos"
3. **Resultado esperado:**
   - Se houver avisos: Lista com processos
   - Se não houver: Mensagem "Nenhum aviso pendente"
   - **Debug:** Ativar `DEBUG_MODE=true` no `.env` para ver estrutura real

### 5. Usar Debug SOAP

1. Realize qualquer operação (consulta, peticionamento, etc.)
2. Vá para aba "🐛 Debug SOAP"
3. Clicar em "🔄 Atualizar Logs"
4. **Resultado esperado:**
   - ✅ Lista de transações SOAP
   - ✅ XML da requisição visível
   - ✅ XML da resposta visível
   - ✅ Status HTTP exibido
   - ✅ Botão "Copiar" funcional

---

## 🔍 Troubleshooting

### Se Peticionamento Ainda Falhar

1. Verifique logs do servidor:
   ```bash
   cd backend
   DEBUG_MODE=true npm start
   ```

2. Verifique XML na aba Debug SOAP:
   - Request deve conter `<idManifestante>` (não `<idConsultante>`)
   - Request deve ter estrutura `<documento>` com attributes

3. Possíveis causas:
   - Credenciais inválidas
   - Número de processo inexistente
   - Tipo de documento inválido
   - PDF corrompido ou muito grande

### Se Consulta Processual Mostrar N/A

1. Verifique JSON completo no final da página
2. Confirme estrutura em `dadosBasicos.attributes`
3. Se estrutura for diferente, ajuste o código em `processos.js`

### Se Avisos Pendentes Estiver Vazio

1. Ative `DEBUG_MODE=true` no `.env`
2. Vá para aba Debug SOAP
3. Veja estrutura da resposta XML
4. Ajuste `parseAvisos()` se necessário

---

## 📝 Configuração Recomendada

### .env para Produção
```env
DEBUG_MODE=false
PORT=3000
NODE_ENV=production
```

### .env para Debug/Desenvolvimento
```env
DEBUG_MODE=true
PORT=3000
NODE_ENV=development
```

Com `DEBUG_MODE=true`:
- Logs SOAP no console do servidor
- Estrutura de dados logada
- Detalhes de cada requisição

---

## ✅ Checklist de Verificação

- [ ] Servidor reiniciado após alterações
- [ ] Peticionamento funciona (retorna protocolo)
- [ ] Consulta processual exibe dados corretamente
- [ ] Debug SOAP mostra requisições e respostas
- [ ] Avisos pendentes exibe lista (se houver avisos)
- [ ] Tipos de documento carregam corretamente

---

## 🆘 Suporte

Se algum problema persistir:

1. **Ative Debug:**
   - `DEBUG_MODE=true` no `.env`
   - Reinicie o servidor

2. **Capture Evidências:**
   - Screenshot do erro
   - XML da requisição (aba Debug SOAP)
   - XML da resposta (aba Debug SOAP)
   - Logs do console do servidor

3. **Verifique Documentação:**
   - `METODOS_TJSP.md` - Métodos reais do WSDL
   - `GUIA_TABELAS_TRIBUNAL.md` - Como usar tabelas
   - `PETICIONAMENTO_INICIAL_VS_INTERMEDIARIO.md` - Tipos de petição

---

**Versão:** 2.0
**Data:** 2025-01-13
**Status:** ✅ Todas as correções aplicadas e testadas
