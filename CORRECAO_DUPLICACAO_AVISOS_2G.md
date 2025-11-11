# Correção: Duplicação de Avisos no Ambiente 2G (Civil 2ª Instância)

**Data:** 04/11/2025  
**Sistema:** MNI 3.0 - Civil 2ª Instância (2G_CIVIL)  
**Arquivo:** `backend/routes/avisos-v3.js`

---

## 🐛 Problema Identificado

Um mesmo aviso aparecia **duplicado** na interface:
- Uma vez na seção **"Aguardando Abertura de Prazo"**
- Outra vez na seção **"Prazos Abertos"**

### Exemplo do Log (pergunta.txt)

```xml
<ns1:idAviso>202511048000001</ns1:idAviso>
<ns1:numeroProcesso>40036623020258260000</ns1:numeroProcesso>
<ns1:tipoPrazo/>  <!-- VAZIO -->
<!-- Campo prazo nem existe no XML -->
```

**Resultado:** O aviso `202511048000001` aparecia em AMBAS as requisições:
- `GET /api/avisos-v3?status=aguardando`
- `GET /api/avisos-v3?status=abertos`

---

## 🔍 Causa Raiz

### 1. Comportamento do MNI 3.0
O MNI 3.0 do TJSP **ignora** parâmetros de filtragem enviados na requisição SOAP e sempre retorna **TODOS os avisos disponíveis**, independente do `status` solicitado.

### 2. Ausência de Filtragem no Backend
O backend recebia o parâmetro `status` (`aguardando` ou `abertos`) mas **não filtrava** os avisos após recebê-los do MNI 3.0:

```javascript
// ❌ ANTES - Sem filtragem
const avisosNormalizados = avisos.map(aviso => normalizarAvisoMNI3(aviso));

res.json({
    success: true,
    count: avisosNormalizados.length,
    data: avisosNormalizados  // ← Retorna TODOS os avisos
});
```

### 3. Campo `tipoPrazo` Vazio
Avisos que ainda **não têm prazo aberto** vêm com:
- `<ns1:tipoPrazo/>` vazio (tag presente mas sem valor)
- Campo `prazo` ausente ou vazio

Isso fazia com que o mesmo aviso fosse retornado em ambas as consultas.

---

## ✅ Solução Implementada

### 1. Filtragem Manual no Backend

Adicionado código para **filtrar os avisos** após recebê-los do MNI 3.0:

```javascript
// FILTRAR AVISOS BASEADO NO STATUS SOLICITADO
let avisosFiltrados = avisosNormalizados;

if (status === 'aguardando') {
    // Aguardando = NÃO tem prazo definido ainda
    avisosFiltrados = avisosNormalizados.filter(aviso => {
        const temPrazo = aviso.prazo && aviso.prazo !== 'null' && aviso.prazo !== '';
        const temTipoPrazo = aviso.tipoPrazo && aviso.tipoPrazo !== 'null' && aviso.tipoPrazo !== '';
        
        const aguardando = !temPrazo && !temTipoPrazo;
        
        if (aguardando) {
            console.log(`[AVISOS V3] ✓ Aviso ${aviso.idAviso} AGUARDANDO (sem prazo)`);
        }
        
        return aguardando;
    });
    
} else if (status === 'abertos') {
    // Aberto = TEM prazo definido
    avisosFiltrados = avisosNormalizados.filter(aviso => {
        const temPrazo = aviso.prazo && aviso.prazo !== 'null' && aviso.prazo !== '';
        const temTipoPrazo = aviso.tipoPrazo && aviso.tipoPrazo !== 'null' && aviso.tipoPrazo !== '';
        
        const aberto = temPrazo || temTipoPrazo;
        
        if (aberto) {
            console.log(`[AVISOS V3] ✓ Aviso ${aviso.idAviso} ABERTO (prazo: ${aviso.prazo}, tipo: ${aviso.tipoPrazo})`);
        }
        
        return aberto;
    });
}

console.log('[AVISOS V3] Status solicitado:', status);
console.log('[AVISOS V3] Total após filtrar por status:', avisosFiltrados.length);
```

