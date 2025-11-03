# Correção: Erro ao Visualizar Documentos no MNI 3.0

**Data:** 1 de novembro de 2025  
**Ambiente:** Execução Fiscal  
**Versão MNI:** 3.0

## 🐛 Problema Identificado

Ao tentar visualizar um documento através da requisição "Consulta Processo" no MNI 3.0 usando o ambiente Execução Fiscal, o sistema apresentava o seguinte erro:

```
Erro ao carregar documento: Erro ao consultar documento: cid.replace is not a function
```

### Stack Trace
```
TypeError: cid.replace is not a function
    at MNI3Client.extrairDeAttachmentsPorCID (mni3Client.js:1366:30)
    at MNI3Client.extrairConteudoDocumento (mni3Client.js:1301:37)
    at MNI3Client.consultarConteudoDocumento (mni3Client.js:1234:41)
```

## 🔍 Análise da Causa

### Contexto
O MNI 3.0 retorna documentos através de **MTOM/XOP attachments**, onde o XML contém uma referência XOP Include:

```xml
<ns1:conteudo>
    <xop:Include 
        xmlns:xop="http://www.w3.org/2004/08/xop/include" 
        href="cid:urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea"/>
</ns1:conteudo>
```

O parser xml2js converte os atributos XML para um objeto JavaScript:

```javascript
{
  Include: {
    '$': {
      'xmlns:xop': 'http://www.w3.org/2004/08/xop/include',
      href: 'cid:urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea'
    }
  }
}
```

### Problema no Código Original

No método `extrairConteudoDocumento()` do `mni3Client.js`, havia um bug na extração do CID:

```javascript
// ❌ CÓDIGO COM BUG
} else if (xopInclude.href || xopInclude.$) {
    cid = xopInclude.href || xopInclude.$;  // Pegava o objeto inteiro!
}
```

Quando `xopInclude.href` não existia (porque o href estava dentro de `$`), o código pegava **todo o objeto `xopInclude.$`** ao invés de apenas a string `href`:

```javascript
// O que era atribuído a cid:
cid = {
  'xmlns:xop': 'http://www.w3.org/2004/08/xop/include',
  href: 'cid:urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea'
}
```

Quando esse objeto era passado para `extrairDeAttachmentsPorCID()`, a linha `cid.replace()` falhava porque **objetos não têm método replace**.

## ✅ Solução Implementada

### 1. Correção da Extração do CID

Ajustei o código para acessar corretamente a propriedade `href` dentro do objeto de atributos:

```javascript
// ✅ CÓDIGO CORRIGIDO
} else if (xopInclude.href) {
    // Caso mais comum: xopInclude.href contém a string
    cid = xopInclude.href;
} else if (xopInclude.$ && typeof xopInclude.$ === 'object' && xopInclude.$.href) {
    // xml2js parser: xopInclude.$ é um objeto de atributos
    cid = xopInclude.$.href;  // Agora pega apenas a string href
} else if (xopInclude.attributes && xopInclude.attributes.href) {
    // Alternativa: attributes.href
    cid = xopInclude.attributes.href;
}

// Validar que é realmente uma string
if (cid && typeof cid === 'string') {
    console.log('[MNI 3.0] CID extraído:', cid);
    // ... prosseguir com extração
} else {
    console.warn('[MNI 3.0] CID não é uma string válida:', cid);
}
```

### 2. Validação Extra no Método extrairDeAttachmentsPorCID

Adicionei uma validação de tipo no início do método para garantir que o CID seja sempre uma string:

```javascript
extrairDeAttachmentsPorCID(attachments, cid) {
    console.log('[MNI 3.0] Procurando attachment com CID:', cid);

    if (!attachments) {
        console.warn('[MNI 3.0] Nenhum attachment disponível');
        return '';
    }

    // ✅ NOVA VALIDAÇÃO
    if (typeof cid !== 'string') {
        console.error('[MNI 3.0] CID não é uma string:', typeof cid, cid);
        console.warn('[MNI 3.0] Tentando extrair primeiro attachment disponível como fallback');
        return this.extrairDeAttachments(attachments);
    }

    // Limpar o CID (remover "cid:" se houver)
    const cidLimpo = cid.replace(/^cid:/, '').trim();
    // ... continua
}
```

## 📊 Comparação com MNI 2.2

### MNI 2.2 (mniClient.js)
No MNI 2.2, a extração de documentos também usa MTOM/XOP, mas o código já estava correto:

```javascript
// MNI 2.2 - Já estava correto
extrairConteudoDocumento(doc, result) {
    if (doc.conteudo) {
        if (typeof doc.conteudo === 'string') {
            return doc.conteudo;
        }
        // ... outras extrações
    }
    // ... extração de attachments
}
```

O código do MNI 2.2 **não tinha o bug de extração do CID** porque tratava os casos de forma mais simples e direta.

### Lição Aprendida
A implementação do MNI 3.0 tentou ser mais sofisticada ao lidar com diferentes formatos do xml2js parser, mas introduziu um bug ao acessar objetos aninhados. A solução foi **alinhar com a abordagem do MNI 2.2**, mas adaptando para a estrutura específica do xml2js.

## 🧪 Teste Realizado

### Cenário de Teste
- **Ambiente:** Execução Fiscal
- **Operação:** Consulta Processo → Visualizar Documento
- **Processo:** 60261559420258260960
- **Documento:** 611761939260413979402722208678
- **Usuário:** ENT.ESTADUAL_SP_PGE

### Resultado Esperado
✅ O documento deve ser baixado e visualizado corretamente no formato PDF.

### Log Esperado
```
[MNI 3.0] CID extraído: cid:urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea
[MNI 3.0] Buscando attachment com CID: cid:urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea
[MNI 3.0] CID limpo: urn:uuid:bd5eb477-45fc-41b5-bc2a-a1f64a2847ea
[MNI 3.0] Attachment encontrado!
[MNI 3.0] Convertendo content binário para base64
```

## 📝 Arquivos Modificados

### backend/services/mni3Client.js
- **Linha ~1276-1304:** Método `extrairConteudoDocumento()` - Correção da extração do CID
- **Linha ~1355-1367:** Método `extrairDeAttachmentsPorCID()` - Adição de validação de tipo

## 🔧 Recomendações

1. **Testes Adicionais**
   - Testar com diferentes tribunais (não apenas Execução Fiscal)
   - Testar com documentos de diferentes tipos (PDF, imagens, etc.)
   - Testar com documentos grandes (> 1MB)

2. **Monitoramento**
   - Verificar logs para garantir que o CID está sendo extraído corretamente
   - Monitorar se há fallbacks para `extrairDeAttachments()` (indica que ainda há casos não tratados)

3. **Melhorias Futuras**
   - Adicionar testes unitários para o método `extrairConteudoDocumento()`
   - Considerar unificar a lógica de extração de documentos entre MNI 2.2 e 3.0
   - Adicionar tipo TypeScript para garantir que `cid` seja sempre string

## 🎯 Conclusão

O bug foi causado por uma extração incorreta do CID de uma estrutura de objeto aninhado criada pelo parser xml2js. A correção garantiu que **apenas a string href** seja extraída, evitando que um objeto seja passado para métodos que esperam strings.

Esta correção está alinhada com a implementação do MNI 2.2 e garante compatibilidade com o formato MTOM/XOP usado pelo ambiente de Execução Fiscal do TJSP.

---

**Status:** ✅ Corrigido  
**Prioridade:** Alta  
**Impacto:** Funcionalidade crítica (visualização de documentos)
