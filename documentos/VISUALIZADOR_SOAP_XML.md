# 🔍 Visualizador de XML SOAP - Guia Completo

## 📋 Descrição

Ferramenta de debug integrada ao formulário de peticionamento inicial que permite **visualizar, copiar e baixar** o XML SOAP completo enviado ao TJSP e a resposta recebida.

---

## ✨ Funcionalidades

### 1. **Visualização Automática**
- ✅ Após enviar uma petição, o XML aparece automaticamente
- ✅ Formatação legível com indentação
- ✅ Scroll suave até a área de visualização
- ✅ Sintaxe destacada (tema escuro)

### 2. **Duas Seções**
- 📤 **Requisição SOAP**: XML enviado ao TJSP
- 📥 **Resposta SOAP**: XML retornado pelo TJSP

### 3. **Ações Disponíveis**
- 📋 **Copiar**: Copia XML para área de transferência
- 💾 **Baixar**: Salva XML como arquivo `.xml`
- ▼/▲ **Expandir/Recolher**: Mostrar ou ocultar o conteúdo

---

## 🚀 Como Usar

### Passo 1: Preencher e Enviar Petição

1. Acesse: `http://localhost:3000/peticionamento-inicial.html`
2. Preencha todos os campos obrigatórios do formulário
3. Clique em **"Enviar Petição Inicial"**
4. Aguarde o processamento

### Passo 2: Visualizar XML SOAP

Após o envio (com sucesso ou erro), automaticamente:

1. **Aparece uma nova seção** no final da página:
   ```
   🔍 Debug SOAP - XML Completo
   [▲ Expandir/Recolher]
   ```

2. **A seção estará expandida** mostrando:
   - 📤 Requisição SOAP Enviada
   - 📥 Resposta SOAP Recebida

3. **Scroll automático** leva você até a visualização

### Passo 3: Analisar o XML

#### Ver XML de Requisição

```xml
<soapenv:Envelope ...>
   <soapenv:Body>
      <ser:entregarManifestacaoProcessual>
         <tip:idManifestante>CPF</tip:idManifestante>
         <tip:senhaManifestante>HASH_SHA256</tip:senhaManifestante>
         <tip:dadosBasicos
             codigoLocalidade="0960"
             classeProcessual="7"
             competencia="114"
             nivelSigilo="0">

            <!-- Polos -->
            <int:polo polo="AT">...</int:polo>
            <int:polo polo="PA">...</int:polo>

            <!-- Assunto -->
            <int:assunto principal="true">
               <int:codigoNacional>4907</int:codigoNacional>
            </int:assunto>

            <!-- Valor da Causa -->
            <int:valorCausa>100000</int:valorCausa>
         </tip:dadosBasicos>

         <!-- Documentos -->
         <tip:documento ...>
            <int:conteudo>BASE64_AQUI</int:conteudo>
         </tip:documento>
      </ser:entregarManifestacaoProcessual>
   </soapenv:Body>
</soapenv:Envelope>
```

#### Ver XML de Resposta

**Sucesso:**
```xml
<soap:Envelope ...>
   <soap:Body>
      <ns2:entregarManifestacaoProcessualResponse>
         <return>
            <sucesso>true</sucesso>
            <mensagem>Protocolo realizado com sucesso</mensagem>
            <parametro nome="numeroProcesso" valor="1234567-12.2025.8.26.0001"/>
            <protocoloRecebimento>2025001234567</protocoloRecebimento>
            <dataOperacao>20250114120000</dataOperacao>
         </return>
      </ns2:entregarManifestacaoProcessualResponse>
   </soap:Body>
</soap:Envelope>
```

**Erro:**
```xml
<soap:Envelope ...>
   <soap:Body>
      <ns2:entregarManifestacaoProcessualResponse>
         <return>
            <sucesso>false</sucesso>
            <mensagem>Assunto 2190302 não localizado [Identificador: kMtt5JkBOzdgV_oGjpeg]</mensagem>
         </return>
      </ns2:entregarManifestacaoProcessualResponse>
   </soap:Body>
</soap:Envelope>
```

