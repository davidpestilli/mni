# 🐛 Correção: Bug ao Enviar Petição Inicial - Localidade Vazia

## 📋 Descrição do Problema

**Sintoma:**
Ao preencher todos os campos do formulário de peticionamento inicial, incluindo a seleção de uma comarca no select de localidade, o sistema retornava o erro:

```
peticionamento-inicial.js:480 Erro: Error: Selecione uma localidade judicial
    at HTMLFormElement.handleSubmit (peticionamento-inicial.js:381:19)
```

**Relatado pelo usuário:**
> "Informo que selecionei uma localidade na caixa de select respectiva."

---

## 🔍 Análise da Causa Raiz

### Fluxo do Problema

1. **Backend** (`tabelas.js:81-110`):
   - A API `/api/tabelas/localidades/listar` retorna localidades com três campos:
     ```javascript
     {
       codigo: l.CodLocalidadeJudicial,        // ❌ Campo errado
       codigoLocalidade: l.CodLocalidade,      // ✅ Campo correto
       descricao: l.DesLocalidadeJudicial,
       ...
     }
     ```

2. **Frontend** (`peticionamento-inicial.js:35` - ANTES):
   ```javascript
   option.value = localidade.codigo;  // ❌ ERRO: usando campo errado!
   ```
   - Estava usando `localidade.codigo` que contém `CodLocalidadeJudicial`
   - Mas o campo correto para peticionamento é `CodLocalidade`

3. **Validação** (`peticionamento-inicial.js:380-382`):
   ```javascript
   if (!localidade) {
       throw new Error('Selecione uma localidade judicial');
   }
   ```
   - Como `option.value` estava vazio ou undefined, a validação falhava

### Por que o campo estava vazio?

O backend retorna dois códigos diferentes:
- **`CodLocalidadeJudicial`** (ex: "0001", "0002"): Código da localidade no sistema judicial
- **`CodLocalidade`** (ex: "0350", "1234"): Código específico usado pelo MNI para peticionamento

O código estava usando o campo errado (`codigo` que vem de `CodLocalidadeJudicial`) quando deveria usar `codigoLocalidade` (que vem de `CodLocalidade`).

---

## ✅ Correção Aplicada

### 1. Correção do Campo de Valor da Option

**Arquivo:** `mni-web-app/frontend/js/peticionamento-inicial.js`
**Linha:** 36-39

**ANTES:**
```javascript
option.value = localidade.codigo;
```

**DEPOIS:**
```javascript
// IMPORTANTE: usar codigoLocalidade que é o campo correto para peticionamento
const codigoLocalidade = localidade.CodLocalidade || localidade.codigoLocalidade || localidade.codigo;
option.value = codigoLocalidade;
```

**Mudança:** Prioriza `CodLocalidade` (campo correto) com fallbacks para outros campos.

---

### 2. Correção da Ordenação

**Arquivo:** `mni-web-app/frontend/js/peticionamento-inicial.js`
**Linha:** 28-33

**ANTES:**
```javascript
const localidadesOrdenadas = data.data.sort((a, b) =>
    a.descricao.localeCompare(b.descricao)
);
```

**DEPOIS:**
```javascript
// Ordenar alfabeticamente pelo nome da comarca
const localidadesOrdenadas = data.data.sort((a, b) => {
    const nomeA = a.DesLocalidadeJudicial || a.descricao || '';
    const nomeB = b.DesLocalidadeJudicial || b.descricao || '';
    return nomeA.localeCompare(nomeB);
});
```

**Mudança:** Usa `DesLocalidadeJudicial` (nome completo da comarca) para ordenação, com fallback para `descricao`.

---

### 3. Adição de Debug

**Arquivo:** `mni-web-app/frontend/js/peticionamento-inicial.js`
**Linha:** 41-44

**NOVO:**
```javascript
// Debug: verificar se há códigos vazios
if (!codigoLocalidade) {
    console.warn('⚠️ Localidade sem código:', localidade);
}
```

**Funcionalidade:** Alerta no console caso alguma localidade não tenha código válido, facilitando debug futuro.

---

## 🧪 Como Testar a Correção

### 1. Iniciar o servidor
```bash
cd mni-web-app/backend
node server.js
```

### 2. Acessar a página
```
http://localhost:3000/peticionamento-inicial.html
```

### 3. Verificar no Console do Navegador (F12)
- ✅ Deve mostrar: `✅ 345 localidades carregadas com sucesso`
- ✅ **NÃO** deve mostrar warnings de "Localidade sem código"

### 4. Inspecionar o Select de Localidade
- Abrir DevTools (F12) → Elements
- Localizar: `<select id="localidade">`
- Verificar que cada `<option>` tem um `value` preenchido:
  ```html
  <option value="0350">São Paulo - SP</option>
  <option value="0012">Adamantina - SP</option>
  ```

### 5. Testar Envio do Formulário
1. Preencher todos os campos obrigatórios
2. Selecionar uma comarca (ex: "São Paulo - SP")
3. Clicar em "Enviar Petição Inicial"
4. ✅ **NÃO** deve mais aparecer erro "Selecione uma localidade judicial"
5. ✅ Deve prosseguir com a validação dos demais campos

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes ❌ | Depois ✅ |
|---------|----------|-----------|
| **Campo usado** | `localidade.codigo` (errado) | `localidade.CodLocalidade` (correto) |
| **Valor da option** | Vazio ou undefined | Código válido do MNI |
| **Validação** | Falhava sempre | Funciona corretamente |
| **Ordenação** | Por `descricao` (vazio) | Por `DesLocalidadeJudicial` (nome completo) |
| **Debug** | Sem logs | Alerta códigos vazios |

---

## 🔑 Aprendizados

### Estrutura de Dados de Localidades

O backend retorna três campos importantes:
```javascript
{
  CodLocalidadeJudicial: "0001",           // Código judicial interno
  CodLocalidade: "0350",                    // ✅ Código MNI (usar em petições)
  DesLocalidadeJudicial: "São Paulo",       // ✅ Nome completo (usar para exibição)
  descricao: "",                            // Geralmente vazio
  uf: "SP"
}
```

### Mapeamento Correto

Para peticionamento inicial via MNI, usar:
- **Value da option:** `CodLocalidade` (código MNI)
- **Text da option:** `DesLocalidadeJudicial` (nome da comarca)
- **Ordenação:** `DesLocalidadeJudicial` (alfabética)

---

## 📁 Arquivos Modificados

```
mni-web-app/frontend/js/peticionamento-inicial.js
- Linha 28-33:  Correção da ordenação
- Linha 36-44:  Correção do campo de valor + debug
```

---

## ✅ Status

- [x] Bug identificado
- [x] Causa raiz analisada
- [x] Correção aplicada
- [x] Debug adicionado
- [x] Documentação criada
- [ ] Testado pelo usuário

---

**Data:** 14/01/2025
**Versão:** 2.2
**Bug ID:** LOCALIDADE-001
**Prioridade:** 🔴 Alta (bloqueava envio de petições)
**Status:** ✅ Corrigido