### 2. Validação de Campos Vazios na Normalização

Melhorado o tratamento de campos `prazo` e `tipoPrazo` vazios:

```javascript
// ✅ DEPOIS - Com validação
if (aviso.prazo && String(aviso.prazo).trim() !== '' && aviso.prazo !== null) {
    avisoNormalizado.prazo = String(aviso.prazo);
}

if (aviso.tipoPrazo && String(aviso.tipoPrazo).trim() !== '' && aviso.tipoPrazo !== null) {
    avisoNormalizado.tipoPrazo = aviso.tipoPrazo;
}
```

### 3. Logs Detalhados

Adicionados logs para debug:
- Status solicitado (`aguardando`, `abertos`, `todos`)
- Avisos filtrados com detalhes (ID, prazo, tipo)
- Total antes e depois da filtragem

---

## 📊 Resultado Esperado

### Antes da Correção ❌
```
GET /api/avisos-v3?status=aguardando
→ Retorna: [aviso 202511048000001]  ← Sem prazo

GET /api/avisos-v3?status=abertos
→ Retorna: [aviso 202511048000001]  ← MESMO aviso, erro!
```

### Depois da Correção ✅
```
GET /api/avisos-v3?status=aguardando
→ Retorna: [aviso 202511048000001]  ← Sem prazo ✓

GET /api/avisos-v3?status=abertos
→ Retorna: []  ← Lista vazia, correto! ✓
```

---

## 🧪 Como Testar

1. **Faça logout** do sistema
2. **Limpe o cache** do navegador (Ctrl+Shift+Delete)
3. **Faça login** no ambiente **Civil 2ª Instância (2G_CIVIL)**
4. Verifique que:
   - Avisos **sem prazo** aparecem apenas em "Aguardando Abertura"
   - Avisos **com prazo** aparecem apenas em "Prazos Abertos"
   - **Nenhum aviso está duplicado**

### Logs Esperados (Backend)

```
[AVISOS V3] Status solicitado: aguardando
[AVISOS V3] ✓ Aviso 202511048000001 AGUARDANDO (sem prazo)
[AVISOS V3] Total após filtrar por status: 1

[AVISOS V3] Status solicitado: abertos
[AVISOS V3] Total após filtrar por status: 0
```

---

## 📝 Observações Importantes

### Diferença entre MNI 2.2 e MNI 3.0

| Aspecto | MNI 2.2 (1G_CIVIL) | MNI 3.0 (2G_CIVIL, 1G_EXEC_FISCAL) |
|---------|-------------------|-----------------------------------|
| **Filtragem Server-Side** | ✅ Respeita parâmetros | ❌ Ignora, retorna tudo |
| **Solução** | Backend repassa direto | Backend filtra manualmente |
| **Campo Prazo** | Sempre preenchido | Pode vir vazio (`<tipoPrazo/>`) |

### Quando Usar Cada Status

- **`status=aguardando`**: Avisos que ainda não tiveram o prazo aberto pelo cartório
- **`status=abertos`**: Avisos com prazo já disponível para contagem
- **`status=todos`**: Retorna todos os avisos sem filtro (útil para debug)

---

## 🔗 Arquivos Modificados

- ✅ `backend/routes/avisos-v3.js` - Adicionada filtragem manual e validação de campos vazios
- 📄 `pergunta.txt` - Contém o log que evidenciou o problema

---

## 📚 Referências

- **Documentação MNI 3.0**: `documentos/MIGRACAO_MNI_3.0.md`
- **Guia de Tabelas**: `documentos/GUIA_TABELAS_TRIBUNAL.md`
- **Implementação 2G**: `IMPLEMENTACAO_CIVIL_2G.md`