### Passo 4: Copiar XML

1. Clique no botão **"📋 Copiar"** (requisição ou resposta)
2. Notificação aparece: ✅ "XML de requisição copiado!"
3. Cole onde precisar (Ctrl+V / Cmd+V)

**Uso:** Copiar para ferramentas como SoapUI, Postman, ou editor de texto

### Passo 5: Baixar XML

1. Clique no botão **"💾 Baixar"** (requisição ou resposta)
2. Arquivo é baixado automaticamente:
   - Formato: `soap-request-2025-01-14T12-30-00.xml`
   - Tipo: XML formatado
3. Notificação aparece: 💾 "XML de requisição baixado!"

**Uso:** Guardar para análise posterior ou compartilhar com suporte

---

## 🎯 Casos de Uso Práticos

### 1. **Debugar Erro "Assunto não localizado"**

**Problema:**
```
Erro ao enviar petição: Assunto 2190302 não localizado
```

**Solução com Visualizador:**

1. Envie a petição (mesmo que dê erro)
2. Veja a **Requisição SOAP**
3. Localize a seção `<int:assunto>`:
   ```xml
   <int:assunto principal="true">
      <int:codigoNacional>2190302</int:codigoNacional>  <!-- 👈 Código enviado -->
   </int:assunto>
   ```
4. Veja a **Resposta SOAP**:
   ```xml
   <mensagem>Assunto 2190302 não localizado</mensagem>
   ```
5. **Conclusão:** O código "2190302" está sendo enviado corretamente, mas não existe no TJSP

**Ação:** Escolher outro código de assunto válido (ex: 4907)

---

### 2. **Verificar Credenciais Enviadas**

**Objetivo:** Confirmar que CPF/senha estão corretos

1. Veja a **Requisição SOAP**
2. Localize:
   ```xml
   <tip:idManifestante>12345678901</tip:idManifestante>  <!-- CPF -->
   <tip:senhaManifestante>a905cd061944dd...</tip:senhaManifestante>  <!-- Hash SHA256 -->
   ```
3. **Verificar:**
   - CPF está correto?
   - Senha foi hasheada? (deve ter 64 caracteres hexadecimais)

---

### 3. **Comparar com SOAP de Exemplo**

**Objetivo:** Ver diferenças entre seu XML e o exemplo funcional

1. Baixe seu XML: **💾 Baixar** (requisição)
2. Baixe o SOAP de exemplo fornecido
3. Use ferramenta de diff (ex: WinMerge, Meld, VS Code)
4. Compare lado a lado:
   - Estrutura das tags
   - Atributos
   - Valores
   - Namespaces

---

### 4. **Enviar XML para Suporte Técnico**

**Cenário:** Precisa reportar um problema ao TJSP

1. Reproduza o erro
2. **💾 Baixe** tanto requisição quanto resposta
3. Envie os 2 arquivos XML ao suporte com a descrição do problema
4. Eles poderão ver exatamente o que foi enviado/recebido

---

### 5. **Testar em SoapUI**

**Objetivo:** Reproduzir a chamada SOAP fora do sistema

1. **📋 Copie** a requisição SOAP
2. Abra SoapUI
3. Crie novo projeto SOAP
4. Cole o XML copiado
5. Execute a requisição manualmente
6. Compare resposta

---

## 🎨 Interface Visual

### Aparência

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Debug SOAP - XML Completo    [▲ Expandir/Recolher] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📤 Requisição SOAP Enviada                        │
│  [📋 Copiar] [💾 Baixar]                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ <soapenv:Envelope>                            │ │
│  │   <soapenv:Body>                              │ │
│  │     ...                                       │ │
│  │   </soapenv:Body>                             │ │
│  │ </soapenv:Envelope>                           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  📥 Resposta SOAP Recebida                         │
│  [📋 Copiar] [💾 Baixar]                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ <soap:Envelope>                               │ │
│  │   <soap:Body>                                 │ │
│  │     ...                                       │ │
│  │   </soap:Body>                                │ │
│  │ </soap:Envelope>                              │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Características Visuais

