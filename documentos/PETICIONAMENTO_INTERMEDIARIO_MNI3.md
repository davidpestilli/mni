# Peticionamento Intermediário - MNI 3.0

**Data:** 1 de novembro de 2025  
**Ambiente:** Execução Fiscal (e outros ambientes MNI 3.0)  
**Versão MNI:** 3.0

## 📋 Visão Geral

Implementação da funcionalidade de **Peticionamento Intermediário** (manifestação em processo existente) utilizando o **MNI 3.0**. Esta funcionalidade complementa o peticionamento inicial já existente.

## 🔄 Diferenças entre MNI 2.2 e MNI 3.0

### MNI 2.2 (entregarManifestacaoProcessual)

```xml
<mni:entregarManifestacaoProcessual>
   <mni:idManifestante>ENT.ESTADUAL_SP_PGE</mni:idManifestante>
   <mni:senhaManifestante>hash-sha256-com-data</mni:senhaManifestante>
   <mni:numeroProcesso>60261559420258260960</mni:numeroProcesso>
   <mni:documento tipoDocumento="82400092" mimetype="application/pdf">
      <mni:conteudo>BASE64_DO_DOCUMENTO</mni:conteudo>
      <mni:outroParametro nome="NomeDocumentoUsuario" valor="Petição.pdf"/>
   </mni:documento>
</mni:entregarManifestacaoProcessual>
```

**Características:**
- Método: `entregarManifestacaoProcessual`
- Conteúdo: **Base64 direto** do documento
- Rota: `/api/peticionamento/intermediario`
- Namespace: `http://www.cnj.jus.br/servicos-dev/mni/v2`

### MNI 3.0 (entregarPeticao)

```xml
<v300:requisicaoEntregarPeticao>
   <tip:manifestante>
      <int:autenticacaoSimples>
         <int:usuario>ENT.ESTADUAL_SP_PGE</int:usuario>
         <int:senha>hash-sha256-com-data</int:senha>
      </int:autenticacaoSimples>
   </tip:manifestante>
   <tip:numeroProcesso>60261559420258260960</tip:numeroProcesso>
   <tip:documentos>
      <int:codigoTipoDocumento>82400092</int:codigoTipoDocumento>
      <int:conteudo>
         <int:mimetype>application/pdf</int:mimetype>
         <int:conteudo>SHA256_DO_DOCUMENTO</int:conteudo>
      </int:conteudo>
      <int:outroParametro nome="NomeDocumentoUsuario" valor="Petição.pdf"/>
   </tip:documentos>
</v300:requisicaoEntregarPeticao>
```

**Características:**
- Método: `entregarPeticao` (requisicaoEntregarPeticao)
- Conteúdo: **SHA-256 hexadecimal** do documento (não base64)
- Rota: `/api/mni3/peticao`
- Namespaces: `v300`, `tip`, `int` (estrutura mais complexa)
- Estrutura de autenticação aninhada

## 🔑 Diferenças Críticas

### 1. Formato do Conteúdo do Documento

**MNI 2.2:**
```javascript
// Envia base64 direto
conteudo: documentoBase64
```

**MNI 3.0:**
```javascript
// Calcula SHA-256 do documento
const documentoBuffer = Buffer.from(documentoBase64, 'base64');
const documentoSha256 = crypto.createHash('sha256').update(documentoBuffer).digest('hex');
conteudo: documentoSha256  // Hexadecimal em minúscula
```

### 2. Estrutura de Namespaces

**MNI 3.0** usa três namespaces diferentes:
- `v300`: http://www.cnj.jus.br/mni/v300/
- `tip`: http://www.cnj.jus.br/mni/v300/tipos-servico-intercomunicacao
- `int`: http://www.cnj.jus.br/mni/v300/intercomunicacao

### 3. Estrutura da Autenticação

**MNI 3.0** usa estrutura aninhada:
```xml
<tip:manifestante>
   <int:autenticacaoSimples>
      <int:usuario>...</int:usuario>
      <int:senha>...</int:senha>
   </int:autenticacaoSimples>
</tip:manifestante>
```

## 💻 Implementação

### Backend - Método no mni3Client.js

