# ✅ Implementação Concluída: Peticionamento Inicial MNI

## 📋 Resumo

Foi implementado com sucesso o serviço de **Peticionamento Inicial** para o MNI Web App, permitindo a criação de novos processos judiciais através da interface web e API REST.

---

## 🎯 O que foi implementado

### 1. Backend - Serviços

#### ✅ `mniClient.js` - Expandido
**Arquivo**: `mni-web-app/backend/services/mniClient.js`

**Novos Métodos**:
- `peticionamentoInicial()` - Método principal para criar novo processo
- `validarDadosIniciais()` - Validação de campos obrigatórios
- `montarPolo()` - Montagem da estrutura de polos (partes)
- `parsePeticionamentoInicial()` - Parse da resposta com número do processo

**Características**:
- Suporte para pessoa física e jurídica
- Validação completa de campos obrigatórios
- Múltiplos documentos (petição inicial + anexos)
- Assinatura digital opcional
- Retorna número do processo gerado

---

#### ✅ `tabelaClient.js` - Expandido
**Arquivo**: `mni-web-app/backend/services/tabelaClient.js`

**Novos Métodos**:
- `consultarLocalidades()` - Consultar comarcas do TJSP
- `consultarOrgaosJulgadores()` - Consultar órgãos julgadores
- `consultarCompetencias()` - Consultar competências

**Tabelas Disponíveis**:
- ✅ LocalidadeJudicial (345 registros)
- ✅ TipoDocumento (557 registros)
- ⚠️ ClasseProcessual (requer autenticação específica)
- ⚠️ AssuntoProcessual (requer autenticação específica)

---

### 2. Backend - Rotas

#### ✅ `peticionamento.js` - NOVO
**Arquivo**: `mni-web-app/backend/routes/peticionamento.js`

**Endpoints**:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/peticionamento/inicial` | Criar novo processo |
| POST | `/api/peticionamento/intermediario` | Manifestação em processo existente |
| GET | `/api/peticionamento/tipos-documento` | Listar tipos de documento |

---

#### ✅ `tabelas.js` - Expandido
**Arquivo**: `mni-web-app/backend/routes/tabelas.js`

**Novos Endpoints**:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/tabelas/localidades/listar` | Listar 345 comarcas do TJSP |
| GET | `/api/tabelas/classes-processuais/listar` | Listar classes processuais |
| GET | `/api/tabelas/assuntos/listar` | Listar assuntos processuais |

---

### 3. Frontend

#### ✅ `peticionamento-inicial.html` - NOVO
**Arquivo**: `mni-web-app/frontend/peticionamento-inicial.html`

**Funcionalidades**:
- Formulário completo para peticionamento inicial
- Carregamento automático de localidades
- Adição dinâmica de múltiplas partes (autores e réus)
- Suporte para pessoa física e jurídica
- Upload de múltiplos documentos PDF
- Validação de campos obrigatórios
- Exibição do resultado com número do processo

---

#### ✅ `peticionamento-inicial.js` - NOVO
**Arquivo**: `mni-web-app/frontend/js/peticionamento-inicial.js`

**Funções**:
- `carregarLocalidades()` - Carrega comarcas do TJSP
- `adicionarParte()` / `removerParte()` - Gerenciamento de partes
- `toggleTipoPessoa()` - Alternância entre PF e PJ
- `fileToBase64()` - Conversão de PDF para Base64
- `handleSubmit()` - Envio da petição para API

---

#### ✅ `index.html` - Atualizado
**Arquivo**: `mni-web-app/frontend/index.html`

**Mudanças**:
- Adicionado botão de acesso ao Peticionamento Inicial
- Distinção clara entre Inicial e Intermediário
- Interface reorganizada na aba de Peticionamento

---

### 4. Documentação

#### ✅ `GUIA_PETICIONAMENTO_INICIAL.md` - NOVO
**Arquivo**: `GUIA_PETICIONAMENTO_INICIAL.md`

**Conteúdo**:
- Guia completo de uso
- Passo a passo detalhado
- Campos obrigatórios e opcionais
- Exemplos de payload JSON
- Troubleshooting
- Diferenças entre Inicial e Intermediário

---

## 📊 Estrutura de Dados

### Request - Peticionamento Inicial

