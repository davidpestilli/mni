# ROADMAP DE APRENDIZAGEM - SUPORTE AO MNI

## Objetivo
Este documento serve como guia de aprendizagem para dar suporte técnico a entidades públicas que se integram ao eproc através do MNI (Modelo Nacional de Intercomunicação).

---

## FASE 1: FUNDAMENTOS DO MNI

### 1.1. Conceitos Básicos

**O que é o MNI?**
- Modelo Nacional de Intercomunicação estabelecido pelo CNJ
- Padrão para troca de informações estruturadas entre sistemas judiciais
- Permite integração entre tribunais e órgãos públicos (Procuradorias, Defensorias, MP, etc.)

**Como funciona?**
- Web Services SOAP baseados em XML
- Autenticação via credenciais (CPF/sigla + senha ou institucional)
- Dados estruturados substituem PDFs em citações/intimações
- Versão atual: MNI 2.2.2 / 3.0.0

**Principais Operações:**
1. `consultarAvisosPendentes` - Lista de intimações/citações pendentes
2. `consultarTeorComunicacao` - Detalhes de uma intimação/citação específica
3. `consultarProcesso` - Dados completos do processo e movimentações
4. `entregarManifestacaoProcessual` - Envio de petições/contestações
5. `consultarAlteracao` - Alterações em processos

**Namespace padrão:**
```
http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/
http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2
```

### 1.2. Documentação de Referência

Leia os documentos na seguinte ordem:

1. **FAQ.html** - Perguntas frequentes e conceitos básicos
2. **tipos_intercomunicacao_mni_222.html** - Tipos de dados e estruturas XML
3. **consultas_avisos_pendentes_via_web_service.html** - Primeira operação a dominar
4. **consulta_processual.html** - Operação mais complexa
5. **consultas_por_teor_de_comunicacao.html** - Detalhes de intimações
6. **peticionamento_entrega_de_manifestacao.html** - Envio de documentos
7. **código_base_mni.xsd.xml** - Schema XML para validação

**Tempo estimado:** 4-6 horas de leitura

---

## FASE 2: PREPARAÇÃO DO AMBIENTE SOAPUI

### 2.1. Configuração Inicial

**Passo 1: Criar Novo Projeto SOAP**
1. Abrir SoapUI
2. File → New SOAP Project
3. Nome do projeto: "MNI_eproc_TJSC"
4. WSDL URL inicial: `[URL do WSDL fornecida pelo tribunal]`

**Passo 2: Configurar Propriedades Globais**
Criar propriedades no nível do projeto para reutilizar:
- `ENDPOINT`: URL base do serviço
- `ID_CONSULTANTE`: Seu CPF/sigla de teste
- `SENHA_CONSULTANTE`: Sua senha de teste
- `NUMERO_PROCESSO_TESTE`: Um número de processo válido para testes

**Passo 3: Organizar Estrutura**
Crie pastas/casos de teste para cada operação:
- TC01_ConsultarAvisosPendentes
- TC02_ConsultarTeorComunicacao
- TC03_ConsultarProcesso_Metadados
- TC04_ConsultarProcesso_Documentos
- TC05_EntregarManifestacao

### 2.2. Template de Requisição Básica

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Header/>
   <soap:Body>
      <ser:[OPERACAO]>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <!-- Parâmetros específicos da operação -->
      </ser:[OPERACAO]>
   </soap:Body>
</soap:Envelope>
```

**Tempo estimado:** 1-2 horas

---

## FASE 3: PRÁTICAS COM SOAPUI - OPERAÇÕES BÁSICAS

### 3.1. PRÁTICA 1: Consultar Avisos Pendentes

**Objetivo:** Listar todas as intimações e citações pendentes de um usuário

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarAvisosPendentes>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
      </ser:consultarAvisosPendentes>
   </soap:Body>
</soap:Envelope>
```

**O que verificar na resposta:**
- [ ] Status HTTP 200
- [ ] Tag `<aviso>` para cada intimação/citação
- [ ] `numeroProcesso` - Número único do processo (20 dígitos)
- [ ] `dataDisponibilizacao` - Data da intimação (formato: AAAAMMDDHHMMSS)
- [ ] `outroParametro[@nome='identificadorMovimento']` - ID do movimento
- [ ] `outroParametro[@nome='descricaoMovimento']` - Tipo de intimação
- [ ] `outroParametro[@nome='prazo']` - Dias para responder
- [ ] `outroParametro[@nome='status']` - "Aguardando Abertura" ou "Aberto"

**Exercícios:**
1. Execute a requisição e anote quantos avisos pendentes existem
2. Identifique um aviso com status "Aguardando Abertura"
3. Identifique um aviso com status "Aberto" e anote as datas de início e fim do prazo
4. Salve o `identificadorMovimento` de um aviso para usar na próxima prática

**Tempo estimado:** 30 minutos

### 3.2. PRÁTICA 2: Consultar Teor da Comunicação

**Objetivo:** Obter detalhes completos de uma intimação/citação específica

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarTeorComunicacao>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>[NÚMERO DO PROCESSO]</tip:numeroProcesso>
         <tip:identificadorMovimento>[ID DO MOVIMENTO]</tip:identificadorMovimento>
      </ser:consultarTeorComunicacao>
   </soap:Body>
