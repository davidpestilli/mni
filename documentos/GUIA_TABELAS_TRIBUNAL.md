# 📚 Guia Completo: Consulta de Tabelas do Tribunal

## 🎯 O que são as Tabelas?

As **tabelas do tribunal** são listas auxiliares que contêm códigos e descrições necessários para integração com o sistema processual. Sem essas tabelas, seria impossível saber qual código usar para cada tipo de documento, classe processual, etc.

---

## 🔗 Endpoints das Tabelas

### TJSP (exemplo do seu contexto)

```
WSDL: https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl
Endpoint: https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=consultarTabela
```

### Outros tribunais

Cada tribunal pode ter URLs diferentes. Geralmente seguem o padrão:
```
https://[dominio]/eproc/ws/consultarTabela.wsdl
https://[dominio]/eproc/ws/controlador_ws.php?srv=consultarTabela
```

---

## 📋 Tabelas Disponíveis

### Principais Tabelas

| Nome da Tabela | Descrição | Uso |
|----------------|-----------|-----|
| **TipoDocumento** | Tipos de documento para peticionamento | Obrigatório para peticionamento |
| **ClasseProcessual** | Classes de processos | Identificar tipo de ação |
| **AssuntoProcessual** | Assuntos/temas processuais | Classificar assunto do processo |
| **MovimentoProcessual** | Tipos de movimento | Entender histórico do processo |
| **OrgaoJulgador** | Órgãos julgadores (varas, turmas) | Identificar competência |
| **TipoRelacionamento** | Tipos de vínculo entre processos | Apensamento, conexão, etc. |
| **TipoParte** | Tipos de parte processual | Autor, réu, terceiro, etc. |
| **NivelSigilo** | Níveis de sigilo | 0=Público, 1=Segredo, etc. |

---

## 🚀 Como Usar no App Web

### Passo 1: Reiniciar o Servidor

```bash
# Parar servidor (Ctrl+C)
cd backend
npm start
```

### Passo 2: Acessar Peticionamento

1. Acesse: `http://localhost:3000`
2. Vá para aba **"Peticionamento"**
3. Clique no botão **"🔄 Carregar"** ao lado do campo "Tipo de Documento"

### Passo 3: Selecionar Tipo

O select será populado automaticamente com todos os tipos disponíveis:
```
123 - Petição Inicial
456 - Contestação
789 - Recurso
...
```

---

## 🔧 Como Usar Programaticamente

### Via API REST (endpoints criados)

#### 1. Listar tabelas disponíveis

```bash
GET http://localhost:3000/api/tabelas
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    "TipoDocumento",
    "ClasseProcessual",
    "AssuntoProcessual",
    ...
  ]
}
```

#### 2. Consultar uma tabela específica

```bash
GET http://localhost:3000/api/tabelas/TipoDocumento
```

**Resposta:**
```json
{
  "success": true,
  "tabela": "TipoDocumento",
  "count": 150,
  "data": [
    {
      "codigo": "123",
      "descricao": "Petição Inicial",
      "ativo": true
    },
    {
      "codigo": "456",
      "descricao": "Contestação",
      "ativo": true
    }
  ]
}
```

#### 3. Atalho para tipos de documento

```bash
GET http://localhost:3000/api/tabelas/tipos-documento/listar
```

---

## 💻 Consumir com Maestria

### 1. Usando SoapUI

**Criar Requisição SOAP:**

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://eproc.jus.br/servico">
   <soapenv:Header/>
   <soapenv:Body>
      <ser:consultarTabela>
         <nomeTabela>TipoDocumento</nomeTabela>
      </ser:consultarTabela>
   </soapenv:Body>
</soapenv:Envelope>
```

**Endpoint:** `https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=consultarTabela`

**WSDL:** `https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl`

### 2. Usando Node.js (como no app)

```javascript
const soap = require('soap');

const wsdlUrl = 'https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl';
const endpoint = 'https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=consultarTabela';

async function consultarTiposDocumento() {
    const client = await soap.createClientAsync(wsdlUrl);
    client.setEndpoint(endpoint);

    const args = {
        nomeTabela: 'TipoDocumento'
    };

    const [result] = await client.consultarTabelaAsync(args);
    return result;
}
```

### 3. Usando Python

```python
from zeep import Client

wsdl_url = 'https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl'

client = Client(wsdl=wsdl_url)
result = client.service.consultarTabela(nomeTabela='TipoDocumento')

for item in result:
    print(f"{item.codigo} - {item.descricao}")
```

### 4. Usando Java

```java
import javax.xml.ws.Service;
import javax.xml.namespace.QName;
import java.net.URL;

URL wsdlUrl = new URL("https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl");
QName qname = new QName("http://eproc.jus.br/servico", "ConsultarTabelaService");

Service service = Service.create(wsdlUrl, qname);
ConsultarTabelaPortType port = service.getPort(ConsultarTabelaPortType.class);

List<Registro> registros = port.consultarTabela("TipoDocumento");
```

---

## 🔍 Estrutura da Resposta

### Formato Padrão (esperado)

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
   <soap:Body>
      <ns2:consultarTabelaResposta xmlns:ns2="http://eproc.jus.br/servico">
         <registros>
            <codigo>123</codigo>
            <descricao>Petição Inicial</descricao>
            <ativo>S</ativo>
         </registros>
         <registros>
            <codigo>456</codigo>
            <descricao>Contestação</descricao>
            <ativo>S</ativo>
         </registros>
      </ns2:consultarTabelaResposta>
   </soap:Body>
</soap:Envelope>
```

### Variações Possíveis

Alguns tribunais podem usar:
- `<itens>` em vez de `<registros>`
- `<id>` em vez de `<codigo>`
- `<nome>` em vez de `<descricao>`
- `<situacao>` em vez de `<ativo>`

