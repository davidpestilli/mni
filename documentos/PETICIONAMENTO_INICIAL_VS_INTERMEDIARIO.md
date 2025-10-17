# 📝 Peticionamento Inicial vs. Intermediário - MNI

## 🎯 Diferença Fundamental

| Tipo | Quando Usar | Campo Obrigatório | Campo NÃO usar |
|------|-------------|-------------------|----------------|
| **Petição INICIAL** | Quando o processo ainda NÃO existe | `dadosBasicos` | `numeroProcesso` |
| **Petição INTERMEDIÁRIA** | Quando o processo JÁ existe | `numeroProcesso` | `dadosBasicos` |

---

## 📋 Peticionamento INICIAL (Criar Novo Processo)

### Estrutura Básica

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
   <soap:Body>
      <ns4:entregarManifestacaoProcessual
          xmlns="http://www.cnj.jus.br/tipos-servicointercomunicacao-2.2.2"
          xmlns:ns2="http://www.cnj.jus.br/intercomunicacao-2.2.2"
          xmlns:ns4="http://www.cnj.jus.br/servicointercomunicacao-2.2.2/">

         <!-- Credenciais -->
         <idManifestante>USU�RIO_SISTEMA</idManifestante>
         <senhaManifestante>SENHA_HASH_SHA256</senhaManifestante>

         <!-- NÃO enviar numeroProcesso em petições iniciais! -->

         <!-- ENVIAR dadosBasicos -->
         <dadosBasicos
             codigoLocalidade="4047"
             classeProcessual="155"
             codigoAssunto="11238"
             valorCausa="10000.00"
             numeroInstancia="1">

            <!-- Polo Ativo (Autor) -->
            <polo>
               <parte>
                  <pessoa>
                     <nome>FULANO DE TAL</nome>
                     <cpf>12345678901</cpf>
                  </pessoa>
                  <tipoRepresentacao>D</tipoRepresentacao> <!-- D = Direta -->
               </parte>
            </polo>

            <!-- Polo Passivo (Réu) -->
            <polo>
               <parte>
                  <pessoa>
                     <nome>BELTRANO DE TAL</nome>
                     <cpf>98765432100</cpf>
                  </pessoa>
                  <tipoRepresentacao>D</tipoRepresentacao>
               </parte>
            </polo>

            <!-- Parâmetros adicionais (opcionais) -->
            <outroParametro nome="CautelaAntecipacaoTutela" valor="0"/>
            <outroParametro nome="GrandeDevedor" valor="false"/>
            <outroParametro nome="CodRito" valor="2"/> <!-- 1=Juizado, 2=Ordinário -->
         </dadosBasicos>

         <!-- Documento principal -->
         <documento tipoDocumento="1" mimetype="application/pdf" nivelSigilo="0">
            <ns2:conteudo>BASE64_ENCODED_PDF</ns2:conteudo>
            <ns2:outroParametro nome="NomeDocumentoUsuario" valor="Peticao_Inicial.pdf"/>
         </documento>

         <!-- Anexos (se houver) -->
         <documento tipoDocumento="2" mimetype="application/pdf">
            <ns2:conteudo>BASE64_ENCODED_PROCURACAO</ns2:conteudo>
            <ns2:outroParametro nome="NomeDocumentoUsuario" valor="Procuracao.pdf"/>
         </documento>

      </ns4:entregarManifestacaoProcessual>
   </soap:Body>
</soap:Envelope>
```

### Resposta de Petição Inicial

```xml
<SOAP-ENV:Envelope>
   <SOAP-ENV:Body>
      <ns2:entregarManifestacaoProcessualResposta>
         <ns1:sucesso>true</ns1:sucesso>
         <ns1:mensagem>Processo distribuído com sucesso</ns1:mensagem>
         <ns1:protocoloRecebimento>771400082956387730110000000001</ns1:protocoloRecebimento>
         <ns1:dataOperacao>20250113140530</ns1:dataOperacao>

         <!-- IMPORTANTE: Retorna o número do processo criado! -->
         <ns1:parametro nome="numeroProcesso">50349435820164047100</ns1:parametro>

         <ns1:recibo>RECIBO_PDF_BASE64</ns1:recibo>
      </ns2:entregarManifestacaoProcessualResposta>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

---

## 📄 Peticionamento INTERMEDIÁRIO (Processo Existente)

