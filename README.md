# MNI Web App

Aplicação web para **teste e aprendizagem** dos web services do MNI (Modelo Nacional de Intercomunicação) do CNJ.

**Objetivo:** Ferramenta educacional para compreender o funcionamento dos web services SOAP do MNI e auxiliar no suporte técnico a entidades que se integram ao eproc.

## ⚠️ IMPORTANTE

**Esta aplicação foi desenvolvida exclusivamente para fins de:**
- **Aprendizagem** sobre integração MNI
- **Testes** em ambiente de homologação
- **Troubleshooting** de problemas relatados por entes públicos
- **Demonstrações** técnicas

**NÃO use em ambiente de produção!**

---

## 🎯 Funcionalidades

### ✅ Implementadas (MVP)

- **Autenticação**: Login via CPF/sigla e senha
- **Avisos Pendentes**: Listar intimações e citações pendentes
- **Consultar Teor**: Visualizar detalhes de uma comunicação
- **Consultar Processo**: Buscar dados de um processo específico
- **Peticionamento**: Upload e envio de manifestações (PDF)

### 🔄 Planejadas (Fase 2)

- Consultar conteúdo de documentos (download)
- Cache de documentos com validação de hash
- Histórico de peticionamentos
- Logs de requisições/respostas SOAP
- Modo debug com visualização de XML
- Interface melhorada para exibição de processos

---

## 🏗️ Arquitetura

```
mni-web-app/
├── backend/              # Servidor Node.js + Express
│   ├── server.js         # Servidor principal
│   ├── routes/           # Rotas da API REST
│   │   ├── auth.js       # Autenticação
│   │   ├── avisos.js     # Avisos pendentes
│   │   └── processos.js  # Processos e peticionamento
│   ├── services/         # Serviços
│   │   └── mniClient.js  # Cliente SOAP para MNI
│   ├── config/           # Configurações
│   │   └── mni.config.js # Configurações do MNI
│   ├── package.json      # Dependências
│   └── .env              # Variáveis de ambiente
│
└── frontend/             # Interface web
    ├── login.html        # Página de login
    ├── index.html        # Dashboard principal
    ├── css/
    │   └── style.css     # Estilos
    └── js/
        ├── login.js      # Lógica de autenticação
        ├── app.js        # Aplicação principal
        ├── utils.js      # Utilitários
        ├── avisos.js     # Gerenciamento de avisos
        ├── processos.js  # Consulta de processos
        └── peticionamento.js  # Upload e envio
```

---

## 🚀 Como Usar

### Pré-requisitos

- **Node.js** 16+ instalado
- **npm** ou **yarn**
- Credenciais de acesso ao ambiente de **homologação** do eproc
- URL do endpoint WSDL do MNI

### Passo 1: Instalar Dependências

```bash
cd mni-web-app/backend
npm install
```

### Passo 2: Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:

```env
# Porta do servidor
PORT=3000

# Endpoints do MNI (substitua pela URL real do tribunal)
MNI_ENDPOINT=https://eproc1g.tjsc.jus.br/eproc/ws/mni
MNI_WSDL_URL=https://eproc1g.tjsc.jus.br/eproc/ws/mni?wsdl

# Namespaces
MNI_NAMESPACE_SERVICE=http://www.cnj.jus.br/servico-intercomunicacao-2.2.2/
MNI_NAMESPACE_TYPES=http://www.cnj.jus.br/tipos-servico-intercomunicacao-2.2.2

# Timeout (ms)
REQUEST_TIMEOUT=60000

# Debug
DEBUG_MODE=true
```

**IMPORTANTE:** Solicite à equipe do tribunal as URLs corretas do endpoint MNI de homologação.

### Passo 3: Iniciar o Servidor

```bash
npm start
```

Ou, para desenvolvimento com auto-reload:

```bash
npm run dev
```

O servidor iniciará em: **http://localhost:3000**

### Passo 4: Acessar a Aplicação

Abra o navegador e acesse:

```
http://localhost:3000/login.html
```

Faça login com suas credenciais de **homologação**.

---

## 📖 Guia de Uso

### 1. Login

- **CPF/Sigla**: Digite seu CPF (11 dígitos) ou sigla de usuário
- **Senha**: Sua senha do eproc
- Clique em **Entrar**

**Nota:** Se você possui múltiplos perfis, use a sigla em vez do CPF.

### 2. Avisos Pendentes

Ao fazer login, a lista de avisos pendentes é carregada automaticamente.

**Informações exibidas:**
- Número do processo (formatado)
- Tipo de intimação/citação
- Data de disponibilização
- Prazo em dias
- Status (Aguardando Abertura / Aberto)

**Ações:**
- **Ver Detalhes**: Consulta o teor completo da comunicação
- **🔄 Atualizar**: Recarrega a lista

### 3. Consultar Processo

- Digite o **número do processo** (20 dígitos)
- Clique em **Consultar**
- Visualize os dados do processo retornados

**Validação:** O número deve ter exatamente 20 dígitos numéricos.

### 4. Peticionamento

**Passos:**

1. Digite o **número do processo** (20 dígitos)
2. Digite o **código do tipo de documento** (conforme tabela do tribunal)
3. **Selecione ou arraste** um arquivo PDF:
   - Tamanho máximo: **11MB**
   - Formato: **PDF** apenas
4. (Opcional) Digite uma **descrição**
5. Clique em **Enviar Petição**

**Resultado:**
- Número do protocolo
- Data/hora do protocolo
- Mensagem de confirmação

---

## 🔧 Desenvolvimento e Customização

### Estrutura de Rotas da API

#### Autenticação

```
POST /api/auth/login
Body: { idConsultante, senhaConsultante }
Response: { success, token, user }
```