```json
{
  "cpfSigla": "12345678901",
  "senha": "senha123",
  "codigoLocalidade": "9061",
  "classeProcessual": "155",
  "assunto": "4907",
  "valorCausa": 10000.00,
  "competencia": "114",
  "nivelSigilo": 0,
  "poloAtivo": [
    {
      "tipoPessoa": "fisica",
      "nome": "João da Silva",
      "cpf": "12345678901",
      "dataNascimento": "01/01/1980",
      "sexo": "Masculino"
    }
  ],
  "poloPassivo": [
    {
      "tipoPessoa": "juridica",
      "nome": "Empresa XYZ LTDA",
      "cnpj": "12345678000199"
    }
  ],
  "documentos": [
    {
      "tipoDocumento": 1,
      "conteudo": "BASE64_STRING",
      "nomeDocumento": "Petição Inicial.pdf",
      "signatario": "12345678901"
    }
  ]
}
```

### Response - Sucesso

```json
{
  "success": true,
  "message": "Processo distribuído com sucesso",
  "data": {
    "numeroProcesso": "50349435820164047100",
    "protocoloRecebimento": "771400082956387730110000000001",
    "dataOperacao": "13/01/2025 14:05:30",
    "recibo": "BASE64_PDF"
  }
}
```

---

## 🧪 Como Testar

### 1. Iniciar o Backend

```bash
cd mni-web-app/backend
node server.js
```

### 2. Acessar a Interface

Abra o navegador em: `http://localhost:3000`

### 3. Testar Peticionamento Inicial

1. Clique na aba **"Peticionamento"**
2. Clique em **"📝 Peticionamento Inicial (Novo Processo)"**
3. Preencha o formulário:
   - Credenciais de autenticação
   - Selecione a comarca
   - Informe classe processual
   - Adicione partes (autor e réu)
   - Anexe a petição inicial em PDF
4. Clique em **"📨 Enviar Petição Inicial"**
5. Aguarde o resultado com o número do processo

### 4. Testar via API

```bash
# Consultar localidades
curl http://localhost:3000/api/tabelas/localidades/listar

# Enviar peticionamento inicial
curl -X POST http://localhost:3000/api/peticionamento/inicial \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

## 📁 Arquivos Criados/Modificados

### ✨ Novos Arquivos

```
mni-web-app/backend/routes/peticionamento.js
mni-web-app/frontend/peticionamento-inicial.html
mni-web-app/frontend/js/peticionamento-inicial.js
GUIA_PETICIONAMENTO_INICIAL.md
IMPLEMENTACAO_PETICIONAMENTO_INICIAL.md
```

### 📝 Arquivos Modificados

```
mni-web-app/backend/services/mniClient.js
mni-web-app/backend/services/tabelaClient.js
mni-web-app/backend/routes/tabelas.js
mni-web-app/backend/server.js
mni-web-app/frontend/index.html
```

---

## 🔍 Próximos Passos Sugeridos

### 1. Obter Tabelas Completas
Algumas tabelas (ClasseProcessual, AssuntoProcessual) retornam erro de autorização. Opções:
- Solicitar credenciais específicas ao tribunal
- Criar tabelas estáticas baseadas na documentação CNJ
- Usar endpoint alternativo se disponível

### 2. Melhorias na Interface
- Adicionar busca/filtro nas listas de localidades
- Auto-completar campos de classe e assunto
- Validação de CPF/CNPJ
- Máscara para datas e documentos
- Preview do PDF antes de enviar

### 3. Validações Adicionais
- Validar formato de data de nascimento
- Validar CPF/CNPJ (dígitos verificadores)
- Validar tamanho de arquivos PDF
- Validar se classe existe na tabela

### 4. Testes
- Criar testes unitários para mniClient
- Criar testes de integração para API
- Testar com ambiente de produção do TJSP

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação: `GUIA_PETICIONAMENTO_INICIAL.md`
2. Verifique o arquivo de diferenças: `PETICIONAMENTO_INICIAL_VS_INTERMEDIARIO.md`
3. Consulte os logs no console do navegador e terminal

---

## ✅ Checklist de Implementação

- [x] Expandir mniClient para suportar peticionamento inicial
- [x] Adicionar métodos de consulta de tabelas no tabelaClient
- [x] Criar rotas de API para peticionamento inicial
- [x] Criar rotas de API para tabelas (localidades, classes, assuntos)
- [x] Criar interface HTML para peticionamento inicial
- [x] Criar JavaScript para formulário dinâmico
- [x] Integrar com API backend
- [x] Atualizar index.html com link para peticionamento inicial
- [x] Criar documentação de uso
- [x] Testar consulta de localidades (✅ 345 registros)
- [x] Testar consulta de tipos de documento (✅ 557 registros)

---

**Status**: ✅ IMPLEMENTAÇÃO CONCLUÍDA

**Data**: 14/01/2025

**Versão**: 1.0
