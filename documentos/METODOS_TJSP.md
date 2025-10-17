# 📋 Métodos Reais do WSDL - TJSP

## 🎯 Descoberta Importante

O WSDL do TJSP **NÃO usa os nomes padrão** esperados. Os métodos reais são:

### ✅ Métodos Disponíveis

```javascript
consultarDados / consultarDadosAsync        // Consultar dados de uma tabela
listarEstrutura / listarEstruturaAsync      // Ver estrutura de uma tabela
listarTabelas / listarTabelasAsync          // Listar nomes das tabelas
```

### ❌ Métodos que NÃO existem

```javascript
consultarTabela / consultarTabelaAsync      // NÃO EXISTE!
```

---

## 🔧 Correção Aplicada

O código agora usa **`consultarDadosAsync`** como método principal:

```javascript
// Prioridade 1: Nome real do TJSP
if (typeof this.client.consultarDadosAsync === 'function') {
    [result] = await this.client.consultarDadosAsync(args);
}
```

---

## 📊 Mapeamento de Métodos

| Função | Nome Esperado | Nome Real (TJSP) |
|--------|---------------|------------------|
| Consultar tabela | `consultarTabela` | **`consultarDados`** |
| Listar tabelas | `listarTabelas` | **`listarTabelas`** ✅ |
| Ver estrutura | - | **`listarEstrutura`** |

---

## 🚀 Como Testar Agora

### Passo 1: Reiniciar servidor

```bash
# Ctrl+C para parar
cd backend
npm start
```

### Passo 2: Carregar tipos de documento

1. Acesse: `http://localhost:3000`
2. Vá para "Peticionamento"
3. Clique em **"🔄 Carregar"**

### Passo 3: Verificar sucesso

Deve aparecer:
```
✓ 150 tipos carregados
```

---

## 📝 Uso dos Métodos

### consultarDados (consultarDadosAsync)

**Parâmetros:**
```javascript
{
    nomeTabela: "TipoDocumento"  // ou outra tabela
}
```

**Retorno esperado:**
```javascript
{
    registros: [
        { codigo: "123", descricao: "Petição Inicial", ativo: "S" },
        { codigo: "456", descricao: "Contestação", ativo: "S" }
    ]
}
```

### listarTabelas (listarTabelasAsync)

**Parâmetros:**
```javascript
{}  // Sem parâmetros
```

**Retorno esperado:**
```javascript
[
    "TipoDocumento",
    "ClasseProcessual",
    "AssuntoProcessual",
    ...
]
```

### listarEstrutura (listarEstruturaAsync)

**Parâmetros:**
```javascript
{
    nomeTabela: "TipoDocumento"
}
```

**Retorno esperado:**
```javascript
{
    campos: [
        { nome: "codigo", tipo: "string" },
        { nome: "descricao", tipo: "string" },
        { nome: "ativo", tipo: "boolean" }
    ]
}
```

---

## 🎓 Lições Aprendidas

### 1. Sempre listar métodos primeiro

```javascript
console.log('Métodos:', Object.keys(client).filter(k => typeof client[k] === 'function'));
```

### 2. Cada tribunal pode ter nomes diferentes

| Tribunal | Método para Consultar Tabela |
|----------|------------------------------|
| TJSP | `consultarDados` |
| TJSC | `consultarTabela` (?) |
| TJMG | `buscarTabela` (?) |

### 3. Implementar fallback é essencial

```javascript
if (typeof client.consultarDadosAsync === 'function') {
    // TJSP
}
else if (typeof client.consultarTabelaAsync === 'function') {
    // Outros tribunais
}
```

---

## 🔍 Como Descobrir Métodos de Outros Tribunais

### Método 1: Via código (já implementado)

O código agora lista automaticamente os métodos disponíveis quando não encontra o esperado.

### Método 2: Via SoapUI

1. Importar WSDL
2. Ver árvore de métodos
3. Testar cada um

### Método 3: Via browser (ver WSDL)

```xml
<wsdl:operation name="consultarDados">
  <wsdl:input message="tns:consultarDadosRequest"/>
  <wsdl:output message="tns:consultarDadosResponse"/>
</wsdl:operation>
```

---

## 📞 Para Dar Suporte

Quando orientar entes sobre qual método usar:

### Se for TJSP:
```
"Use o método consultarDados, não consultarTabela"
```

### Se for outro tribunal:
```
"Primeiro liste os métodos disponíveis no WSDL"
"Procure por: consultar*, buscar*, listar*"
```

### Exemplo de código genérico:

```javascript
// Listar métodos
const methods = Object.keys(client)
    .filter(k => typeof client[k] === 'function')
    .filter(k => k.includes('tabela') || k.includes('consultar'));

console.log('Métodos possíveis:', methods);
```

---

## ✅ Status Atual

- ✅ Código corrigido para usar `consultarDadosAsync`
- ✅ Fallback para `consultarTabelaAsync` (outros tribunais)
- ✅ Método `listarTabelas` implementado
- ✅ Logs detalhados para debug
- ⏳ Aguardando teste do usuário

---

**Versão:** 1.1
**Data:** 2025-01-13
**Descoberta:** Métodos reais do WSDL do TJSP
**Arquivo:** `backend/services/tabelaClient.js`