```javascript
async entregarPeticao(usuario, senha, numeroProcesso, peticao) {
    // 1. Gerar hash SHA-256 da senha (com data)
    const senhaHash = this.hashSenha(senha);
    
    // 2. Calcular SHA-256 do documento
    const documentoBuffer = Buffer.from(peticao.documento, 'base64');
    const documentoSha256 = crypto.createHash('sha256')
        .update(documentoBuffer)
        .digest('hex');
    
    // 3. Construir XML SOAP manualmente
    const soapXML = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope ...>
        <v300:requisicaoEntregarPeticao>
            <tip:manifestante>
                <int:autenticacaoSimples>
                    <int:usuario>${usuario}</int:usuario>
                    <int:senha>${senhaHash}</int:senha>
                </int:autenticacaoSimples>
            </tip:manifestante>
            <tip:numeroProcesso>${numeroProcesso}</tip:numeroProcesso>
            <tip:documentos>
                <int:codigoTipoDocumento>${peticao.codigoTipoDocumento}</int:codigoTipoDocumento>
                <int:conteudo>
                    <int:mimetype>${peticao.mimetype}</int:mimetype>
                    <int:conteudo>${documentoSha256}</int:conteudo>
                </int:conteudo>
                ...
            </tip:documentos>
        </v300:requisicaoEntregarPeticao>
    </soapenv:Envelope>`;
    
    // 4. Fazer requisição HTTPS manual
    // 5. Processar resposta MTOM (comprovante em attachment)
    // 6. Retornar resultado
}
```

**Por que requisição manual?**
- O `node-soap` não gera os namespaces corretos automaticamente
- Mesma estratégia usada em `consultarConteudoDocumento` (já testada e funcionando)

### Backend - Rota em mni3.js

```javascript
POST /api/mni3/peticao

Body:
{
  "numeroProcesso": "60261559420258260960",
  "codigoTipoDocumento": "82400092",
  "documento": "<base64-do-pdf>",
  "nomeDocumento": "Petição.pdf",
  "mimetype": "application/pdf",
  "descricaoDocumento": "Descrição opcional",
  "cpfProcurador": "37450364840"
}

Headers:
Authorization: Bearer <token-base64>
// O middleware extrai usuario e senha do token
```

## 📤 Resposta do Servidor

### Estrutura da Resposta (MNI 3.0)

```xml
<ns3:respostaEntregarPeticao>
   <ns2:recibo>
      <ns1:recibo>
         <ns1:sucesso>true</ns1:sucesso>
         <ns1:mensagens>
            <ns1:descritivo>Petição processada com sucesso.</ns1:descritivo>
            <ns1:codigo>0</ns1:codigo>
            <ns1:tipo>INFORMACAO</ns1:tipo>
         </ns1:mensagens>
      </ns1:recibo>
      <ns1:numeroProtocolo>611762051033008342594442403377</ns1:numeroProtocolo>
      <ns1:dataOperacao>2025-11-01T23:37:13-03:00</ns1:dataOperacao>
      <ns1:documentoComprovante>
         <xop:Include href="cid:urn:uuid:0793ea2d-e707-4b11-a464-ffbff5bfd84f"/>
      </ns1:documentoComprovante>
      <ns1:reciboDocumentos>
         <ns1:hashDocumento/>
         <ns1:dataRecebimento/>
         <ns1:numeroProcesso>60261559420258260960</ns1:numeroProcesso>
      </ns1:reciboDocumentos>
   </ns2:recibo>