#### Avisos

```
GET /api/avisos
Headers: Authorization: Bearer <token>
Response: { success, count, data: [...] }
```

```
GET /api/avisos/:numeroProcesso/:identificadorMovimento
Response: { success, data: { teor da comunicação } }
```

#### Processos

```
GET /api/processos/:numeroProcesso?incluirDocumentos=true
Response: { success, data: { processo } }
```

```
GET /api/processos/:numeroProcesso/documentos/:idDocumento
Response: { success, data: { conteudo: base64, mimetype } }
```

```
POST /api/processos/:numeroProcesso/manifestacoes
Body: { tipoDocumento, documento, nomeDocumento, ... }
Response: { success, data: { numeroProtocolo, dataProtocolo } }
```

### Customizar o Cliente SOAP

O arquivo `backend/services/mniClient.js` contém a lógica de comunicação com o serviço SOAP.

**Métodos principais:**
- `consultarAvisosPendentes()`
- `consultarTeorComunicacao()`
- `consultarProcesso()`
- `consultarConteudoDocumento()`
- `entregarManifestacao()`

**Para ajustar o parsing:**

Os métodos `parseAvisos()`, `parseProcesso()`, etc. devem ser ajustados conforme a **estrutura real** do XML retornado pelo serviço do tribunal.

```javascript
parseAvisos(result) {
    // Ajuste conforme estrutura real do XML
    // Exemplo: result.avisos, result.listAviso, etc.
}
```

### Adicionar Logs de Debug

Ative o modo debug no `.env`:

```env
DEBUG_MODE=true
```

Os logs serão exibidos no console do servidor.

---

## 🐛 Troubleshooting

### Erro: "Falha ao conectar com o serviço MNI"

**Causas:**
- URL do WSDL incorreta
- Serviço MNI indisponível
- Problemas de rede/firewall

**Solução:**
1. Verifique a URL no arquivo `.env`
2. Teste o WSDL no navegador
3. Verifique logs do servidor

### Erro: "Autenticação inválida"

**Causas:**
- CPF/sigla ou senha incorretos
- Usuário com múltiplos perfis tentando usar CPF
- Credenciais de produção em ambiente de homologação (ou vice-versa)

**Solução:**
1. Verifique as credenciais
2. Use sigla em vez de CPF
3. Confirme que está usando credenciais de homologação

### Erro: "Processo não encontrado"

**Causas:**
- Número do processo incorreto
- Processo não existe nesta instância
- Falta de permissão (sigilo)

**Solução:**
1. Valide o número do processo (20 dígitos)
2. Verifique se o processo tramita nesta instância
3. Confirme permissões de acesso

### Erro: "Arquivo muito grande"

**Causas:**
- PDF maior que 11MB

**Solução:**
1. Comprima o PDF
2. Divida em múltiplos documentos
3. Use ferramentas de otimização de PDF

---

## 📚 Recursos Adicionais

### Documentação do MNI

Consulte os documentos na pasta raiz:
- `FAQ.html` - Perguntas frequentes
- `tipos_intercomunicacao_mni_222.html` - Tipos de dados
- `ROADMAP_APRENDIZAGEM_MNI.md` - Guia completo de aprendizagem

### Referências

- **Portal CNJ**: https://www.cnj.jus.br
- **Resolução CNJ 335/2020**: Regulamenta o PJe e MNI
- **Documentação SOAP**: https://www.w3.org/TR/soap/

---

## 🛠️ Melhorias Futuras

- [ ] Implementar download de documentos
- [ ] Cache inteligente com validação de hash
- [ ] Histórico de operações realizadas
- [ ] Modo debug com visualização de XML SOAP
- [ ] Testes automatizados (Jest)
- [ ] Autenticação JWT real
- [ ] Suporte a múltiplas instâncias/tribunais
- [ ] Interface melhorada para exibição de processos
- [ ] Export de dados para Excel/PDF
- [ ] Dashboard de métricas e estatísticas

---

## 📝 Notas de Desenvolvimento

### Adaptações Necessárias

O parsing dos dados retornados pelo serviço SOAP está **simplificado** nesta versão. Será necessário ajustar os métodos de parse em `mniClient.js` conforme a **estrutura real** do XML retornado pelo tribunal.

**Arquivos que podem necessitar ajustes:**
- `backend/services/mniClient.js` - Métodos `parseAvisos()`, `parseProcesso()`, etc.
- `frontend/js/avisos.js` - Renderização de avisos
- `frontend/js/processos.js` - Renderização de processos

### Segurança

**Implementações atuais (simplificadas):**
- Token básico (Base64 de credenciais)
- Sem hash de senhas
- Sem rate limiting

**Para produção seria necessário:**
- JWT tokens
- Hash de senhas (bcrypt)
- Rate limiting (express-rate-limit)
- HTTPS obrigatório
- CORS configurado corretamente
- Validação de entrada robusta

**Esta aplicação é apenas para aprendizagem/testes!**

---

## 🤝 Contribuindo

Este é um projeto educacional. Sinta-se livre para:
- Adicionar funcionalidades
- Melhorar a interface
- Corrigir bugs
- Adicionar documentação
- Compartilhar conhecimento

---

## 📄 Licença

MIT - Livre para uso educacional e de testes.

---

## 👤 Autor

Desenvolvido como ferramenta de aprendizagem para suporte técnico ao MNI.

**Contato:** [Seu contato aqui]

---

## 🙏 Agradecimentos

- CNJ - Pela padronização através do MNI
- Tribunais - Pela disponibilização de ambientes de testes
- Comunidade de desenvolvedores do PJe

---

**Versão:** 1.0.0
**Última atualização:** 2025-01-13
