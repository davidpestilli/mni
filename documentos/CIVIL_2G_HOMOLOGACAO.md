# 🏛️ Civil 2G Homologação - Guia de Implementação MNI 3.0

## 📋 Resumo Executivo

O ambiente **Civil 2G Homologação** foi adicionado ao sistema MNI Web App para permitir integração com o **sistema e-Proc de Segunda Instância (Tribunal de Justiça - Instância Recursal)** do TJSP.

Este ambiente utiliza **MNI 3.0** e compartilha a mesma infraestrutura já implementada para o sistema de Execução Fiscal.

---

## 🌐 Endpoints Configurados

### Base URLs (Homologação)

```
MNI 3.0 - Intercomunicação:
https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=intercomunicacao3.0

WSDL:
https://eproc-2g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl

Consultar Tabela:
https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=consultarTabela

WSDL Tabela:
https://eproc-2g-sp-hml.tjsp.jus.br/ws/consultarTabela.wsdl

XSD (Documentação):
https://eproc-2g-sp-hml.tjsp.jus.br/xsd/tipos-servico-intercomunicacao-3.0.0.xsd
```

---

## 🔧 Operações Disponíveis (MNI 3.0)

Baseado no XSD do ambiente Civil 2G, as seguintes operações estão disponíveis:

### 1. **consultarAvisosPendentes**
Consulta avisos de comunicação processual pendentes.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação (CPF/CNPJ + senha)
- `idRepresentado` (opcional): CPF/CNPJ da parte representada
- `dataInicial` (opcional): Data inicial de consulta
- `dataFinal` (opcional): Data final de consulta
- `tipoPendencia` (opcional): PC (pendente ciência) | PR (pendente resposta) | AM (ambos)
- `tiposAviso` (opcional): Tipos de comunicação a consultar

**Retorno:**
- `recibo`: Informações da operação
- `avisos`: Lista de avisos pendentes (tipoAvisoComunicacaoPendente)

---

### 2. **consultarTeorComunicacao**
Consulta o teor completo de uma comunicação processual.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` OU `identificadorAviso`: Identificação do processo/aviso

**Retorno:**
- `recibo`: Informações da operação
- `comunicacoes`: Lista de comunicações processuais completas

---

### 3. **consultarProcesso**
Consulta dados completos de um processo judicial.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` (obrigatório): Número único do processo (Resolução 65)
- `dataInicial` (opcional): Data inicial para movimentos/documentos
- `dataFinal` (opcional): Data final para movimentos/documentos
- `incluirCabecalho` (opcional): Retornar dados básicos do processo
- `incluirPartes` (opcional): Retornar dados das partes
- `incluirEnderecos` (opcional): Retornar endereços das partes
- `incluirMovimentos` (opcional): Retornar movimentações processuais
- `incluirDocumentos` (opcional): Retornar documentos anexos

**Retorno:**
- `recibo`: Informações da operação
- `processo`: Objeto tipoProcessoJudicial completo

---

