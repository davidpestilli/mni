# 🔧 Correção: Erro "Non-whitespace before first tag" - MNI 3.0

## 📋 Data: 02/11/2025

## ❌ Problema Identificado:

Ao fazer peticionamento inicial com MNI 3.0, ocorria erro:
```
Non-whitespace before first tag.
Line: 1
Column: 1
Char: -
```

## 🔍 Causa Raiz:

O servidor MNI retorna a resposta em formato **MTOM (Message Transmission Optimization Mechanism)**, que é um formato multipart contendo:

1. **Parte 1:** XML SOAP com a resposta
2. **Parte 2:** Dados binários (PDF do comprovante de protocolo)

**Estrutura da resposta MTOM:**
```
------=_Part_0_123456789.123456789
Content-Type: application/xop+xml; charset=UTF-8; type="application/soap+xml"

<SOAP-ENV:Envelope>
  <SOAP-ENV:Body>
    <ns3:respostaEntregarPeticaoInicial>
      ...
    </ns3:respostaEntregarPeticaoInicial>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>

------=_Part_0_123456789.123456789
Content-Type: application/pdf
Content-ID: <urn:uuid:xxx-xxx-xxx>

%PDF-1.4
...dados binários do PDF...
%%EOF

------=_Part_0_123456789.123456789--
```

O parser XML estava tentando parsear **toda a resposta** (incluindo o PDF binário), causando o erro.

---

## ✅ Solução Implementada:

### Arquivo: `backend/services/mni3Client.js`

Adicionada lógica para **extrair apenas a parte XML** da resposta MTOM antes de fazer o parse:

```javascript
// ⚠️ CORREÇÃO: Resposta pode vir em formato MTOM (multipart com PDF anexado)
// Precisamos extrair apenas a parte XML (SOAP Envelope)
let xmlPart = responseXML;

// Se a resposta contém boundary (MTOM), extrair apenas o XML
if (responseXML.includes('Content-Type: application/xop+xml') || 
    responseXML.includes('boundary=')) {
    console.log('[MNI 3.0] Resposta MTOM detectada, extraindo XML...');
    
    // Encontrar o início do XML
    const xmlStartPatterns = ['<?xml', '<SOAP-ENV:', '<env:Envelope', '<soap:Envelope', '<soapenv:Envelope'];
    let xmlStartIndex = -1;
    
    for (const pattern of xmlStartPatterns) {
        xmlStartIndex = responseXML.indexOf(pattern);
        if (xmlStartIndex !== -1) {
            break;
        }
    }
    
    // Encontrar o fim do XML
    const xmlEndPatterns = ['</SOAP-ENV:Envelope>', '</env:Envelope>', '</soap:Envelope>', '</soapenv:Envelope>'];
    let xmlEndIndex = -1;
    
    for (const pattern of xmlEndPatterns) {
        const idx = responseXML.indexOf(pattern, xmlStartIndex);
        if (idx !== -1) {
            xmlEndIndex = idx + pattern.length;
            break;
        }
    }
    
    // Extrair apenas a parte XML
    xmlPart = responseXML.substring(xmlStartIndex, xmlEndIndex);
}

// Parsear resposta XML (agora sem dados binários)
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] });
const parsedResponse = await parser.parseStringPromise(xmlPart);
```

---

## 🎯 Como Funciona:

1. **Detecta resposta MTOM:** Verifica se a resposta contém `boundary=` ou `Content-Type: application/xop+xml`
2. **Busca início do XML:** Procura por padrões como `<?xml`, `<SOAP-ENV:`, `<env:Envelope>`, etc.
3. **Busca fim do XML:** Procura por `</SOAP-ENV:Envelope>`, `</env:Envelope>`, etc.
4. **Extrai XML puro:** `substring(xmlStartIndex, xmlEndIndex)`
5. **Parse XML:** Usa `xml2js` para converter XML em objeto JavaScript

---

## 📊 Logs Adicionados:

Para facilitar debugging, foram adicionados logs detalhados:

```javascript
console.log('[MNI 3.0] RESPOSTA BRUTA (primeiros 500 chars):');
console.log(responseXML.substring(0, 500));

console.log('[MNI 3.0] Resposta MTOM detectada, extraindo XML...');
console.log(`[MNI 3.0] XML encontrado no índice ${xmlStartIndex} com padrão: ${pattern}`);
console.log(`[MNI 3.0] Fim do XML encontrado no índice ${xmlEndIndex} com padrão: ${pattern}`);

console.log('[MNI 3.0] ✅ XML extraído com sucesso');
console.log('[MNI 3.0] XML extraído (primeiros 500 chars):');
console.log(xmlPart.substring(0, 500));
```

---

## ⚠️ Tratamento de Erros:

Se não conseguir encontrar o XML na resposta:

```javascript
if (xmlStartIndex === -1) {
    console.error('[MNI 3.0] ❌ Não foi possível encontrar o início do XML na resposta!');
    throw new Error('Resposta inválida: XML não encontrado na resposta MTOM');
}

if (xmlEndIndex === -1) {
    console.error('[MNI 3.0] ❌ Não foi possível encontrar o fim do XML na resposta!');
    throw new Error('Resposta inválida: fim do XML não encontrado na resposta MTOM');
}
```

---

## 🧪 Como Testar:

1. **Reinicie o servidor backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Abra o formulário de Peticionamento Inicial**

3. **Clique em "Preencher Dados de Teste"**

4. **Submeta a petição**

5. **Verifique os logs no servidor:**
   ```
   [MNI 3.0] RESPOSTA BRUTA (primeiros 500 chars): ...
   [MNI 3.0] Resposta MTOM detectada, extraindo XML...
   [MNI 3.0] XML encontrado no índice 123 com padrão: <SOAP-ENV:
   [MNI 3.0] Fim do XML encontrado no índice 5678 com padrão: </SOAP-ENV:Envelope>
   [MNI 3.0] ✅ XML extraído com sucesso
   [MNI 3.0] PETICIONAMENTO REALIZADO COM SUCESSO!
   [MNI 3.0] Número do Processo: 60003376820258260014
   ```

---

## 📚 Referências Técnicas:

- **MTOM (Message Transmission Optimization Mechanism):** Padrão W3C para otimizar transmissão de dados binários em SOAP
- **XOP (XML-binary Optimized Packaging):** Padrão para representar dados binários em XML
- **Multipart/Related:** Formato MIME usado para encapsular XML + binários

### Links:
- https://www.w3.org/TR/soap12-mtom/
- https://www.w3.org/TR/xop10/

---

## ✅ Status:

- [x] Erro identificado (parse de dados binários junto com XML)
- [x] Solução implementada (extração de XML puro)
- [x] Logs detalhados adicionados
- [x] Tratamento de erros implementado
- [x] Suporte a múltiplos formatos de SOAP Envelope
- [x] Pronto para teste

---

**Desenvolvedor:** GitHub Copilot  
**Data:** 02/11/2025  
**Tipo:** Correção de Bug - Parse MTOM