- **Fundo escuro** (tema VS Code) para o XML
- **Fonte monoespaçada** (Consolas, Monaco, Courier)
- **Scroll horizontal e vertical** se XML for grande
- **Indentação automática** (2 espaços por nível)
- **Botões com hover effects** (azul para copiar, verde para baixar)

---

## 🔧 Recursos Técnicos

### Formatação de XML

- ✅ Quebra de linhas automática
- ✅ Indentação hierárquica
- ✅ Preserva conteúdo original
- ✅ Trata tags auto-fecháveis corretamente

### API Endpoints Criados

**GET `/api/peticionamento/debug/last-soap`**
```json
{
  "success": true,
  "data": {
    "request": "<soapenv:Envelope>...</soapenv:Envelope>",
    "response": "<soap:Envelope>...</soap:Envelope>"
  }
}
```

**GET `/api/peticionamento/debug/soap-logs`**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "timestamp": "2025-01-14T12:30:00.000Z",
      "request": "...",
      "response": "...",
      "statusCode": 200
    }
  ]
}
```

### Armazenamento

- **Memória:** Últimas 10 transações SOAP
- **Limpeza automática:** Mantém apenas as mais recentes
- **Acesso via método:** `mniClient.getLastSoapTransaction()`

---

## 📱 Responsividade

### Desktop (> 768px)
- Botões lado a lado
- XML ocupa largura total
- Fonte 0.85rem

### Mobile (≤ 768px)
- Botões empilhados verticalmente
- XML ajusta-se à tela
- Fonte 0.75rem
- Scroll horizontal se necessário

---

## 🐛 Troubleshooting

### "Nenhuma requisição SOAP ainda"

**Causa:** Página foi recarregada ou servidor foi reiniciado

**Solução:**
1. Envie uma nova petição
2. O XML aparecerá automaticamente

### XML não formata corretamente

**Causa:** XML muito complexo ou malformado

**Solução:**
- O XML bruto ainda é exibido
- Use "Copiar" e cole em editor externo com formatação XML

### Botão "Copiar" não funciona

**Causa:** Navegador não suporta Clipboard API ou HTTPS não configurado

**Solução:**
1. Use "Baixar" em vez de "Copiar"
2. Ou selecione manualmente o texto e Ctrl+C

---

## ✅ Checklist de Uso

- [ ] Preencher formulário de peticionamento
- [ ] Enviar petição inicial
- [ ] Aguardar resposta (sucesso ou erro)
- [ ] Visualizar XML SOAP automaticamente exibido
- [ ] Analisar seção `<int:assunto>` na requisição
- [ ] Verificar `<mensagem>` na resposta
- [ ] Copiar ou baixar XML se necessário
- [ ] Comparar com SOAP de exemplo
- [ ] Identificar diferenças ou erros

---

## 📊 Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Sem visibilidade do XML | ✅ XML completo visível |
| ❌ Debug apenas no console do servidor | ✅ Debug no navegador |
| ❌ Difícil identificar erros | ✅ Erro visível na resposta XML |
| ❌ Não dá para copiar XML | ✅ Copiar com 1 clique |
| ❌ Não dá para salvar XML | ✅ Baixar com 1 clique |
| ❌ XML não formatado | ✅ XML indentado e legível |

---

## 🎓 Dicas Avançadas

### 1. Buscar Texto no XML
- Use Ctrl+F (Cmd+F) no navegador
- Busque por: `<int:assunto>`, `<mensagem>`, `<codigoNacional>`, etc.

### 2. Comparar XMLs
- Baixe requisição de envio com sucesso
- Baixe requisição de envio com erro
- Use ferramenta diff para comparar

### 3. Validar XML
- Copie o XML
- Cole em validador online (xmlvalidation.com)
- Verifique se está bem-formado

### 4. Extrair Base64
- Localize `<int:conteudo>` na requisição
- Copie o conteúdo Base64
- Decodifique para ver o PDF original (se necessário)

---

**Versão:** 1.0
**Data:** 14/01/2025
**Status:** ✅ Implementado e Funcional