### 4. **consultarAlteracao**
Consulta hashs de dados do processo para verificar alterações.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` (obrigatório): Número único do processo

**Retorno:**
- `recibo`: Informações da operação
- `hashCabecalho`: Hash dos dados do cabeçalho
- `hashMovimentacoes`: Hash das movimentações
- `hashDocumentos`: Hash dos documentos

---

### 5. **consultarLocalidades**
Consulta localidades judiciais disponíveis.

**Parâmetros:**
- `estado` (opcional): Sigla da UF (ex: SP)

**Retorno:**
- `recibo`: Informações da operação
- `localidades`: Lista de localidades (tipoLocalidade)

---

### 6. **consultarCompetencias**
Consulta competências judiciais de uma localidade.

**Parâmetros:**
- `codigoLocalidade` (obrigatório): Código da localidade

**Retorno:**
- `recibo`: Informações da operação
- `competencias`: Lista de competências (tipoCompetencia)

---

### 7. **consultarClasses**
Consulta classes processuais disponíveis.

**Parâmetros:**
- `codigoLocalidade` (obrigatório): Código da localidade
- `codigoCompetencia` (opcional): Código da competência

**Retorno:**
- `recibo`: Informações da operação
- `codigosClasse`: Lista de códigos de classes processuais

---

### 8. **consultarAssuntos**
Consulta assuntos processuais disponíveis.

**Parâmetros:**
- `codigoLocalidade` (obrigatório): Código da localidade
- `codigoClasse` (obrigatório): Código da classe processual
- `codigoCompetencia` (opcional): Código da competência

**Retorno:**
- `recibo`: Informações da operação
- `assuntos`: Lista de assuntos (tipoAssuntoProcessual)

---

### 9. **entregarPeticaoInicial**
Entrega de petição inicial (criação de novo processo).

**Parâmetros:**
- `manifestante` (obrigatório): Credenciais de autenticação
- `dadosBasicos` (obrigatório): Cabeçalho do processo (tipoCabecalhoProcesso)
- `documentos` (obrigatório): Lista de documentos (tipoDocumento)
- `dataEnvio` (obrigatório): Data/hora do envio
- `parametros` (opcional): Parâmetros adicionais

**Retorno:**
- `recibo`: Recibo da manifestação processual (tipoReciboManifestacaoProcessual)

---

### 10. **entregarPeticao**
Entrega de petição intermediária (manifestação em processo existente).

**Parâmetros:**
- `manifestante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` (obrigatório): Número único do processo
- `documentos` (obrigatório): Lista de documentos (tipoDocumento)
- `dataEnvio` (obrigatório): Data/hora do envio
- `parametros` (opcional): Parâmetros adicionais

**Retorno:**
- `recibo`: Recibo da manifestação processual

---

### 11. **responderComunicacao**
Resposta a um ato de comunicação processual (intimação/citação).

**Parâmetros:**
- `manifestante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` (obrigatório): Número único do processo
- `respostaAviso` (obrigatório): Resposta ao aviso (tipoRespostaAviso)
- `dataEnvio` (obrigatório): Data/hora do envio
- `parametros` (opcional): Parâmetros adicionais

**Retorno:**
- `recibo`: Recibo da manifestação processual

---

### 12. **remeterProcesso**
Remessa de processo entre instâncias.

**Parâmetros:**
- `manifestante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` OU `dadosBasicos`: Identificação do processo
- `documentos` (obrigatório): Documentos do processo
- `dataEnvio` (obrigatório): Data/hora do envio
- `movimento` (opcional): Movimentações processuais
- `fluxo` (obrigatório): Tipo de remessa (tipoMovimentoNacional)
- `tribunalRetorno` (opcional): Tribunal de retorno
- `parametros` (opcional): Parâmetros adicionais

**Retorno:**
- `recibo`: Recibo da remessa

---

### 13. **confirmarRecebimento**
Confirmação de recebimento de processo entre tribunais.

**Parâmetros:**
- `recebedor` (obrigatório): Credenciais do tribunal recebedor
- `protocolo` (obrigatório): Identificador do protocolo

**Retorno:**
- `recibo`: Confirmação da operação

---

### 14. **consultarRemessas**
Consulta histórico de remessas realizadas.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação
- `numerosProtocolos` (obrigatório): Lista de números de protocolo (max 100)

**Retorno:**
- `recibo`: Informações da operação
- `remessas`: Lista de históricos de remessa (tipoHistoricoRemessa)

---

### 15. **consultarDocumentosProcesso**
Consulta conteúdos de documentos processuais.

**Parâmetros:**
- `consultante` (obrigatório): Credenciais de autenticação
- `numeroProcesso` (obrigatório): Número único do processo
- `idDocumento` (obrigatório): Lista de IDs dos documentos

**Retorno:**
- `recibo`: Informações da operação
- `documentos`: Lista de conteúdos dos documentos (tipoConteudoDocumento)

---

## 🔄 Roteamento Automático

O sistema já está configurado para rotear automaticamente as requisições para os endpoints corretos baseado na seleção do usuário no login.

### Como Funciona:

1. **Login**: Usuário seleciona "Civil 2ª Instância (Recursal)" + "Homologação"
2. **Backend**: `ambiente.js` detecta `2G_CIVIL` + `HML`
3. **Endpoints**: Carrega variáveis `MNI_3_0_CIVIL_2G_HML_*` do `.env`
4. **Rotas**: Todas as chamadas MNI 3.0 apontam automaticamente para Civil 2G

### Rotas Afetadas:

```javascript
// Todas essas rotas usam automaticamente os endpoints Civil 2G
GET  /api/mni3/localidades
GET  /api/mni3/competencias/:codigo
GET  /api/mni3/classes/:codigo
GET  /api/mni3/assuntos/:codigo/:classe
POST /api/mni3/peticao-inicial
POST /api/mni3/peticao
GET  /api/avisos-v3
GET  /api/processos/:numeroProcesso
```

---

## 🎯 Casos de Uso Civil 2G

### 1. Consultar Avisos de Intimação (Recursos)
```javascript
// Frontend
const sistema = localStorage.getItem('mni_sistema_atual'); // '2G_CIVIL'
const response = await fetch('/api/avisos-v3?status=aguardando');

// Backend roteia automaticamente para:
// https://eproc-2g-sp-hml.tjsp.jus.br/ws/...
```

### 2. Peticionar em Processo Recursal
```javascript
// Frontend
const response = await fetch('/api/mni3/peticao', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        numeroProcesso: '...',
        codigoTipoDocumento: '...',
        documento: '...',
        nomeDocumento: 'Contrarrazões.pdf'
    })
});

// Backend roteia para Civil 2G automaticamente
```

### 3. Consultar Processo de Segunda Instância
```javascript
// Frontend
const response = await fetch('/api/processos/12345678920258260000?incluirMovimentos=true');

// Backend roteia para Civil 2G
```

---

## ⚙️ Configuração Técnica

### Arquivo `.env`

```env
# ========================================
# MNI 3.0 - CIVIL 2G (2º Grau)
# ========================================
MNI_3_0_CIVIL_2G_HML_ENDPOINT=https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=intercomunicacao3.0
MNI_3_0_CIVIL_2G_HML_WSDL_URL=https://eproc-2g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl

MNI_3_0_CIVIL_2G_PROD_ENDPOINT=
MNI_3_0_CIVIL_2G_PROD_WSDL_URL=

CIVIL_2G_TABELA_ENDPOINT=https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=consultarTabela
CIVIL_2G_TABELA_WSDL_URL=https://eproc-2g-sp-hml.tjsp.jus.br/ws/consultarTabela.wsdl
```

### Arquivo `backend/config/ambiente.js`

```javascript
const SISTEMAS_DISPONÍVEIS = {
    '1G_CIVIL': { ... },
    '1G_EXEC_FISCAL': { ... },
    '2G_CIVIL': {
        nome: 'Segundo Grau Civil (Instância Recursal)',
        ambientesDisponiveis: ['HML']
    }
};

function getEndpoints3_0() {
    // ...
    if (sistema === '2G_CIVIL') {
        endpoint = process.env.MNI_3_0_CIVIL_2G_HML_ENDPOINT;
        wsdlUrl = process.env.MNI_3_0_CIVIL_2G_HML_WSDL_URL;
    }
    // ...
}
```

### Arquivo `frontend/login.html`

```html
<select id="select-sistema-login">
    <option value="1G_CIVIL">Civil 1ª Instância</option>
    <option value="1G_EXEC_FISCAL">Execução Fiscal</option>
    <option value="2G_CIVIL">Civil 2ª Instância (Recursal)</option>
</select>
```

### Arquivo `frontend/js/ambiente.js`

```javascript
const SISTEMAS_CONFIG = {
    '1G_CIVIL': { ... },
    '1G_EXEC_FISCAL': { ... },
    '2G_CIVIL': {
        nome: 'Segundo Grau Civil (Instância Recursal)',
        ambientesDisponiveis: ['HML']
    }
};
```

---

## 🧪 Como Testar

### 1. Iniciar o Servidor
```bash
cd backend
npm start
```

### 2. Acessar o Login
```
http://localhost:3000/login.html
```

### 3. Selecionar Civil 2G
- Sistema: **Civil 2ª Instância (Recursal)**
- Ambiente: **Homologação**
- Indicador: **🏛️ HML**

### 4. Fazer Login
Usar credenciais de teste do ambiente de homologação Civil 2G

### 5. Testar Funcionalidades
- ✅ Consultar avisos pendentes
- ✅ Consultar processo
- ✅ Peticionar em processo existente
- ✅ Consultar tabelas (localidades, classes, assuntos)

---

## 📊 Comparação de Ambientes

| Característica | 1G Civil | 1G Exec. Fiscal | **2G Civil** |
|----------------|----------|-----------------|--------------|
| **MNI Versão** | 2.2 e 3.0 | 3.0 | **3.0** |
| **Instância** | 1º Grau | 1º Grau | **2º Grau** |
| **Natureza** | Cível Geral | Execução Fiscal | **Recursos** |
| **HML** | ✅ | ✅ | **✅** |
| **PROD** | ✅ | ❌ | **❌** |
| **Emoji** | ⚖️ | 💰 | **🏛️** |

---

## ⚠️ Observações Importantes

### 1. Ambiente de Homologação
- Apenas **HML** está disponível no momento
- **PROD** será configurado quando disponibilizado pelo TJSP

### 2. Diferenças do 1º Grau
- O 2º Grau **não faz autuação inicial** (processos são remetidos do 1º Grau)
- Foco em **peticionamento intermediário** (contrarrazões, memoriais, etc.)
- **Consultas** funcionam igual aos outros ambientes

### 3. Compatibilidade
- Usa **mesmas rotas MNI 3.0** do Execução Fiscal
- Não precisa de código adicional
- Roteamento é **automático** baseado na seleção do login

### 4. Tabelas
- Classes e assuntos são **específicos da 2ª Instância**
- Consultar via `/api/mni3/localidades`, `/api/mni3/classes`, etc.

---

## 🔗 Links Úteis

- **XSD Documentação**: https://eproc-2g-sp-hml.tjsp.jus.br/xsd/tipos-servico-intercomunicacao-3.0.0.xsd
- **WSDL Intercomunicação**: https://eproc-2g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl
- **WSDL Tabelas**: https://eproc-2g-sp-hml.tjsp.jus.br/ws/consultarTabela.wsdl

---

## ✅ Checklist de Implementação

- [x] Endpoints configurados no `.env`
- [x] Sistema adicionado em `backend/config/ambiente.js`
- [x] Opção adicionada no login (`frontend/login.html`)
- [x] Configuração frontend (`frontend/js/ambiente.js`)
- [x] Emoji e indicador visual (🏛️)
- [x] Documentação completa
- [ ] Testes em homologação
- [ ] Validação com tribunal
- [ ] Configuração de produção (quando disponível)

---

**Versão**: 1.0  
**Data**: 03/11/2025  
**Status**: ✅ Implementado  
**Ambiente**: Homologação (TJSP Civil 2G)  
**MNI**: 3.0