</ns3:respostaEntregarPeticao>
```

### Campos Retornados

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `sucesso` | Indica se a petição foi aceita | `true` |
| `numeroProtocolo` | Número do protocolo gerado | `611762051033008342594442403377` |
| `dataOperacao` | Data/hora do protocolo | `2025-11-01T23:37:13-03:00` |
| `mensagem` | Mensagem descritiva | `"Petição processada com sucesso."` |
| `documentoComprovante` | Comprovante em PDF (XOP attachment) | Base64 do PDF |

### Extração do Comprovante

O comprovante vem como **XOP attachment** (multipart/related):

```javascript
// 1. Detectar resposta MTOM
if (contentType.includes('multipart/related')) {
    // 2. Extrair boundary e dividir partes
    // 3. Primeira parte = XML, demais = attachments
    // 4. Localizar attachment com CID do comprovante
    // 5. Converter para base64
}
```

## 🧪 Exemplo de Uso

### Requisição cURL

```bash
curl -X POST http://localhost:3000/api/mni3/peticao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-base64>" \
  -d '{
    "numeroProcesso": "60261559420258260960",
    "codigoTipoDocumento": "82400092",
    "documento": "JVBERi0xLjQKJe...",
    "nomeDocumento": "Petição.pdf",
    "mimetype": "application/pdf",
    "descricaoDocumento": "Manifestação sobre o processo",
    "cpfProcurador": "37450364840"
  }'
```

### Resposta de Sucesso

```json
{
  "success": true,
  "versao": "3.0",
  "message": "Petição processada com sucesso.",
  "data": {
    "numeroProtocolo": "611762051033008342594442403377",
    "dataOperacao": "2025-11-01T23:37:13-03:00",
    "documentoComprovante": "JVBERi0xLjQKJe..."
  }
}
```

### Resposta de Erro

```json
{
  "success": false,
  "versao": "3.0",
  "message": "Erro ao entregar petição: <descrição-do-erro>",
  "debug": {
    "xmlRequest": "<soapenv:Envelope>...</soapenv:Envelope>",
    "xmlResponse": "<SOAP-ENV:Envelope>...</SOAP-ENV:Envelope>"
  }
}
```

## 🔍 Parâmetros Opcionais

### CPF do Procurador

Quando fornecido, adiciona os seguintes parâmetros:

```xml
<int:parametros nome="identProcuradorRepresentacao" valor="37450364840"/>
<int:parametros nome="tipoIdentProcuradorRepresentacao" valor="CPF"/>
```

### Descrição do Documento

Adiciona observação/descrição:

```xml
<int:outroParametro nome="ObsDocumento" valor="Manifestação sobre..."/>
```

## 🛠️ Códigos de Tipo de Documento

Os códigos de tipo de documento são **específicos do tribunal**. Para o TJSP:

| Código | Descrição |
|--------|-----------|
| 82400092 | Petição (exemplo do Exec. Fiscal) |
| 13 | Petição genérica (MNI 2.2) |
| ... | Outros códigos específicos |

**Como obter os códigos:**
- MNI 2.2: `GET /api/tabelas?nomeTabela=TipoDocumento`
- MNI 3.0: Ainda precisa ser implementada consulta específica

## 📊 Comparação de Rotas

| Aspecto | MNI 2.2 | MNI 3.0 |
|---------|---------|---------|
| **Rota** | `/api/peticionamento/intermediario` | `/api/mni3/peticao` |
| **Método SOAP** | `entregarManifestacaoProcessual` | `entregarPeticao` |
| **Conteúdo** | Base64 direto | SHA-256 hex |
| **Autenticação** | Campos diretos | Estrutura aninhada |
| **Comprovante** | Inline no XML | XOP attachment |
| **Ambiente** | Todos (legado) | Execução Fiscal (novo) |

## 🔐 Segurança

### Hash da Senha

Ambas as versões usam o mesmo formato:
```javascript
// Formato: DD-MM-YYYYSenha → SHA-256 → minúscula
const data = moment().format('DD-MM-YYYY');
const senhaComData = `${data}${senha}`;
const hash = crypto.createHash('sha256')
    .update(senhaComData)
    .digest('hex')
    .toLowerCase();
```

### Hash do Documento (MNI 3.0)

```javascript
// Converter base64 → Buffer → SHA-256 → hex minúscula
const buffer = Buffer.from(base64, 'base64');
const hash = crypto.createHash('sha256')
    .update(buffer)
    .digest('hex');