**O cliente criado (`tabelaClient.js`) já trata essas variações!**

---

## 🛠️ Troubleshooting

### Erro: "Cannot connect to WSDL"

**Causas:**
1. URL do WSDL incorreta
2. Tribunal não disponibiliza esse serviço
3. Firewall bloqueando acesso

**Solução:**
```bash
# Testar WSDL no navegador
https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl

# Se não abrir, pergunte à equipe do tribunal sobre o serviço
```

### Erro: "Method not found"

**Causa:** Nome da tabela incorreto

**Solução:**
```javascript
// Listar tabelas disponíveis primeiro
GET /api/tabelas

// Usar nome exato retornado
```

### Resposta vazia ou formato estranho

**Causa:** Estrutura da resposta é diferente

**Solução:**
1. Veja o console (F12) para estrutura dos dados
2. Ajuste o método `parseTabela()` em `tabelaClient.js`:

```javascript
parseTabela(result) {
    // Adicionar seu próprio parsing aqui baseado na estrutura real
    if (result && result.seuCampoCustomizado) {
        // Parse customizado
    }
}
```

---

## 📊 Casos de Uso Práticos

### 1. Peticionamento Inteligente

**Problema:** Usuário não sabe qual código usar

**Solução:**
```javascript
// Carregar tipos de documento
const tipos = await fetch('/api/tabelas/TipoDocumento').then(r => r.json());

// Popular select/autocomplete
tipos.data.forEach(tipo => {
    console.log(`${tipo.codigo} - ${tipo.descricao}`);
});
```

### 2. Validação de Dados

**Problema:** Usuário digitou código inválido

**Solução:**
```javascript
const tipos = await carregarTiposDocumento();
const codigoValido = tipos.some(t => t.codigo === codigoDigitado);

if (!codigoValido) {
    alert('Código de tipo de documento inválido!');
}
```

### 3. Cache Local

**Problema:** Fazer requisição toda vez é lento

**Solução:**
```javascript
// Salvar no localStorage
localStorage.setItem('tipos_documento', JSON.stringify(tipos));

// Carregar do cache
const cached = JSON.parse(localStorage.getItem('tipos_documento'));

// Atualizar cache diariamente
const lastUpdate = localStorage.getItem('tipos_documento_date');
if (lastUpdate !== hoje) {
    // Recarregar
}
```

### 4. Autocompletar

**Problema:** Lista muito grande, difícil de navegar

**Solução:**
```javascript
// Filtrar por digitação
const termo = 'peti';
const filtrados = tipos.filter(t =>
    t.descricao.toLowerCase().includes(termo.toLowerCase())
);
```

---

## 🎓 Dicas para Suporte

### Quando orientar entes sobre tabelas:

1. **Sempre envie os 2 links:**
   - WSDL: Para descobrir estrutura
   - Endpoint: Para fazer requisições

2. **Explique o propósito:**
   - "Essas tabelas contêm os códigos que você precisa usar"
   - "Sem elas, não há como saber qual código usar para petições"

3. **Demonstre o uso:**
   - Mostre uma requisição no SoapUI
   - Ou use o próprio app web que você criou

4. **Oriente sobre cache:**
   - "Essas tabelas mudam raramente"
   - "Podem ser cacheadas por 24h ou mais"
   - "Verifique apenas mudanças periodicamente"

5. **Ajude com parsing:**
   - Cada tribunal pode ter estrutura diferente
   - Peça um exemplo de resposta XML
   - Ajude a adaptar o código de parse

---

## 📚 Recursos Adicionais

### Testar Manualmente

1. **No navegador:**
   ```
   http://localhost:3000/api/tabelas/TipoDocumento
   ```

2. **No SoapUI:**
   - Importar WSDL
   - Criar requisição `consultarTabela`
   - Testar com diferentes nomes de tabela

3. **No Postman:**
   - Importar WSDL como SOAP Request
   - Configurar endpoint manualmente
   - Testar requisições

### Documentar Códigos

Crie uma planilha de referência:

| Código | Descrição | Observações |
|--------|-----------|-------------|
| 123 | Petição Inicial | Usar no início do processo |
| 456 | Contestação | Resposta do réu |
| 789 | Recurso | Após sentença |

Compartilhe com os entes que você dá suporte.

---

## ✅ Checklist de Implementação

Para implementar consulta de tabelas em um sistema:

- [ ] Obter URLs (WSDL + Endpoint) do tribunal
- [ ] Testar no SoapUI
- [ ] Implementar cliente SOAP
- [ ] Criar método `consultarTabela(nomeTabela)`
- [ ] Parsear resposta XML
- [ ] Tratar erros (tabela não existe, sem acesso, etc.)
- [ ] Implementar cache local
- [ ] Popular interfaces (select, autocomplete, etc.)
- [ ] Validar códigos antes de enviar
- [ ] Documentar códigos usados com frequência

---

## 🆘 Precisa de Ajuda?

### Informações necessárias para debug:

1. **URL do WSDL** (testar no navegador)
2. **Exemplo de requisição SOAP** (XML)
3. **Exemplo de resposta** (XML ou JSON)
4. **Nome exato da tabela** consultada
5. **Mensagem de erro completa**

### Logs úteis:

```javascript
// Ativar debug no .env
DEBUG_MODE=true

// Verificar logs do servidor
[TABELA] Cliente SOAP inicializado
[TABELA] Endpoint configurado: [URL]
[TABELA] Consultando tabela: TipoDocumento
```

---

**Versão:** 1.0
**Data:** 2025-01-13
**Implementado em:** `backend/services/tabelaClient.js`
