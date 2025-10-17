# 🔧 Correções: Assunto não localizado e Estrutura SOAP

## 📋 Problema Reportado

**Erro:**
```
Erro ao enviar petição: Assunto 2190302 não localizado [Identificador: kMtt5JkBOzdgV_oGjpeg]
```

**Solicitação do Usuário:**
> "Veja esse request de peticionamento inicial e veja como o assunto está configurado nele e verifique se está fazendo correto. Aproveite e verifique outros detalhes também."

---

## 🔍 Análise Comparativa: SOAP Exemplo vs Código

### 1. Estrutura `dadosBasicos`

**✅ CORRETO - Atributos de dadosBasicos**

**SOAP Exemplo:**
```xml
<tip:dadosBasicos
    competencia="114"
    classeProcessual="7"
    codigoLocalidade="0960"
    nivelSigilo="0">
```

**Código Atual (mniClient.js:267-273):**
```javascript
const dadosBasicos = {
    attributes: {
        codigoLocalidade: dadosIniciais.codigoLocalidade,  // ✅
        classeProcessual: dadosIniciais.classeProcessual,   // ✅
        nivelSigilo: dadosIniciais.nivelSigilo || 0,        // ✅
        competencia: dadosIniciais.competencia              // ✅ (se fornecida)
    }
};
```

**Status:** ✅ Correto - todos os atributos estão sendo enviados corretamente

---

### 2. Estrutura `polo` (partes)

**✅ CORRETO - Pessoa Física**

**SOAP Exemplo:**
```xml
<int:polo polo="AT">
    <int:parte>
        <int:pessoa
            nome="Nicholas Ferreira de Souza Melo"
            sexo="Masculino"
            dataNascimento="09/07/1997"
            numeroDocumentoPrincipal="49204304855"
            tipoPessoa="fisica">
        </int:pessoa>
    </int:parte>
</int:polo>
```

**Código Atual (mniClient.js:411-424):**
```javascript
polo.parte.pessoa.attributes = {
    nome: parte.nome,                               // ✅
    sexo: parte.sexo || 'Masculino',               // ✅
    dataNascimento: parte.dataNascimento,           // ✅
    numeroDocumentoPrincipal: parte.cpf,            // ✅
    tipoPessoa: 'fisica'                            // ✅
};
```

**Status:** ✅ Correto - estrutura de pessoa está correta

---

### 3. Estrutura `assunto`

**✅ CORRETO - Formato do Assunto**

**SOAP Exemplo:**
```xml
<int:assunto principal="true">
    <int:codigoNacional>4907</int:codigoNacional>
</int:assunto>
```

**Código Atual (mniClient.js:297-308):**
```javascript
if (dadosIniciais.assunto) {
    if (this.config.debugMode) {
        console.log('[MNI] Código do assunto:', dadosIniciais.assunto);  // 🆕 Debug adicionado
    }

    dadosBasicos.assunto = {
        attributes: {
            principal: true                          // ✅
        },
        codigoNacional: dadosIniciais.assunto       // ✅
    };
}
```

**Status:** ✅ Correto - estrutura do assunto está correta

---

### 4. Estrutura `documento`

**❌ CORREÇÃO APLICADA - Faltava atributo `tipoDocumentoLocal`**

**SOAP Exemplo:**
```xml
<tip:documento
    tipoDocumento="1"
    mimetype="application/pdf"
    nivelSigilo="0"
    tipoDocumentoLocal="1">  <!-- ⚠️ ESTE ATRIBUTO ESTAVA FALTANDO -->

    <int:conteudo>?</int:conteudo>

    <int:assinatura>
        <int:signatarioLogin identificador="68086018873"/>
    </int:assinatura>
</tip:documento>
```

**ANTES (INCORRETO):**
```javascript
attributes: {
    tipoDocumento: doc.tipoDocumento || 1,
    mimetype: doc.mimetype || 'application/pdf',
    nivelSigilo: doc.nivelSigilo || 0
    // ❌ FALTAVA: tipoDocumentoLocal
}
```

**DEPOIS (CORRIGIDO - linha 326-331):**
```javascript
attributes: {
    tipoDocumento: doc.tipoDocumento || 1,
    mimetype: doc.mimetype || 'application/pdf',
    nivelSigilo: doc.nivelSigilo || 0,
    tipoDocumentoLocal: doc.tipoDocumento || 1  // ✅ ADICIONADO
}
```

**Status:** ✅ Corrigido - atributo `tipoDocumentoLocal` adicionado

---

### 5. Estrutura `assinatura`

**✅ CORRETO - Formato da Assinatura**

**SOAP Exemplo:**
```xml
<int:assinatura>
    <int:signatarioLogin identificador="68086018873"/>
</int:assinatura>
```

**Código Atual (mniClient.js:342-349):**
```javascript
...(doc.signatario && {
    assinatura: {
        signatarioLogin: {
            attributes: {
                identificador: doc.signatario    // ✅
            }
        }
    }
})
```

**Status:** ✅ Correto - estrutura de assinatura está correta

---

## 🐛 Sobre o Erro "Assunto 2190302 não localizado"

### Possíveis Causas

1. **✅ Formato SOAP está correto** - Confirmado pela análise acima
2. **❓ Código do assunto pode ser inválido** - Verificar se "2190302" existe no TJSP
3. **❓ Assunto pode estar desativado** - Verificar flag `SinAtivo`
4. **❓ Assunto pode não ser lançável** - Verificar flag `SinAssuntoLancavel`