</soap:Envelope>
```

**O que verificar na resposta:**
- [ ] Teor completo da comunicação
- [ ] Dados da decisão que originou a intimação
- [ ] Prazo em dias
- [ ] Partes envolvidas
- [ ] Documentos vinculados (se houver)

**Exercícios:**
1. Use o `numeroProcesso` e `identificadorMovimento` obtidos na Prática 1
2. Execute a requisição
3. Identifique o tipo de intimação (citação, intimação de decisão, etc.)
4. Verifique se há documentos anexados à comunicação

**Tempo estimado:** 30 minutos

### 3.3. PRÁTICA 3: Consultar Processo (Metadados)

**Objetivo:** Obter dados básicos, movimentações e metadados de documentos de um processo

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarProcesso>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>${#Project#NUMERO_PROCESSO_TESTE}</tip:numeroProcesso>
         <tip:incluirDocumentos>true</tip:incluirDocumentos>
      </ser:consultarProcesso>
   </soap:Body>
</soap:Envelope>
```

**O que verificar na resposta:**
- [ ] `cabecalho/dadosBasicos` - Número, classe, órgão julgador
- [ ] `cabecalho/dataAjuizamento` - Data de ajuizamento
- [ ] `cabecalho/nivelSigilo` - Nível de sigilo (0 a 5)
- [ ] `cabecalho/valorCausa` - Valor da causa
- [ ] `cabecalho/polo` - Partes do processo (ativo, passivo, terceiros)
- [ ] `movimento` - Lista de movimentações
- [ ] `documento/idDocumento` - IDs dos documentos
- [ ] `documento/hash` - Hash SHA-256 do documento
- [ ] `documento/nomeDocumento` - Nome do arquivo
- [ ] `documento/mimetype` - Tipo MIME (application/pdf)

**Exercícios:**
1. Execute a requisição
2. Conte quantas movimentações o processo possui
3. Identifique as partes (polo ativo e passivo)
4. Liste todos os documentos e seus hashes
5. Salve o `idDocumento` de um documento para a próxima prática

**Dica:** Use XPath no SoapUI para extrair dados específicos:
- `//ns2:numeroProcesso` - Número do processo
- `//ns2:documento/ns2:idDocumento` - Todos os IDs de documentos
- `//ns2:movimento` - Todas as movimentações

**Tempo estimado:** 1 hora

### 3.4. PRÁTICA 4: Consultar Conteúdo de Documento