```

**Importante:** O servidor MNI 3.0 usa o SHA-256 para:
1. Validar integridade do documento
2. Evitar transmissão de documentos grandes no XML
3. Documento real é enviado em canal seguro separado (não implementado nesta fase)

## 🚀 Integração Frontend

### Peticionamento Intermediário (MNI 3.0)

```javascript
async function entregarPeticaoMNI3(dados) {
    const token = btoa(`${usuario}:${senha}`);
    
    const response = await fetch('/api/mni3/peticao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            numeroProcesso: dados.numeroProcesso,
            codigoTipoDocumento: dados.tipoDocumento,
            documento: dados.arquivoBase64,
            nomeDocumento: dados.nomeArquivo,
            mimetype: 'application/pdf',
            descricaoDocumento: dados.descricao,
            cpfProcurador: dados.cpfProcurador
        })
    });
    
    const resultado = await response.json();
    
    if (resultado.success) {
        console.log('Protocolo:', resultado.data.numeroProtocolo);
        // Baixar comprovante se disponível
        if (resultado.data.documentoComprovante) {
            baixarComprovante(resultado.data.documentoComprovante);
        }
    }
}
```

## 📝 Logs de Debug

O sistema gera logs detalhados para debug:

```
[MNI 3.0] ========================================
[MNI 3.0] Entregando petição (Peticionamento Intermediário)
[MNI 3.0] Processo: 60261559420258260960
[MNI 3.0] Tipo documento: 82400092
[MNI 3.0] Usuario: ENT.ESTADUAL_SP_PGE
[MNI 3.0] Tamanho do documento (base64): 156382
[MNI 3.0] Tamanho do documento (bytes): 117286
[MNI 3.0] SHA-256 do documento: f96d3fbbda86a645f00667a4417811a87971f7093245212ecc12c5d68bbe4a4e
[MNI 3.0] XML SOAP Manual (entregarPeticao):
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope ...>
[MNI 3.0] Content-Type da resposta: multipart/related
[MNI 3.0] Resposta é MTOM (multipart/related), processando...
[MNI 3.0] Attachment encontrado (comprovante) - CID: urn:uuid:...
[MNI 3.0] Petição entregue com sucesso!
[MNI 3.0] Número do protocolo: 611762051033008342594442403377
[MNI 3.0] ========================================
```

## 🎯 Próximos Passos

1. **Frontend:**
   - Adicionar interface para peticionamento intermediário MNI 3.0
   - Selecionar entre MNI 2.2 e 3.0 baseado no ambiente
   - Exibir comprovante de protocolo

2. **Backend:**
   - Implementar consulta de tipos de documento no MNI 3.0
   - Adicionar validação de tipos de documento por ambiente
   - Cache de tipos de documento

3. **Testes:**
   - Testar com diferentes tipos de documento
   - Testar com documentos grandes (> 5MB)
   - Testar em diferentes ambientes (não apenas Exec. Fiscal)

## 🔄 Migração de MNI 2.2 para 3.0

Para migrar código existente:

```javascript
// Antes (MNI 2.2)
await mniClient.entregarManifestacao(usuario, senha, processo, {
    tipoDocumento: '13',
    documento: base64,
    nomeDocumento: 'doc.pdf',
    mimetype: 'application/pdf'
});

// Depois (MNI 3.0)
await mni3Client.entregarPeticao(usuario, senha, processo, {
    codigoTipoDocumento: '82400092',
    documento: base64,  // Convertido automaticamente para SHA-256
    nomeDocumento: 'doc.pdf',
    mimetype: 'application/pdf'
});
```

## ⚠️ Observações Importantes

1. **Códigos de Tipo de Documento:**
   - São diferentes entre tribunais e ambientes
   - Verificar documentação específica de cada ambiente
   - TJSP Exec. Fiscal usa códigos diferentes do MNI 2.2 genérico

2. **SHA-256 do Documento:**
   - Calculado automaticamente pelo backend
   - Frontend continua enviando base64
   - Conversão transparente

3. **Comprovante de Protocolo:**
   - Vem como attachment MTOM
   - Pode não estar presente em todos os ambientes
   - Verificar disponibilidade antes de usar

4. **Ambientes:**
   - Testar cada ambiente separadamente
   - Cada tribunal pode ter particularidades
   - Logs ajudam a identificar diferenças

---

**Status:** ✅ Implementado  
**Testado:** Pendente (aguardando teste real)  
**Compatibilidade:** MNI 3.0 (Execução Fiscal TJSP)