### Filtro Atual de Assuntos

**Frontend (peticionamento-inicial.js:138-139):**
```javascript
const assuntosLancaveis = data.data
    .filter(a => a.SinAssuntoLancavel === 'S' && a.SinAtivo === 'S')
```

**Status do Filtro:** ✅ Correto - filtra apenas assuntos ativos E lançáveis

### Por que o código "2190302" pode falhar?

**Possibilidades:**

1. **Assunto desativado recentemente**
   - O assunto pode ter sido desativado pelo TJSP após ser carregado na interface
   - Solução: Recarregar a página (F5) para atualizar a lista

2. **Código com formatação incorreta**
   - Verificar se não há espaços ou caracteres especiais
   - Verificar se não há zeros à esquerda sendo removidos

3. **Assunto não existe no sistema**
   - O código pode simplesmente não existir no TJSP
   - Testar com código do exemplo: **4907** (sabidamente válido)

---

## 🔬 Debug Adicionado

### Log de Código do Assunto

**Adicionado em mniClient.js:298-300:**
```javascript
if (this.config.debugMode) {
    console.log('[MNI] Código do assunto:', dadosIniciais.assunto, '(tipo:', typeof dadosIniciais.assunto, ')');
}
```

**O que mostra:**
- Código exato do assunto sendo enviado
- Tipo do dado (string/number)
- Permite identificar problemas de formatação

### Como Ativar Debug

**Arquivo:** `mni-web-app/backend/.env`

```env
MNI_DEBUG_MODE=true
```

**O que será exibido no console:**
```
[MNI] Iniciando Peticionamento Inicial
[MNI] Localidade: 0960
[MNI] Classe: 7
[MNI] Código do assunto: 2190302 (tipo: string)
[MNI] ===== SOAP REQUEST =====
[MNI] (XML completo da requisição SOAP)
[MNI] ==========================
[MNI] ===== SOAP RESPONSE =====
[MNI] (XML completo da resposta SOAP)
[MNI] Status: 200
[MNI] ===========================
```

---

## ✅ Correções Aplicadas - Resumo

| Item | Antes | Depois | Status |
|------|-------|--------|--------|
| **tipoDocumentoLocal** | ❌ Ausente | ✅ Presente | Corrigido |
| **Debug de assunto** | ❌ Sem log | ✅ Log detalhado | Adicionado |
| **Estrutura dadosBasicos** | ✅ Correto | ✅ Correto | Mantido |
| **Estrutura polo/pessoa** | ✅ Correto | ✅ Correto | Mantido |
| **Estrutura assunto** | ✅ Correto | ✅ Correto | Mantido |
| **Estrutura assinatura** | ✅ Correto | ✅ Correto | Mantido |

---

## 🧪 Como Testar

### 1. Testar com Assunto Válido (do exemplo)

**Código:** `4907`

1. Reiniciar o servidor: `node server.js`
2. Acessar: `http://localhost:3000/peticionamento-inicial.html`
3. Selecionar o assunto "4907"
4. Preencher demais campos
5. Enviar petição
6. ✅ Deve funcionar (código sabidamente válido)

### 2. Verificar Código do Assunto "2190302"

**No console do navegador (F12):**
```javascript
// Verificar se o assunto está na lista
const selectAssunto = document.getElementById('assunto');
const options = Array.from(selectAssunto.options);
const assunto2190302 = options.find(opt => opt.value === '2190302');

if (assunto2190302) {
    console.log('✅ Assunto encontrado:', assunto2190302.textContent);
} else {
    console.log('❌ Assunto NÃO está na lista de assuntos carregados');
}
```

### 3. Verificar Logs no Backend

**Com DEBUG_MODE=true:**
```bash
cd mni-web-app/backend
node server.js
```

**Enviar petição e verificar no console:**
- ✅ Código do assunto sendo enviado
- ✅ XML SOAP gerado
- ✅ Resposta do TJSP

---

## 💡 Recomendações

### Para o Erro "Assunto não localizado":

1. **Usar código do exemplo primeiro:**
   - Testar com assunto "4907" (do SOAP de exemplo)
   - Se funcionar, confirma que o problema é o código "2190302"

2. **Verificar se assunto existe:**
   - Abrir console do navegador
   - Verificar se "2190302" está na lista de opções
   - Se não estiver, o filtro já removeu (inativo ou não lançável)

3. **Testar com assuntos comuns:**
   - Buscar assuntos por nome (ex: "IPTU", "Dano Moral")
   - Usar códigos mais curtos/simples primeiro

4. **Verificar resposta SOAP:**
   - Com DEBUG_MODE ativado
   - Analisar mensagem de erro completa do TJSP
   - Pode conter dica sobre qual campo está incorreto

---

## 📁 Arquivos Modificados

```
mni-web-app/backend/services/mniClient.js
- Linha 298-300: Debug do código do assunto
- Linha 330: Adicionado atributo tipoDocumentoLocal
```

---

## 🎯 Próximos Passos

1. ✅ Testar com assunto "4907" (do exemplo)
2. ✅ Ativar DEBUG_MODE para ver SOAP completo
3. ✅ Verificar se "2190302" realmente existe na tabela
4. ✅ Usar filtros no select para encontrar assuntos válidos
5. ✅ Analisar mensagem completa de erro do TJSP

---

**Data:** 14/01/2025
**Versão:** 2.3
**Status:** ✅ Análise completa + 1 correção aplicada (tipoDocumentoLocal)