### Estrutura Básica

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
   <soap:Body>
      <ns4:entregarManifestacaoProcessual
          xmlns="http://www.cnj.jus.br/tipos-servicointercomunicacao-2.2.2"
          xmlns:ns2="http://www.cnj.jus.br/intercomunicacao-2.2.2"
          xmlns:ns4="http://www.cnj.jus.br/servicointercomunicacao-2.2.2/">

         <!-- Credenciais -->
         <idManifestante>USU�RIO_SISTEMA</idManifestante>
         <senhaManifestante>SENHA_HASH_SHA256</senhaManifestante>

         <!-- ENVIAR numeroProcesso em petições intermediárias! -->
         <numeroProcesso>50000450520164047116</numeroProcesso>

         <!-- NÃO enviar dadosBasicos em petições intermediárias! -->

         <!-- Documento -->
         <documento tipoDocumento="13" mimetype="application/pdf" nivelSigilo="0">
            <ns2:conteudo>BASE64_ENCODED_PDF</ns2:conteudo>
            <ns2:outroParametro nome="NomeDocumentoUsuario" valor="Contestacao.pdf"/>
         </documento>

         <!-- Parâmetros opcionais -->
         <parametros nome="identEncerraPrazos" valor="12345678901"/> <!-- CPF da parte -->
         <parametros nome="identificadorComunicacao" valor="201611183000011"/> <!-- ID do aviso -->

      </ns4:entregarManifestacaoProcessual>
   </soap:Body>
</soap:Envelope>
```

---

## 🔑 Campos do dadosBasicos (Petição Inicial)

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `codigoLocalidade` | Código da localidade judicial (comarca) | "4047" (Florianópolis) |
| `classeProcessual` | Classe do processo (Tabela CNJ) | "155" (Execução Fiscal) |
| `codigoAssunto` | Assunto principal (Tabela CNJ) | "11238" |
| `valorCausa` | Valor da causa | "10000.00" |
| `numeroInstancia` | Instância (1=1º grau, 2=2º grau) | "1" |

### Campos Opcionais

| Campo | Descrição | Valores |
|-------|-----------|---------|
| `competencia` | Competência | "3" (Juizado Especial) |
| `prioridade` | Prioridade | "1" (Idoso), "2" (PCD) |
| `outroParametro` | Parâmetros adicionais | Vários |

### Polo (Partes)

```xml
<polo>
   <parte>
      <!-- Pessoa Física -->
      <pessoa>
         <nome>FULANO DE TAL</nome>
         <cpf>12345678901</cpf>
      </pessoa>

      <!-- OU Pessoa Jurídica -->
      <pessoa>
         <razaoSocial>EMPRESA LTDA</razaoSocial>
         <cnpj>12345678000199</cnpj>
      </pessoa>

      <tipoRepresentacao>D</tipoRepresentacao> <!-- D=Direta, I=Indireta -->
      <tipoParticipacao>PA</tipoParticipacao> <!-- PA=Polo Ativo, PP=Polo Passivo -->
   </parte>
</polo>
```

---

## 📊 Tabelas Necessárias

Para peticionamento inicial, você precisa consultar:

### 1. Tipos de Documento
```
GET /api/tabelas/TipoDocumento
```
- Código: 1 = Petição Inicial
- Código: 2 = Procuração
- Código: 13 = Petição (genérica)

### 2. Classes Processuais
```
GET /api/tabelas/ClasseProcessual
```
- Código: 155 = Execução Fiscal
- Código: 436 = Execução de Título Extrajudicial
- Código: 11 = Procedimento Comum Cível

### 3. Assuntos Processuais
```
GET /api/tabelas/AssuntoProcessual
```
- Código: 11238 = IPTU
- Código: 11239 = ISS
- etc.

### 4. Localidades (Comarcas)
- Cada tribunal tem sua lista específica
- TJSP: Consultar https://eproc1g.tjsp.jus.br/eproc/ws/consultarTabela (LocalidadeJudicial)

### 5. Órgãos Julgadores
```
GET /api/tabelas/OrgaoJulgador
```
- Varas, câmaras, turmas específicas

---

## ⚠️ Erros Comuns

### 1. Enviar numeroProcesso em petição inicial
```
❌ ERRO: Petição inicial não deve ter numeroProcesso
✅ SOLUÇÃO: Use dadosBasicos ao invés
```

### 2. Enviar dadosBasicos em petição intermediária
```
❌ ERRO: Petição intermediária não deve ter dadosBasicos
✅ SOLUÇÃO: Use numeroProcesso ao invés
```

### 3. Falta de campos obrigatórios
```
❌ ERRO: codigoLocalidade é obrigatório
✅ SOLUÇÃO: Sempre preencher todos os campos obrigatórios do dadosBasicos
```

### 4. Polo sem partes
```
❌ ERRO: É necessário informar ao menos uma parte no polo ativo e passivo
✅ SOLUÇÃO: Incluir ao menos autor e réu
```

---

## 💡 Como Implementar no App Web

### 1. Modificar Interface

```javascript
// Adicionar seletor de tipo de peticionamento
<select id="tipoPeticionamento">
    <option value="inicial">Petição Inicial</option>
    <option value="intermediaria">Petição Intermediária</option>