**Objetivo:** Baixar o conteúdo real de um documento (retorna Base64)

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarConteudoDocumento>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>${#Project#NUMERO_PROCESSO_TESTE}</tip:numeroProcesso>
         <tip:idDocumento>[ID DO DOCUMENTO]</tip:idDocumento>
      </ser:consultarConteudoDocumento>
   </soap:Body>
</soap:Envelope>
```

**O que verificar na resposta:**
- [ ] Conteúdo do documento em Base64
- [ ] Valide o hash do documento recebido

**Exercícios:**
1. Use um `idDocumento` obtido na Prática 3
2. Execute a requisição
3. Copie o conteúdo Base64 da resposta
4. Converta de Base64 para arquivo PDF usando uma ferramenta online ou script
5. Abra o PDF e verifique se está correto
6. (Opcional) Calcule o hash SHA-256 do arquivo e compare com o hash retornado na Prática 3

**Dica - Script Groovy para decodificar Base64 no SoapUI:**
```groovy
def response = context.expand('${TC04_ConsultarDocumento#Response}')
def base64Content = // extrair do XML
def bytes = base64Content.decodeBase64()
new File("C:\\temp\\documento.pdf").bytes = bytes
```

**Tempo estimado:** 45 minutos

---

## FASE 4: PRÁTICAS AVANÇADAS COM SOAPUI

### 4.1. PRÁTICA 5: Entregar Manifestação (Peticionamento)

**Objetivo:** Enviar uma petição/contestação para um processo

**Preparação:**
1. Crie um arquivo PDF simples de teste (< 11MB)
2. Converta o PDF para Base64 usando:
   - Site: https://base64.guru/converter/encode/pdf
   - Ou comando: `certutil -encode arquivo.pdf arquivo.txt` (Windows)
   - Ou comando: `base64 arquivo.pdf > arquivo.txt` (Linux/Mac)

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:entregarManifestacaoProcessual>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>${#Project#NUMERO_PROCESSO_TESTE}</tip:numeroProcesso>
         <tip:tipoDocumento>123</tip:tipoDocumento>
         <tip:documento>[CONTEÚDO BASE64 DO PDF]</tip:documento>
         <tip:nomeDocumento>Contestacao_Teste.pdf</tip:nomeDocumento>
         <tip:mimetype>application/pdf</tip:mimetype>
         <tip:dataDocumento>20250113120000</tip:dataDocumento>
         <tip:descricaoDocumento>Contestação de teste via SoapUI</tip:descricaoDocumento>
      </ser:entregarManifestacaoProcessual>
   </soap:Body>
</soap:Envelope>
```

**O que verificar na resposta:**
- [ ] `sucesso` = true
- [ ] `numeroProtocolo` - Número do protocolo gerado
- [ ] `dataProtocolo` - Data/hora do protocolo
- [ ] `mensagem` - Mensagem de confirmação

**Exercícios:**
1. Converta um PDF de teste para Base64
2. Substitua `[CONTEÚDO BASE64 DO PDF]` pelo conteúdo convertido
3. Execute a requisição
4. Verifique se obteve sucesso
5. Anote o número do protocolo
6. (Opcional) Acesse o eproc via interface web e confirme que a petição foi protocolada

**ATENÇÃO:** Execute esta prática apenas em ambiente de homologação/testes!

**Tempo estimado:** 1 hora

### 4.2. PRÁTICA 6: Peticionamento com Documentos Vinculados

**Objetivo:** Enviar uma petição principal com documentos anexos

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:entregarManifestacaoProcessual>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>${#Project#NUMERO_PROCESSO_TESTE}</tip:numeroProcesso>
         <!-- Documento Principal -->
         <tip:tipoDocumento>123</tip:tipoDocumento>
         <tip:documento>[BASE64 DO DOCUMENTO PRINCIPAL]</tip:documento>
         <tip:nomeDocumento>Peticao_Principal.pdf</tip:nomeDocumento>
         <tip:mimetype>application/pdf</tip:mimetype>
         <tip:dataDocumento>20250113120000</tip:dataDocumento>
         <!-- Documento Vinculado 1 -->
         <tip:documentoVinculado>
            <tip:tipoDocumento>456</tip:tipoDocumento>
            <tip:documento>[BASE64 DO ANEXO 1]</tip:documento>
            <tip:nomeDocumento>Anexo_01_Procuracao.pdf</tip:nomeDocumento>
            <tip:mimetype>application/pdf</tip:mimetype>
            <tip:dataDocumento>20250113120000</tip:dataDocumento>
         </tip:documentoVinculado>
         <!-- Documento Vinculado 2 -->
         <tip:documentoVinculado>
            <tip:tipoDocumento>789</tip:tipoDocumento>
            <tip:documento>[BASE64 DO ANEXO 2]</tip:documento>
            <tip:nomeDocumento>Anexo_02_Contrato.pdf</tip:nomeDocumento>
            <tip:mimetype>application/pdf</tip:mimetype>
            <tip:dataDocumento>20250113120000</tip:dataDocumento>
         </tip:documentoVinculado>
      </ser:entregarManifestacaoProcessual>
   </soap:Body>
</soap:Envelope>
```

**Exercícios:**
1. Prepare 3 PDFs pequenos (1 principal + 2 anexos)
2. Converta todos para Base64
3. Monte a requisição com os 3 documentos
4. Execute e verifique o sucesso
5. Confirme no eproc que todos os documentos foram protocolados

**Tempo estimado:** 1 hora

### 4.3. PRÁTICA 7: Consulta Incremental (Movimentos Desde Data)

**Objetivo:** Obter apenas movimentações novas desde uma data específica

**Requisição SoapUI:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarProcesso>
         <tip:idConsultante>${#Project#ID_CONSULTANTE}</tip:idConsultante>
         <tip:senhaConsultante>${#Project#SENHA_CONSULTANTE}</tip:senhaConsultante>
         <tip:numeroProcesso>${#Project#NUMERO_PROCESSO_TESTE}</tip:numeroProcesso>
         <tip:incluirDocumentos>true</tip:incluirDocumentos>
         <tip:movimentosDesde>20250101000000</tip:movimentosDesde>
      </ser:consultarProcesso>
   </soap:Body>
</soap:Envelope>
```

**Exercícios:**
1. Consulte o processo sem o parâmetro `movimentosDesde` e conte quantas movimentações retornam
2. Consulte novamente com `movimentosDesde` de 30 dias atrás
3. Compare a quantidade de movimentações
4. Identifique casos de uso para consulta incremental em sistemas reais

**Tempo estimado:** 30 minutos

---

## FASE 5: TIPOS DE DADOS E VALIDAÇÕES XML

### 5.1. Principais Tipos de Dados

**Estude e pratique validações para:**

1. **tipoCadastroIdentificador** - CPF (11 dígitos) ou CNPJ (14 dígitos)
   - Pattern: `(\d{11})|(\d{14})`
   - Exemplos válidos: `12345678901`, `12345678901234`

2. **tipoCadastroOAB** - Número OAB
   - Pattern: `[A-Za-z]{2}\d{7}[A-Za-z]{1}`
   - Formato: CCDDDDDDDC
   - Exemplo: `SC1234567A`

3. **tipoNumeroUnico** - Número do processo CNJ
   - Pattern: `\d{20}`
   - Formato: NNNNNNNDDAAAAJTROOOO
   - Exemplo: `12345678901234567890`

4. **tipoData** - Data sem hora
   - Formato: AAAAMMDD
   - Exemplo: `20250113`

5. **tipoDataHora** - Data com hora
   - Formato: AAAAMMDDHHMMSS
   - Exemplo: `20250113143045`

**Exercício:**
Crie um documento de testes no SoapUI com XPath Assertions para validar:
- Número de processo tem exatamente 20 dígitos
- Data de disponibilização está no formato correto
- CPF/CNPJ tem 11 ou 14 dígitos

**Tempo estimado:** 1-2 horas

### 5.2. Estruturas Complexas Importantes

**Estude em detalhes:**

1. **tipoPessoa** - Dados completos de uma pessoa
   - `numeroDocumentoPrincipal` (CPF/CNPJ)
   - `nome`
   - `endereco` (tipoEndereco)
   - `qualificacaoPessoa` (FIS/JUR/AUT/ORP/EDP)

2. **tipoRepresentanteProcessual** - Advogado/Procurador
   - `nome`
   - `inscricao` (OAB)
   - `numeroDocumentoPrincipal` (CPF/CNPJ)
   - `tipoRepresentante` (A/E/M/D/P)
   - `intimacao` (boolean)

3. **tipoParte** - Parte processual
   - `pessoa` (tipoPessoa)
   - `advogado` (tipoRepresentanteProcessual)
   - `situacao` (modalidadeSituacaoParte)

4. **tipoPoloProcessual** - Polo do processo
   - `polo` (AT/PA/TC/FL/TJ/AD/VI)
   - `parte` (tipoParte)

**Exercício:**
Analise a resposta de `consultarProcesso` e mapeie:
- Quantas partes no polo ativo?
- Quantas partes no polo passivo?
- Quantos advogados representam cada parte?
- Há terceiros no processo?

**Tempo estimado:** 2 horas

---

## FASE 6: TROUBLESHOOTING E RESOLUÇÃO DE PROBLEMAS

### 6.1. Erros Comuns e Soluções

#### ERRO 1: "Autenticação inválida"
**Sintomas:**
- Mensagem: "Usuário ou senha inválidos"
- HTTP Status: 401 ou 500

**Causas possíveis:**
1. CPF/sigla ou senha incorretos
2. Usuário com múltiplos perfis tentando autenticar por CPF
3. Senha expirada
4. Usuário bloqueado

**Como diagnosticar no SoapUI:**
1. Verifique se `idConsultante` e `senhaConsultante` estão corretos
2. Teste o login na interface web do eproc
3. Se funciona na web mas não no WS, pode ser problema de múltiplos perfis

**Solução:**
- Se múltiplos perfis: usar sigla em vez de CPF
- Contatar administrador para reset de senha
- Verificar se conta não está bloqueada

**Script de teste (Groovy):**
```groovy
// Validar credenciais antes de enviar requisição
def idConsultante = testRunner.testCase.getPropertyValue("ID_CONSULTANTE")
assert idConsultante != null && idConsultante.length() == 11, "CPF deve ter 11 dígitos"
```

#### ERRO 2: "Processo não encontrado"
**Sintomas:**
- Mensagem: "Processo não existe"
- Número do processo não retorna dados

**Causas possíveis:**
1. Número do processo incorreto
2. Processo não existe nesta instância
3. Usuário sem permissão para acessar o processo (sigilo)

**Como diagnosticar no SoapUI:**
1. Validar que o número do processo tem 20 dígitos
2. Consultar o processo na interface web com o mesmo usuário
3. Verificar nível de sigilo do processo

**Solução:**
- Validar número único do processo
- Verificar se o processo tramita nesta instância
- Usar credenciais com permissão adequada
- Se processo sigiloso nível 5, apenas autenticação pessoal do usuário autorizado

#### ERRO 3: "Documento muito grande"
**Sintomas:**
- Erro ao enviar petição
- Mensagem: "Arquivo excede tamanho máximo"

**Causas possíveis:**
1. Arquivo PDF > 11MB
2. Timeout na transmissão

**Como diagnosticar no SoapUI:**
1. Verificar tamanho do Base64 na requisição
2. Calcular tamanho do arquivo original: `tamanhoBase64 * 0.75 ≈ tamanhoOriginal`

**Solução:**
- Comprimir o PDF antes de enviar
- Dividir em múltiplos documentos se possível
- Verificar configuração de timeout no SoapUI

**Dica:** Configure timeout maior no SoapUI:
1. Clique com botão direito no Test Request
2. Properties → Request Properties
3. Timeout: 120000 (2 minutos)

#### ERRO 4: "XML malformado / Schema inválido"
**Sintomas:**
- Erro de parsing XML
- Mensagem: "Conteúdo inválido"

**Causas possíveis:**
1. Namespace incorreto
2. Tags fora de ordem
3. Tipo de dado inválido
4. Tags obrigatórias faltando

**Como diagnosticar no SoapUI:**
1. Validar XML contra o XSD do MNI
2. Verificar namespaces
3. Verificar ordem das tags

**Solução:**
- Usar a função "Validate" do SoapUI
- Comparar com exemplos da documentação
- Revisar o arquivo `código_base_mni.xsd.xml`

**Validação no SoapUI:**
1. Clique com botão direito na requisição
2. Validate → Validate against Schema

#### ERRO 5: "Prazo vencido"
**Sintomas:**
- Erro ao enviar manifestação
- Mensagem: "Prazo processual expirado"

**Causas possíveis:**
1. Tentativa de peticionar após prazo
2. Data/hora do servidor incorreta

**Como diagnosticar:**
1. Consultar o aviso pendente e verificar `dataFimPrazo`
2. Comparar com data atual
3. Verificar se há diferença de fuso horário

**Solução:**
- Orientar o ente sobre o prazo real
- Verificar se há possibilidade de prorrogação
- Em casos de problemas técnicos, gerar relatório para petição física

#### ERRO 6: "Hash do documento não confere"
**Sintomas:**
- Documento baixado está corrompido
- Hash calculado diferente do retornado

**Causas possíveis:**
1. Problema na transmissão
2. Conversão Base64 incorreta
3. Codificação de caracteres

**Como diagnosticar:**
1. Baixar o documento novamente
2. Calcular SHA-256 do arquivo
3. Comparar com o hash retornado na consulta

**Solução:**
- Refazer o download
- Verificar codificação UTF-8
- Usar biblioteca confiável para Base64

**Script para calcular hash (Groovy):**
```groovy
import java.security.MessageDigest

def calculateSHA256(byte[] bytes) {
    MessageDigest digest = MessageDigest.getInstance("SHA-256")
    byte[] hash = digest.digest(bytes)
    return hash.encodeHex().toString()
}

def fileBytes = new File("documento.pdf").bytes
def hash = calculateSHA256(fileBytes)
log.info("Hash: " + hash)
```

### 6.2. Checklist de Diagnóstico

Quando receber um chamado, siga este checklist:

**[ ] 1. Coletar Informações Básicas**
- Qual operação está sendo executada?
- Qual a mensagem de erro exata?
- Qual o XML da requisição (sem senha)?
- Qual o XML da resposta?
- Qual o número do processo envolvido?

**[ ] 2. Validar Credenciais**
- As credenciais estão corretas?
- O usuário consegue fazer login na interface web?
- Há múltiplos perfis para este usuário?

**[ ] 3. Validar Dados da Requisição**
- O XML está bem formado?
- Os namespaces estão corretos?
- Os tipos de dados estão corretos (CPF, data, número de processo)?
- Todos os campos obrigatórios estão presentes?

**[ ] 4. Validar Permissões**
- O usuário tem acesso ao processo?
- O processo tem nível de sigilo compatível?
- O usuário tem permissão para executar esta operação?

**[ ] 5. Reproduzir o Problema**
- Consigo reproduzir no SoapUI com os mesmos dados?
- O erro ocorre consistentemente ou é intermitente?
- Funciona com outros processos/usuários?

**[ ] 6. Testar Alternativas**
- A operação funciona na interface web?
- Funciona com autenticação institucional?
- Funciona em ambiente de homologação?

**[ ] 7. Documentar a Solução**
- Qual foi a causa raiz?
- Qual foi a solução aplicada?
- Como prevenir no futuro?

### 6.3. Casos de Uso de Suporte

#### CASO 1: "Não consigo ver os avisos pendentes"

**Fluxo de diagnóstico:**
1. Solicitar requisição e resposta SOAP
2. Verificar se autenticação está funcionando
3. Testar `consultarAvisosPendentes` no SoapUI com as mesmas credenciais
4. Verificar se há avisos pendentes na interface web
5. Possíveis causas:
   - Não há avisos realmente pendentes
   - Problema de permissão
   - Filtro incorreto no sistema do ente
   - Status "Aguardando Abertura" não sendo considerado

**Exemplo de teste no SoapUI:**
```xml
<!-- Teste básico -->
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ser="http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/"
               xmlns:tip="http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2">
   <soap:Body>
      <ser:consultarAvisosPendentes>
         <tip:idConsultante>[CPF DO USUÁRIO]</tip:idConsultante>
         <tip:senhaConsultante>[SENHA]</tip:senhaConsultante>
      </ser:consultarAvisosPendentes>
   </soap:Body>
</soap:Envelope>
```

**Verificação:**
- Se retornar avisos no SoapUI mas não no sistema do ente: problema no parser XML deles
- Se não retornar em nenhum lugar: realmente não há avisos
- Se retornar na web mas não no WS: problema de permissão/autenticação

#### CASO 2: "A petição não está sendo enviada"

**Fluxo de diagnóstico:**
1. Solicitar requisição completa (cuidado com tamanho)
2. Verificar:
   - Tamanho do arquivo (< 11MB?)
   - Formato (PDF?)
   - Conversão Base64 correta?
   - Número do processo válido?
   - Tipo de documento válido?
3. Testar com arquivo pequeno de teste
4. Verificar resposta do serviço
5. Se `sucesso=true`, problema pode ser na interpretação da resposta

**Template de teste:**
```xml
<!-- Use um PDF mínimo para teste -->
<tip:documento>JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSw0IDAgUj4+Pj4vQ29udGVudHMgNSAwIFIvUGFyZW50IDIgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvVGltZXMtUm9tYW4+PgplbmRvYmoKNSAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDU5IDAwMDAwIG4gCjAwMDAwMDAxMTYgMDAwMDAgbiAKMDAwMDAwMDIzMSAwMDAwMCBuIAowMDAwMDAwMzExIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDA0CiUlRU9G</tip:documento>
<tip:nomeDocumento>teste_minimo.pdf</tip:nomeDocumento>
```

#### CASO 3: "Não consigo baixar documentos grandes"

**Fluxo de diagnóstico:**
1. Verificar tamanho do documento na consulta de metadados
2. Testar timeout:
   - Aumentar timeout no SoapUI
   - Verificar timeout no sistema do ente
3. Testar download de documento menor para isolar problema
4. Verificar logs de rede

**Solução:**
- Aumentar timeout na aplicação do ente
- Implementar retry com backoff exponencial
- Considerar download assíncrono

#### CASO 4: "Status da intimação não muda de 'Aguardando Abertura' para 'Aberto'"

**Explicação:**
O status muda para "Aberto" quando o destinatário faz a consulta do teor da comunicação via:
- Interface web do eproc
- Web service `consultarTeorComunicacao`

**Fluxo de diagnóstico:**
1. Verificar se o procurador já deu ciência via web
2. Confirmar que o sistema do ente está chamando `consultarTeorComunicacao`
3. Verificar se a resposta está sendo processada corretamente

**Solução:**
- Orientar que a consulta de avisos retorna status "Aguardando Abertura"
- Para dar ciência, devem chamar `consultarTeorComunicacao`
- Após essa chamada, status mudará para "Aberto" e prazos começam a contar

**Tempo estimado Fase 6:** 4-6 horas de estudo + experiência prática

---

## FASE 7: BOAS PRÁTICAS E OTIMIZAÇÕES

### 7.1. Performance e Eficiência

**1. Use consultas incrementais**
```xml
<!-- Em vez de consultar tudo sempre -->
<tip:movimentosDesde>20250101000000</tip:movimentosDesde>
```

**2. Verifique hash antes de baixar documentos**
- Mantenha cache local de hashes
- Evite downloads desnecessários
- Economize banda e tempo

**3. Implemente retry logic**
```
Tentativa 1: imediato
Tentativa 2: aguardar 1s
Tentativa 3: aguardar 2s
Tentativa 4: aguardar 4s
Máximo: 3-5 tentativas
```

**4. Use autenticação institucional quando possível**
- Menos problemas com múltiplos perfis
- Melhor rastreabilidade
- Acesso adequado ao nível da instituição

**5. Processe em lote quando possível**
- Agrupar consultas de múltiplos documentos
- Evitar uma requisição por documento

### 7.2. Segurança

**1. Nunca logue senhas**
- Remova senhas dos logs
- Use máscaras em logs de debug

**2. Use HTTPS sempre**
- Nunca HTTP para produção
- Valide certificados SSL

**3. Armazene credenciais de forma segura**
- Use cofre de senhas
- Nunca hardcode no código
- Use variáveis de ambiente

**4. Valide entrada do usuário**
- Sanitize dados antes de montar XML
- Previna XML injection
- Valide tipos de dados

**5. Implemente rate limiting**
- Evite sobrecarga do servidor
- Implemente throttling na aplicação

### 7.3. Monitoramento e Logs

**O que logar:**
1. Timestamp de cada requisição
2. Operação executada
3. Usuário/instituição
4. Número do processo (quando aplicável)
5. Status da resposta (sucesso/erro)
6. Tempo de resposta
7. Mensagem de erro (se houver)

**O que NÃO logar:**
1. Senhas
2. Conteúdo completo de documentos
3. Dados sensíveis de partes
4. Informações de processos sigilosos nível 4 ou 5

**Exemplo de log estruturado:**
```json
{
  "timestamp": "2025-01-13T14:30:45.123Z",
  "operacao": "consultarAvisosPendentes",
  "usuario": "12345678901",
  "sucesso": true,
  "tempoResposta": 245,
  "quantidadeAvisos": 3
}
```

### 7.4. Testes Automatizados

**Criar suite de testes no SoapUI com:**

1. **Testes de Fumaça (Smoke Tests)**
   - Autenticação básica funciona?
   - Serviços estão respondendo?

2. **Testes Funcionais**
   - Cada operação retorna dados esperados?
   - Validações de schema passam?

3. **Testes de Erro**
   - Credenciais inválidas retornam erro adequado?
   - Processo inexistente retorna erro adequado?
   - XML malformado é rejeitado?

4. **Testes de Performance**
   - Tempo de resposta dentro do aceitável?
   - Múltiplas requisições simultâneas funcionam?

**Exemplo de Test Suite no SoapUI:**
```
MNI_TestSuite
├── TS01_Autenticacao
│   ├── TC01_LoginValido
│   ├── TC02_LoginInvalido
│   └── TC03_MultiplosPerfis
├── TS02_ConsultaAvisos
│   ├── TC01_AvisosExistentes
│   ├── TC02_SemAvisos
│   └── TC03_StatusAberto
├── TS03_ConsultaProcesso
│   ├── TC01_ProcessoPublico
│   ├── TC02_ProcessoSigiloso
│   └── TC03_ProcessoInexistente
└── TS04_Peticionamento
    ├── TC01_EnvioSimples
    ├── TC02_ComAnexos
    └── TC03_ArquivoGrande
```

---

## FASE 8: CRIANDO BIBLIOTECA DE SNIPPETS

### 8.1. Organize Templates de Requisições

Crie uma biblioteca de templates reutilizáveis no SoapUI:

**1. Request Templates**
- Salve cada tipo de requisição como template
- Use propriedades para valores dinâmicos
- Documente parâmetros obrigatórios e opcionais

**2. Groovy Scripts Úteis**

**Script 1: Converter PDF para Base64**
```groovy
def filePath = "C:\\temp\\documento.pdf"
def file = new File(filePath)
def bytes = file.bytes
def base64 = bytes.encodeBase64().toString()
testRunner.testCase.setPropertyValue("BASE64_CONTENT", base64)
log.info("Arquivo convertido: " + base64.length() + " caracteres")
```

**Script 2: Decodificar Base64 para PDF**
```groovy
def base64Content = context.expand('${#ResponseAsXml#//ns2:documento}')
def bytes = base64Content.decodeBase64()
def outputPath = "C:\\temp\\documento_baixado.pdf"
new File(outputPath).bytes = bytes
log.info("Documento salvo em: " + outputPath)
```

**Script 3: Calcular Hash SHA-256**
```groovy
import java.security.MessageDigest

def calculateSHA256(byte[] bytes) {
    MessageDigest digest = MessageDigest.getInstance("SHA-256")
    byte[] hash = digest.digest(bytes)
    return hash.encodeHex().toString()
}

def filePath = "C:\\temp\\documento.pdf"
def bytes = new File(filePath).bytes
def hash = calculateSHA256(bytes)
log.info("Hash SHA-256: " + hash)
testRunner.testCase.setPropertyValue("DOCUMENT_HASH", hash)
```

**Script 4: Extrair Avisos da Resposta**
```groovy
def response = context.expand('${#Response}')
def xml = new XmlSlurper().parseText(response)
def avisos = []

xml.'**'.findAll { it.name() == 'aviso' }.each { aviso ->
    def numeroProcesso = aviso.numeroProcesso.text()
    def status = aviso.outroParametro.find { it.@nome == 'status' }.@valor.text()
    def prazo = aviso.outroParametro.find { it.@nome == 'prazo' }.@valor.text()

    avisos << [
        processo: numeroProcesso,
        status: status,
        prazo: prazo
    ]
}

log.info("Avisos encontrados: " + avisos.size())
avisos.each { log.info(it.toString()) }
```

**Script 5: Validar Número de Processo**
```groovy
def numeroProcesso = testRunner.testCase.getPropertyValue("NUMERO_PROCESSO")

// Validar que tem 20 dígitos
assert numeroProcesso != null, "Número do processo não pode ser nulo"
assert numeroProcesso.length() == 20, "Número do processo deve ter 20 dígitos"
assert numeroProcesso.isNumber(), "Número do processo deve conter apenas dígitos"

log.info("Número do processo válido: " + numeroProcesso)
```

### 8.2. Assertions Reutilizáveis

**XPath Assertions comuns:**

1. Verificar sucesso da operação:
```xpath
//ns1:sucesso = 'true'
```

2. Verificar que há avisos:
```xpath
count(//ns1:aviso) > 0
```

3. Validar formato de data:
```xpath
string-length(//ns2:dataDisponibilizacao) = 14
```

4. Verificar número do processo:
```xpath
string-length(//ns2:numeroProcesso) = 20
```

5. Verificar que documento tem hash:
```xpath
string-length(//ns2:hash) > 0
```

### 8.3. Data Driven Testing

**Criar CSV com casos de teste:**

**avisos_test_data.csv:**
```csv
testCase,idConsultante,senhaConsultante,expectedCount
TC01,12345678901,senha123,>=1
TC02,98765432109,outrasenha,0
```

**Usar no SoapUI:**
1. Adicionar DataSource test step
2. Configurar para ler do CSV
3. Adicionar DataSource Loop
4. Referenciar valores: `${DataSource#idConsultante}`

---

## FASE 9: DOCUMENTAÇÃO E CONHECIMENTO

### 9.1. Criar Base de Conhecimento Interna

**Documente:**

1. **Perguntas Frequentes Internas**
   - Compilar perguntas dos chamados
   - Documentar soluções aplicadas
   - Criar índice por tipo de problema

2. **Tutoriais Passo-a-Passo**
   - Como configurar ambiente de testes
   - Como reproduzir problemas comuns
   - Como validar correções

3. **Diagramas e Fluxos**
   - Fluxo de autenticação
   - Fluxo de consulta de processo
   - Fluxo de peticionamento
   - Fluxo de tratamento de erros

4. **Glossário de Termos**
   - MNI: Modelo Nacional de Intercomunicação
   - CNJ: Conselho Nacional de Justiça
   - Aviso: Intimação ou citação eletrônica
   - Polo: Posição no processo (ativo/passivo)
   - Sigilo: Nível de restrição de acesso
   - Etc.

### 9.2. Manter Changelog

**Documentar mudanças nas versões do MNI:**

```markdown
# Changelog MNI

## v3.0.0 (2024)
- Adicionado suporte a novos tipos de documento
- Melhorias na estrutura de polo processual
- Novos códigos de erro

## v2.2.2 (anterior)
- Versão estável anterior
- [Listar diferenças principais]
```

### 9.3. Criar Cheat Sheet

**Exemplo de Cheat Sheet:**

```
═══════════════════════════════════════════════════════════
                    MNI CHEAT SHEET
═══════════════════════════════════════════════════════════

OPERAÇÕES PRINCIPAIS:
├─ consultarAvisosPendentes → Lista intimações/citações
├─ consultarTeorComunicacao → Detalhes de uma intimação
├─ consultarProcesso → Dados do processo
├─ consultarConteudoDocumento → Download de documento
└─ entregarManifestacaoProcessual → Enviar petição

NAMESPACES:
ser: http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/
tip: http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2

AUTENTICAÇÃO:
├─ Pessoal: CPF/sigla + senha
└─ Institucional: ID instituição + senha

FORMATOS DE DADOS:
├─ CPF/CNPJ: 11 ou 14 dígitos
├─ OAB: CCDDDDDDDC (ex: SC1234567A)
├─ Processo: 20 dígitos
├─ Data: AAAAMMDD
└─ DataHora: AAAAMMDDHHMMSS

LIMITES:
├─ Arquivo: 11MB por PDF
├─ Timeout: Configurar >= 60s
└─ Hash: SHA-256

NÍVEIS DE SIGILO:
0=Público, 1=Segredo Justiça, 2-4=Sigilo crescente, 5=Absoluto

ERROS COMUNS:
├─ 401: Autenticação inválida
├─ 404: Processo não encontrado
├─ 500: Erro no servidor / XML inválido
└─ Timeout: Arquivo muito grande / Rede lenta

TOOLS:
├─ SoapUI: Testes de WS
├─ Base64: https://base64.guru
└─ Hash: certutil -hashfile arquivo.pdf SHA256
═══════════════════════════════════════════════════════════
```

---

## FASE 10: PRÁTICA CONTÍNUA E EVOLUÇÃO

### 10.1. Manter-se Atualizado

**1. Acompanhar atualizações do CNJ**
- Verificar portal do CNJ regularmente
- Ler resoluções sobre MNI
- Participar de webinars/treinamentos

**2. Testar novas versões**
- Quando nova versão do MNI for lançada
- Testar retrocompatibilidade
- Documentar breaking changes

**3. Colaborar com outros tribunais**
- Participar de grupos de discussão
- Compartilhar conhecimento
- Aprender com experiências de outros

### 10.2. Melhorar Processos Internos

**1. Análise de Chamados**
- Revisar chamados mensalmente
- Identificar padrões
- Criar automações para problemas recorrentes

**2. Feedback Loop**
- Coletar feedback dos entes
- Melhorar documentação baseado em dúvidas
- Criar tutoriais para gaps identificados

**3. Automação**
- Criar scripts para diagnósticos comuns
- Automatizar testes de regressão
- Implementar monitoramento proativo

### 10.3. Certificação e Especialização

**Áreas para aprofundar:**

1. **Web Services SOAP**
   - WSDL
   - XSD Schemas
   - SOAP Headers e WS-Security

2. **XML Avançado**
   - XPath avançado
   - XSLT transformações
   - Schema validation

3. **Processo Judicial Eletrônico**
   - Fluxos processuais
   - Prazos e intimações
   - Resolução 335/2020 CNJ

4. **Segurança**
   - Certificados digitais
   - Assinatura digital
   - Criptografia

---

## CRONOGRAMA SUGERIDO

### Semana 1: Fundamentos
- [ ] Dia 1-2: Ler toda documentação (Fase 1)
- [ ] Dia 3: Configurar SoapUI (Fase 2)
- [ ] Dia 4-5: Práticas básicas com SoapUI (Fase 3)

### Semana 2: Aprofundamento
- [ ] Dia 1-2: Práticas avançadas (Fase 4)
- [ ] Dia 3-4: Estudar tipos de dados (Fase 5)
- [ ] Dia 5: Revisão e consolidação

### Semana 3: Troubleshooting
- [ ] Dia 1-3: Estudar erros comuns (Fase 6)
- [ ] Dia 4: Boas práticas (Fase 7)
- [ ] Dia 5: Criar biblioteca de snippets (Fase 8)

### Semana 4: Documentação e Prática
- [ ] Dia 1-2: Criar documentação interna (Fase 9)
- [ ] Dia 3-4: Praticar cenários reais
- [ ] Dia 5: Avaliação e planejamento de evolução

**Tempo total estimado:** 4 semanas (80-100 horas)

---

## CHECKLIST DE COMPETÊNCIAS

Ao final do roadmap, você deve ser capaz de:

### Conhecimento Técnico
- [ ] Explicar o que é MNI e seu propósito
- [ ] Listar todas as operações principais
- [ ] Descrever estrutura básica de requisição SOAP
- [ ] Identificar namespaces corretos
- [ ] Validar tipos de dados (CPF, data, número processo)
- [ ] Entender níveis de sigilo
- [ ] Explicar diferença entre autenticação pessoal e institucional

### Habilidades Práticas
- [ ] Configurar e usar SoapUI proficientemente
- [ ] Executar todas as operações do MNI
- [ ] Converter PDF para/de Base64
- [ ] Calcular e validar hash SHA-256
- [ ] Interpretar respostas XML
- [ ] Criar requisições SOAP do zero
- [ ] Usar XPath para extrair dados

### Troubleshooting
- [ ] Diagnosticar problemas de autenticação
- [ ] Identificar erros de XML malformado
- [ ] Resolver problemas de timeout
- [ ] Diagnosticar problemas de permissão/sigilo
- [ ] Validar requisições contra schema
- [ ] Reproduzir problemas no SoapUI
- [ ] Propor soluções adequadas

### Suporte ao Cliente
- [ ] Coletar informações adequadas do ente
- [ ] Comunicar-se de forma clara e técnica
- [ ] Documentar chamados adequadamente
- [ ] Propor workarounds quando necessário
- [ ] Escalar para equipe de desenvolvimento quando apropriado
- [ ] Criar documentação/tutoriais para os entes

---

## RECURSOS ADICIONAIS

### Documentos de Referência
- **Pasta MNI**: C:\Users\david\MNI\
- **FAQ**: FAQ.html
- **Schema Base**: código_base_mni.xsd.xml

### Sites Úteis
- **Portal CNJ**: https://www.cnj.jus.br
- **Base64 Encoder**: https://base64.guru
- **XML Validator**: https://www.xmlvalidation.com
- **JSONLint/XML Lint**: Validadores online

### Ferramentas
- **SoapUI**: Testes de web services
- **Notepad++**: Edição de XML com syntax highlighting
- **Postman**: Alternativa ao SoapUI
- **XMLSpy**: Editor avançado de XML/XSD (pago)

### Comandos Úteis (Windows)
```cmd
# Converter para Base64
certutil -encode arquivo.pdf arquivo.txt

# Calcular hash SHA-256
certutil -hashfile arquivo.pdf SHA256

# Verificar conectividade
telnet [host] [porta]
```

---

## CONCLUSÃO

Este roadmap cobre todo o conhecimento necessário para dar suporte efetivo ao MNI. A prática constante e a experiência com casos reais irão consolidar o aprendizado.

**Lembre-se:**
- Sempre use ambiente de testes/homologação para praticar
- Nunca exponha senhas em logs ou documentação
- Mantenha este roadmap atualizado conforme novas situações surgirem
- Compartilhe conhecimento com a equipe

**Próximos passos após concluir o roadmap:**
1. Atender chamados supervisionados
2. Criar sua própria biblioteca de casos
3. Contribuir para documentação da equipe
4. Mentorar novos membros

---

**Versão:** 1.0
**Data:** 2025-01-13
**Autor:** Suporte Técnico MNI
**Última atualização:** 2025-01-13
