# 📝 Guia de Peticionamento Inicial - MNI Web App

## Sumário
1. [Visão Geral](#visão-geral)
2. [Como Acessar](#como-acessar)
3. [Passo a Passo](#passo-a-passo)
4. [Campos Obrigatórios](#campos-obrigatórios)
5. [Tabelas de Referência](#tabelas-de-referência)
6. [Exemplo Completo](#exemplo-completo)
7. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O **Peticionamento Inicial** permite criar um novo processo judicial através do MNI (Modelo Nacional de Interoperabilidade). Ao contrário do peticionamento intermediário (que envia manifestações em processos existentes), o peticionamento inicial:

- ✅ Cria um novo processo no sistema do tribunal
- ✅ Retorna o número do processo gerado
- ✅ Requer informações completas das partes (autor e réu)
- ✅ Exige especificação de classe, assunto e localidade

---

## Como Acessar

### Via Interface Web

1. Acesse o MNI Web App: `http://localhost:3000`
2. Faça login com suas credenciais
3. Clique na aba **"Peticionamento"**
4. Clique no botão **"📝 Peticionamento Inicial (Novo Processo)"**

### Via API (Programático)

```bash
POST http://localhost:3000/api/peticionamento/inicial
Content-Type: application/json
```

---

## Passo a Passo

### 1. Autenticação

Informe suas credenciais:
- **CPF/Sigla**: CPF do procurador ou sigla da entidade (ex: `12345678901`)
- **Senha**: Senha cadastrada no sistema MNI

### 2. Dados do Processo

#### Localidade Judicial (Obrigatório)
Selecione a comarca onde o processo será distribuído.

**Exemplo**: São Paulo (9061), Campinas (9062), etc.

> 💡 A lista de localidades é carregada automaticamente do TJSP

#### Classe Processual (Obrigatório)
Informe o código da classe processual.

**Exemplos comuns**:
- `155` - Execução Fiscal
- `436` - Execução de Título Extrajudicial
- `11` - Procedimento Comum Cível

#### Assunto (Opcional)
Código do assunto principal do processo.

**Exemplos**:
- `4907` - IPTU
- `11238` - ISS
- `8349` - Dano Material

#### Valor da Causa (Opcional)
Valor monetário da causa em reais.

**Exemplo**: `10000.00`

#### Competência (Opcional)
Código de competência, se aplicável.

**Exemplo**: `114` (Juizado Especial)

#### Nível de Sigilo
Selecione o nível de sigilo do processo:
- `0` - Público (padrão)
- `1` - Segredo de Justiça
- `2` - Sigilo

### 3. Polo Ativo (Autor/Autores)

Informe os dados de **ao menos uma parte** no polo ativo.

#### Pessoa Física
- Nome Completo
- CPF (somente números)
- Data de Nascimento (DD/MM/AAAA)
- Sexo (Masculino/Feminino)

#### Pessoa Jurídica
- Razão Social
- CNPJ (somente números)

> 💡 Para adicionar mais autores, clique em **"+ Adicionar Autor"**

### 4. Polo Passivo (Réu/Réus)

Informe os dados de **ao menos uma parte** no polo passivo.

Mesmos campos que o polo ativo.

> 💡 Para adicionar mais réus, clique em **"+ Adicionar Réu"**

### 5. Documentos

#### Petição Inicial (Obrigatório)
Anexe o arquivo PDF da petição inicial.

- Formato: PDF
- Tamanho máximo: recomendado até 11MB

#### CPF do Signatário (Opcional)
Informe o CPF de quem assina a petição.

**Exemplo**: `12345678901`

#### Documentos Adicionais (Opcional)
Anexe documentos complementares (procuração, documentos pessoais, etc.)

- Formato: PDF
- Múltiplos arquivos permitidos

### 6. Enviar

Clique em **"📨 Enviar Petição Inicial"**

---

## Campos Obrigatórios

### ❗ Sempre Obrigatórios

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| CPF/Sigla | Credencial de acesso | `12345678901` |
| Senha | Senha MNI | `********` |
| Localidade | Código da comarca | `9061` (São Paulo) |
| Classe Processual | Código da classe | `155` (Execução Fiscal) |
| Polo Ativo | Ao menos 1 autor | João da Silva, CPF 123... |
| Polo Passivo | Ao menos 1 réu | Maria Santos, CPF 987... |
| Petição Inicial | Arquivo PDF | `peticao_inicial.pdf` |

### 📋 Opcionais (mas recomendados)

- Assunto
- Valor da Causa
- CPF do Signatário
- Documentos Adicionais

---

## Tabelas de Referência

### Consultar Localidades

```bash
GET http://localhost:3000/api/tabelas/localidades/listar
```

**Resposta**:
```json
{
  "success": true,
  "count": 345,
  "data": [
    {
      "codigo": "9061",
      "descricao": "São Paulo",
      "uf": "SP"
    },
    ...
  ]
}
```

### Consultar Tipos de Documento

```bash
GET http://localhost:3000/api/tabelas/tipos-documento/listar
```

---

## Exemplo Completo

### Payload JSON

```json
{
  "cpfSigla": "12345678901",
  "senha": "minhaSenha123",
  "codigoLocalidade": "9061",
  "classeProcessual": "155",
  "assunto": "4907",
  "valorCausa": 10000.00,
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
      "razaoSocial": "Empresa XYZ LTDA",
      "cnpj": "12345678000199"
    }
  ],
  "documentos": [
    {
      "tipoDocumento": 1,
      "conteudo": "JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9Uel...",
      "nomeDocumento": "Petição Inicial.pdf",
      "mimetype": "application/pdf",
      "nivelSigilo": 0,
      "signatario": "12345678901"
    }
  ]
}
```

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Processo distribuído com sucesso",
  "data": {
    "numeroProcesso": "50349435820164047100",
    "protocoloRecebimento": "771400082956387730110000000001",
    "dataOperacao": "13/01/2025 14:05:30",
    "recibo": "JVBERi0xLjQKJeLjz9MKN..."
  }
}
```

> ⚠️ **IMPORTANTE**: Guarde o **numeroProcesso** retornado! Ele será usado para consultas e peticionamentos futuros.

---

## Troubleshooting

### ❌ "Erro: Campo obrigatório ausente: codigoLocalidade"

**Solução**: Selecione uma comarca na lista de localidades.

---

### ❌ "Erro: É necessário informar ao menos uma parte no polo ativo"

**Solução**: Preencha os dados de ao menos um autor.

---

### ❌ "Erro: É necessário anexar ao menos um documento (Petição Inicial)"

**Solução**: Anexe o arquivo PDF da petição inicial.

---

### ❌ "Erro: 101: Dados nao disponiveis ou nao autorizados"

**Solução**:
- Verifique se suas credenciais estão corretas
- Algumas tabelas podem não estar disponíveis publicamente
- Entre em contato com o suporte do tribunal

---

### ❌ "Erro ao conectar com o serviço MNI"

**Solução**:
1. Verifique se o backend está rodando (`http://localhost:3000`)
2. Verifique o arquivo `.env` com as configurações corretas:
```env
WSDL_URL=https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=entregarManifestacao&wsdl
ENDPOINT=https://eproc1g.tjsp.jus.br/eproc/ws/controlador_ws.php?srv=entregarManifestacao
```

---

## Diferença: Peticionamento Inicial vs Intermediário

| Aspecto | Inicial | Intermediário |
|---------|---------|---------------|
| **Quando usar** | Criar novo processo | Manifestar em processo existente |
| **Campo principal** | `dadosBasicos` | `numeroProcesso` |
| **Retorno** | Número do processo criado | Confirmação de recebimento |
| **Partes** | Obrigatório informar | Não é necessário |
| **Classe/Assunto** | Obrigatório | Não é necessário |
| **Localidade** | Obrigatório | Não é necessário |

---

## Referências

- **Documentação MNI 2.2.2**: [CNJ - Modelo Nacional de Interoperabilidade](https://www.cnj.jus.br/programas-e-acoes/mni-modelo-nacional-de-interoperabilidade/)
- **WSDL TJSP**: `https://eproc1g.tjsp.jus.br/eproc/ws/entregarManifestacao.wsdl`
- **Arquivo de referência**: `/PETICIONAMENTO_INICIAL_VS_INTERMEDIARIO.md`

---

**Versão**: 1.0
**Data**: 2025-01-14
**Autor**: MNI Web App Team