</select>

// Mostrar/ocultar campos conforme tipo
<div id="camposInicial" style="display:none">
    <select id="classe">...</select>
    <select id="assunto">...</select>
    <input type="number" id="valorCausa">
    <div id="poloAtivo">...</div>
    <div id="poloPassivo">...</div>
</div>

<div id="camposIntermediaria" style="display:none">
    <input type="text" id="numeroProcesso">
</div>
```

### 2. Modificar mniClient.js

```javascript
async entregarManifestacao(tipo, dados) {
    const args = {
        idManifestante: this.config.usuario,
        senhaManifestante: gerarSenhaHashMNI(this.config.senha),
        documento: {
            tipoDocumento: dados.tipoDocumento,
            mimetype: 'application/pdf',
            nivelSigilo: 0,
            conteudo: dados.documento
        }
    };

    if (tipo === 'inicial') {
        // Petição inicial - adicionar dadosBasicos
        args.dadosBasicos = {
            codigoLocalidade: dados.localidade,
            classeProcessual: dados.classe,
            codigoAssunto: dados.assunto,
            valorCausa: dados.valorCausa,
            numeroInstancia: '1',
            polo: [
                { // Polo Ativo
                    parte: {
                        pessoa: {
                            nome: dados.autorNome,
                            cpf: dados.autorCpf
                        },
                        tipoRepresentacao: 'D',
                        tipoParticipacao: 'PA'
                    }
                },
                { // Polo Passivo
                    parte: {
                        pessoa: {
                            nome: dados.reuNome,
                            cpf: dados.reuCpf
                        },
                        tipoRepresentacao: 'D',
                        tipoParticipacao: 'PP'
                    }
                }
            ]
        };
    } else {
        // Petição intermediária - adicionar numeroProcesso
        args.numeroProcesso = dados.numeroProcesso;
    }

    const [result] = await this.client.entregarManifestacaoProcessualAsync(args);

    // Se for inicial, extrair número do processo da resposta
    if (tipo === 'inicial' && result.parametro) {
        const numeroProcesso = result.parametro.find(p => p.nome === 'numeroProcesso')?.valor;
        return {
            ...result,
            numeroProcessoGerado: numeroProcesso
        };
    }

    return result;
}
```

### 3. Adicionar Rotas

```javascript
// backend/routes/peticionamento.js

router.post('/peticao-inicial', async (req, res) => {
    try {
        const resultado = await mniClient.entregarManifestacao('inicial', req.body);
        res.json({
            success: true,
            numeroProcesso: resultado.numeroProcessoGerado,
            protocolo: resultado.protocoloRecebimento,
            recibo: resultado.recibo
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/peticao-intermediaria', async (req, res) => {
    try {
        const resultado = await mniClient.entregarManifestacao('intermediaria', req.body);
        res.json({
            success: true,
            protocolo: resultado.protocoloRecebimento,
            recibo: resultado.recibo
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

---

## 🎯 Resumo Executivo

1. **Petição Inicial** = Criar processo novo
   - Usa `dadosBasicos` com classe, assunto, partes, valor da causa
   - NÃO usa `numeroProcesso`
   - **Resposta retorna o número do processo criado**

2. **Petição Intermediária** = Manifestação em processo existente
   - Usa `numeroProcesso`
   - NÃO usa `dadosBasicos`
   - Resposta confirma recebimento

3. **App Web Atual**
   - Está preparado apenas para peticionamento INTERMEDIÁRIO
   - Precisa ser expandido para suportar peticionamento INICIAL
   - Requer carregar tabelas adicionais: classes, assuntos, localidades

---

**Versão:** 1.0
**Data:** 2025-01-13
**Descoberta:** Estrutura de peticionamento inicial vs. intermediário
