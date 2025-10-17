# 🔧 Erro: "consultarTabelaAsync is not a function"

## 🎯 O que Aconteceu?

O erro `this.client.consultarTabelaAsync is not a function` significa que:

✅ O cliente SOAP foi **inicializado com sucesso**
✅ O WSDL foi **carregado corretamente**
❌ Mas o **método específico não existe** com esse nome

---

## 🔍 Causa do Problema

O WSDL do tribunal pode:
1. Usar um **nome diferente** para o método
2. **Não expor** o método `consultarTabela`
3. Ter uma **estrutura diferente** do esperado

---

## ✅ Solução Aplicada

Modifiquei o código para tentar **4 estratégias** diferentes:

### 1. Versão Async (preferida)
```javascript
if (typeof this.client.consultarTabelaAsync === 'function') {
    [result] = await this.client.consultarTabelaAsync(args);
}
```

### 2. Versão com Callback
```javascript
else if (typeof this.client.consultarTabela === 'function') {
    result = await new Promise((resolve, reject) => {
        this.client.consultarTabela(args, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}
```

### 3. Nomes Alternativos (plural)
```javascript
else if (typeof this.client.consultarTabelasAsync === 'function') {
    [result] = await this.client.consultarTabelasAsync(args);
}
```

### 4. Lista de Métodos Disponíveis
```javascript
else {
    const availableMethods = Object.keys(this.client)
        .filter(k => typeof this.client[k] === 'function');
    console.error('[TABELA] Métodos disponíveis:', availableMethods);
}
```

---

## 🚀 Como Testar Agora

### Passo 1: Reiniciar o servidor

```bash
# Parar (Ctrl+C)
cd backend
npm start
```

### Passo 2: Tentar carregar novamente

1. Acesse: `http://localhost:3000`
2. Vá para "Peticionamento"
3. Clique em **"🔄 Carregar"**

### Passo 3: Verificar os logs

No terminal do servidor, você verá:

```
[TABELA] Cliente SOAP inicializado
[TABELA] Endpoint configurado: ...
[TABELA] Métodos disponíveis: [lista de métodos]
[TABELA] Consultando tabela: TipoDocumento
```

**Importante:** Preste atenção na lista de **"Métodos disponíveis"**

---

## 📊 Possíveis Resultados

### ✅ Caso 1: Funcionou!

```
[TABELA] Consultando tabela: TipoDocumento
✓ 150 tipos carregados
```

### ⚠️ Caso 2: Método tem nome diferente

```
[TABELA] Métodos disponíveis: ['buscarTabela', 'listarTabela', ...]
```

**Solução:** Me informe o nome correto e vou ajustar o código.

### ❌ Caso 3: Método não existe no WSDL

```
[TABELA] Métodos disponíveis: ['consultarProcesso', 'entregarManifestacao']
```

**Significa:** Esse tribunal não expõe o serviço de consulta de tabelas via SOAP.

**Alternativa:** Pode existir uma API REST ou outro método de consulta.

---

## 🛠️ Diagnóstico Manual

### Opção 1: Pelo Browser

Abra o WSDL no navegador:
```
https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl
```

Procure por:
```xml
<wsdl:operation name="consultarTabela">
  <!-- ou -->
<wsdl:operation name="buscarTabela">
  <!-- ou -->
<wsdl:operation name="listarTabela">
```

### Opção 2: Pelo SoapUI

1. **File → New SOAP Project**
2. **WSDL URL:** `https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl`
3. Verificar **métodos disponíveis** na árvore

### Opção 3: Via Node.js (console)

```javascript
const soap = require('soap');

const wsdl = 'https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela.wsdl';

soap.createClient(wsdl, (err, client) => {
    if (err) {
        console.error('Erro:', err);
    } else {
        console.log('Métodos:', Object.keys(client));
        console.log('Descrição:', client.describe());
    }
});
```

---

## 📝 Estruturas Comuns

### Padrão 1: consultarTabela (singular)
```xml
<operation name="consultarTabela">
    <input message="consultarTabelaRequest"/>
    <output message="consultarTabelaResponse"/>
</operation>
```

### Padrão 2: consultarTabelas (plural)
```xml
<operation name="consultarTabelas">
    <input message="consultarTabelasRequest"/>
    <output message="consultarTabelasResponse"/>
</operation>
```

### Padrão 3: buscar/listar
```xml
<operation name="buscarTabela">
<operation name="listarTabela">
<operation name="obterTabela">
```

---

## 🔄 Se Ainda Não Funcionar

### 1. Capture os métodos disponíveis

No terminal, quando aparecer:
```
[TABELA] Métodos disponíveis: [array de métodos]
```

Copie essa lista e me envie.

### 2. Verifique se o serviço existe

Teste o WSDL no navegador:
- ✅ Se abrir XML: WSDL existe
- ❌ Se erro 404: WSDL não existe nesse caminho

### 3. Confirme com o tribunal

Pergunte à equipe técnica:
- "Vocês disponibilizam serviço de consulta de tabelas via SOAP?"
- "Qual é o WSDL correto para consultar tabelas?"
- "Qual é o nome do método no WSDL?"

---

## 💡 Soluções Alternativas

### Se o SOAP não funcionar:

#### Opção 1: API REST

Alguns tribunais expõem tabelas via REST:
```
GET https://eproc.tjsp.jus.br/api/tabelas/tipos-documento
```

#### Opção 2: Exportação manual

Peça ao tribunal para exportar as tabelas:
- Excel/CSV com código + descrição
- JSON com a lista completa
- Documentação PDF

#### Opção 3: Web scraping (último caso)

Se nenhuma API existir, pode ser necessário:
- Acessar interface web
- Extrair dados da página
- **⚠️ Verificar legalidade e permissão**

---

## 🎓 Aprendizado

### Por que isso acontece?

1. **Cada tribunal é independente**: Podem customizar serviços
2. **WSDL não é padronizado 100%**: CNJ define modelo, mas implementação varia
3. **Bibliotecas SOAP têm limitações**: Nem sempre geram métodos Async

### Como evitar no futuro?

1. **Sempre listar métodos** antes de usar
2. **Ter fallback** para nomes alternativos
3. **Documentar** estrutura de cada tribunal
4. **Testar no SoapUI** antes de implementar

---

## 📞 Próximos Passos

1. **Reinicie o servidor** com o código corrigido
2. **Tente carregar** novamente
3. **Verifique os logs** para ver os métodos disponíveis
4. **Me informe o resultado**:
   - ✅ Funcionou
   - ⚠️ Método tem nome diferente: [nome]
   - ❌ Serviço não existe

---

## 🆘 Para Reportar o Problema

Se ainda não funcionar, me envie:

```
1. Lista de métodos disponíveis (do log)
2. URL do WSDL
3. Mensagem de erro completa
4. (Opcional) XML do WSDL
```

---

**Versão:** 1.0
**Data:** 2025-01-13
**Arquivo corrigido:** `backend/services/tabelaClient.js`
