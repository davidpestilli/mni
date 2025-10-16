# ✅ Correções Aplicadas - Erro "Invalid URL"

## 📋 Problemas Identificados

1. **Erro "Invalid URL"**: A biblioteca SOAP estava usando o endpoint do WSDL, não o configurado no `.env`
2. **Senha sem hash SHA256**: O MNI exige senha no formato SHA256 com data

---

## 🔧 Correções Implementadas

### 1. Correção do Endpoint SOAP

**Arquivo:** `backend/services/mniClient.js`

**O que foi feito:**
- Adicionado `client.setEndpoint()` para configurar o endpoint manualmente
- Adicionada validação de configurações antes de inicializar
- Melhorado o log de debug

**Trecho corrigido:**
```javascript
async initialize() {
    // Validar configurações
    if (!this.config.wsdlUrl || !this.config.endpoint) {
        throw new Error('WSDL URL ou Endpoint não configurado no arquivo .env');
    }

    this.client = await soap.createClientAsync(this.config.wsdlUrl, options);

    // IMPORTANTE: Configurar o endpoint manualmente
    if (this.client && this.config.endpoint) {
        this.client.setEndpoint(this.config.endpoint);
    }
}
```

### 2. Implementação de Hash SHA256 para Senha

**Arquivo:** `backend/services/hashUtils.js` (NOVO)

**O que foi feito:**
- Criado módulo para gerar hash SHA256
- Formato: `DD-MM-YYYYSenha` → SHA256

**Exemplo:**
```javascript
// Hoje: 13-10-2025
// Senha: Senha@123456
// String: "13-10-2025Senha@123456"
// Hash: [SHA256 dessa string]
```

### 3. Aplicação do Hash em Todas as Rotas

**Arquivos atualizados:**
- `backend/routes/auth.js`
- `backend/routes/avisos.js`
- `backend/routes/processos.js`

**O que foi feito:**
- Importado `gerarSenhaHashMNI` em todas as rotas
- Senha original é recebida do frontend
- Hash SHA256 é calculado antes de enviar ao MNI
- Token armazena senha original (pois hash muda diariamente)

---

## 🧪 Como Testar

### Passo 1: Verificar arquivo .env

```bash
cd backend
type .env
```

**Deve conter:**
```env
MNI_ENDPOINT=https://eproc1g.tjsc.jus.br/eproc/ws/mni
MNI_WSDL_URL=https://eproc1g.tjsc.jus.br/eproc/ws/mni?wsdl
```

**IMPORTANTE:**
- ⚠️ Sem espaços extras
- ⚠️ Sem aspas
- ⚠️ URLs corretas do seu tribunal

### Passo 2: Reiniciar o servidor

```bash
# Parar o servidor (Ctrl+C)

# Reiniciar
npm start
```

### Passo 3: Testar login

1. Acesse: `http://localhost:3000/login.html`
2. Digite:
   - **Usuário**: TesteSGS
   - **Senha**: Senha@123456 (senha ORIGINAL, sem hash)
3. Clique em **Entrar**

### Passo 4: Verificar logs do servidor

No terminal do servidor, você deve ver:

```
[MNI] Cliente SOAP inicializado
[MNI] Endpoint configurado: https://eproc1g.tjsc.jus.br/eproc/ws/mni
[MNI] Métodos disponíveis: [...]
[AUTH] Senha com hash SHA256: [hash gerado]
[MNI] Consultando avisos pendentes para: TesteSGS
```

✅ **Se funcionar:** Nenhum erro "Invalid URL"
❌ **Se ainda der erro:** Ver seção de troubleshooting abaixo

---

## 🔍 Verificação do Hash SHA256

Para confirmar que o hash está correto, você pode testar manualmente:

### No Node.js (terminal):

```bash
node
```

```javascript
const crypto = require('crypto');

function gerarSenhaHashMNI(senha) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    const senhaComData = `${dia}-${mes}-${ano}${senha}`;
    return crypto.createHash('sha256').update(senhaComData, 'utf8').digest('hex');
}

// Testar com a senha de hoje
console.log(gerarSenhaHashMNI('Senha@123456'));
```

Compare o hash gerado com o que aparece no log do servidor.

---

## 🐛 Troubleshooting

### Erro continua: "Invalid URL"

**Possíveis causas:**

1. **Endpoint vazio ou undefined**
   ```bash
   # Verificar se as variáveis estão sendo carregadas
   node
   > require('dotenv').config();
   > console.log(process.env.MNI_ENDPOINT);
   ```

2. **Arquivo .env no local errado**
   - Deve estar em: `backend/.env`
   - Não em: `mni-web-app/.env`

3. **Formato de URL incorreto**
   ```
   ✅ Correto: https://dominio.com/path
   ❌ Errado:  http://dominio.com/path (sem s)
   ❌ Errado:  dominio.com/path (sem protocolo)
   ```

### Erro: "Autenticação inválida"

**Possíveis causas:**

1. **Formato da data incorreto**
   - Confirme que está usando `DD-MM-YYYY` (ex: 13-10-2025)
   - Não `DD/MM/YYYY` ou `YYYY-MM-DD`

2. **Senha incorreta**
   - Verifique a senha original
   - Certifique-se de que não há espaços extras

3. **Fuso horário**
   - O servidor do MNI pode estar em fuso diferente
   - Pode ser necessário ajustar a data

### Erro: "Cannot find module 'crypto'"

O módulo `crypto` é nativo do Node.js. Se der esse erro:

```bash
node --version  # Verificar versão (deve ser 16+)
```

---

## 📝 Detalhes Técnicos

### Como funciona o Hash SHA256 com Data

1. **Servidor MNI recebe**: Hash SHA256
2. **Hash é gerado de**: `DD-MM-YYYYSenhaOriginal`
3. **Muda diariamente**: Cada dia tem um hash diferente
4. **Segurança**: Mesmo que interceptem, hash é válido só hoje

### Por que armazenar senha original no token?

```javascript
// Token armazena: idConsultante:senhaOriginal (em Base64)
token: Buffer.from(`${idConsultante}:${senhaConsultante}`).toString('base64')
```

**Motivo:**
- Hash muda todo dia (DD-MM-YYYY)
- Se armazenássemos o hash, expiraria à meia-noite
- Armazenando senha original, recalculamos hash a cada requisição

**Nota de segurança:**
⚠️ Em produção, use JWT com expiração e refresh tokens adequados!

---

## ✅ Checklist de Verificação

Antes de considerar o problema resolvido:

- [ ] Arquivo `.env` configurado corretamente
- [ ] Servidor reiniciado após alterações
- [ ] Log mostra "Endpoint configurado: [URL]"
- [ ] Log mostra "Senha com hash SHA256: [hash]"
- [ ] Nenhum erro "Invalid URL" nos logs
- [ ] Login bem-sucedido OU erro de autenticação claro (não URL)

---

## 📞 Próximos Passos

Se o erro **"Invalid URL" foi resolvido** mas há **erro de autenticação**:

1. Confirme com a equipe do tribunal:
   - Formato exato do hash de senha
   - Se há algum prefixo/sufixo adicional
   - Se a data está no formato correto

2. Peça um exemplo de hash válido:
   - Para conferir se seu algoritmo está correto

3. Verifique se o endpoint é realmente o correto:
   - Pode haver endpoints diferentes para homologação/produção

---

**Data das correções:** 2025-01-13
**Arquivos modificados:** 5
**Novos arquivos:** 1
