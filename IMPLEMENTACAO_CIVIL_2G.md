# ✅ Implementação do Ambiente Civil 2G Homologação

## 📋 Resumo da Implementação

Foi adicionado com sucesso o ambiente **Civil 2G Homologação** ao sistema MNI Web App. Este ambiente utiliza o **MNI 3.0** e permite integração com o sistema e-Proc de Segunda Instância (Tribunal de Justiça - Instância Recursal) do TJSP.

---

## ✨ O que foi implementado

### 1. ✅ Configuração de Endpoints (.env)

**Arquivo**: `backend/.env`

Adicionados os seguintes endpoints:

```env
# MNI 3.0 - CIVIL 2G (2º Grau)
MNI_3_0_CIVIL_2G_HML_ENDPOINT=https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=intercomunicacao3.0
MNI_3_0_CIVIL_2G_HML_WSDL_URL=https://eproc-2g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl

CIVIL_2G_TABELA_ENDPOINT=https://eproc-2g-sp-hml.tjsp.jus.br/ws/controlador_ws.php?srv=consultarTabela
CIVIL_2G_TABELA_WSDL_URL=https://eproc-2g-sp-hml.tjsp.jus.br/ws/consultarTabela.wsdl
```

**Funcionalidades suportadas:**
- ✅ Consulta de avisos pendentes
- ✅ Consulta de processos
- ✅ Peticionamento intermediário
- ✅ Consulta de tabelas (localidades, classes, assuntos, competências)
- ✅ Todas as operações do MNI 3.0

---

### 2. ✅ Configuração Backend (ambiente.js)

**Arquivo**: `backend/config/ambiente.js`

**Adicionado sistema 2G_CIVIL:**
```javascript
const SISTEMAS_DISPONÍVEIS = {
    '1G_CIVIL': { ... },
    '1G_EXEC_FISCAL': { ... },
    '2G_CIVIL': {
        nome: 'Segundo Grau Civil (Instância Recursal)',
        ambientesDisponiveis: ['HML']
    }
};
```

**Adicionada lógica de roteamento:**
```javascript
function getEndpoints3_0() {
    // ...
    if (sistema === '2G_CIVIL') {
        endpoint = process.env.MNI_3_0_CIVIL_2G_HML_ENDPOINT;
        wsdlUrl = process.env.MNI_3_0_CIVIL_2G_HML_WSDL_URL;
    }
    // ...
}
```

---

### 3. ✅ Interface de Login (login.html)

**Arquivo**: `frontend/login.html`

**Adicionada opção no seletor:**
```html
<select id="select-sistema-login">
    <option value="1G_CIVIL" selected>Civil 1ª Instância</option>
    <option value="1G_EXEC_FISCAL">Execução Fiscal</option>
    <option value="2G_CIVIL">Civil 2ª Instância (Recursal)</option>
</select>
```

---

### 4. ✅ Configuração Frontend (ambiente.js)

**Arquivo**: `frontend/js/ambiente.js`

**Adicionado sistema na configuração:**
```javascript
const SISTEMAS_CONFIG = {
    '1G_CIVIL': { ... },
    '1G_EXEC_FISCAL': { ... },
    '2G_CIVIL': {
        nome: 'Segundo Grau Civil (Instância Recursal)',
        ambientesDisponiveis: ['HML']
    }
};
```

**Adicionado emoji e indicador visual:**
```javascript
if (sistema === '2G_CIVIL') {
    emojiSistema = '🏛️';
}
```

---

### 5. ✅ Documentação Completa

**Arquivo**: `documentos/CIVIL_2G_HOMOLOGACAO.md`

Documentação completa incluindo:
- ✅ Endpoints configurados
- ✅ Operações disponíveis (15 operações MNI 3.0)
- ✅ Exemplos de uso
- ✅ Como testar
- ✅ Comparação com outros ambientes
- ✅ Links úteis

---

## 🔄 Como o Roteamento Funciona

### Fluxo Automático:

```
1. Usuário seleciona no Login:
   Sistema: Civil 2ª Instância (Recursal)
   Ambiente: Homologação
   
2. Frontend salva no localStorage:
   mni_sistema_selecionado = '2G_CIVIL'
   
3. Backend detecta sistema:
   ambiente.js → getSistemaAtual() → '2G_CIVIL'
   
4. Endpoints são carregados:
   getEndpoints3_0() → MNI_3_0_CIVIL_2G_HML_*
   
5. Todas as requisições MNI 3.0 apontam para:
   https://eproc-2g-sp-hml.tjsp.jus.br/ws/...
```

### Rotas Afetadas Automaticamente:

```javascript
// Todas essas rotas usam os endpoints Civil 2G quando selecionado
GET  /api/avisos-v3
GET  /api/processos/:numeroProcesso
GET  /api/mni3/localidades
GET  /api/mni3/competencias/:codigo
GET  /api/mni3/classes/:codigo
GET  /api/mni3/assuntos/:codigo/:classe
POST /api/mni3/peticao
POST /api/mni3/peticao-inicial (se aplicável)
```

---

## 🎯 Vantagens da Implementação

### ✅ Sem "Reinventar a Roda"
- Reutiliza toda infraestrutura MNI 3.0 já implementada
- Mesmas rotas do Execução Fiscal
- Mesmos métodos e parsers

### ✅ Roteamento Inteligente
- Seleção no login determina endpoints automaticamente
- Backend gerencia mudanças de ambiente/sistema
- Frontend não precisa saber os endpoints

### ✅ Escalável
- Adicionar novos ambientes é simples (3 arquivos)
- Não quebra código existente
- Fácil adicionar PROD quando disponível

---

## 🧪 Como Testar

### 1. Iniciar o Servidor
```bash
cd backend
npm start
```

Você verá no console:
```
════════════════════════════════════════════════
   MNI Web App Backend
   Rodando em: http://localhost:3000
   Ambiente: development
════════════════════════════════════════════════
```

### 2. Acessar o Login
```
http://localhost:3000/login.html
```

### 3. Selecionar Civil 2G
1. No dropdown **Sistema**, selecione: **Civil 2ª Instância (Recursal)**
2. No dropdown **Ambiente**, confirme: **Homologação**
3. Observe o indicador visual: **🏛️ HML**

### 4. Fazer Login
Use credenciais de teste do ambiente Civil 2G do TJSP.

### 5. Validar Roteamento
Abra o DevTools (F12) e vá para a aba **Network**. Ao fazer consultas, você verá requisições para:
```
https://eproc-2g-sp-hml.tjsp.jus.br/ws/...
```

### 6. Testar Funcionalidades
- ✅ Consultar avisos pendentes
- ✅ Consultar processo por número
- ✅ Peticionar em processo existente

---

## 📊 Comparação de Ambientes

| Sistema | Instância | MNI | HML | PROD | Emoji |
|---------|-----------|-----|-----|------|-------|
| **1G Civil** | 1º Grau | 2.2 e 3.0 | ✅ | ✅ | ⚖️ |
| **1G Exec. Fiscal** | 1º Grau | 3.0 | ✅ | ❌ | 💰 |
| **2G Civil** | **2º Grau** | **3.0** | **✅** | **❌** | **🏛️** |

---

## 📝 Arquivos Modificados

### Backend
1. ✅ `backend/.env` - Adicionados endpoints Civil 2G
2. ✅ `backend/config/ambiente.js` - Adicionado sistema 2G_CIVIL

### Frontend
3. ✅ `frontend/login.html` - Adicionada opção no select
4. ✅ `frontend/js/ambiente.js` - Configuração do sistema

### Documentação
5. ✅ `documentos/CIVIL_2G_HOMOLOGACAO.md` - Documentação completa
6. ✅ `IMPLEMENTACAO_CIVIL_2G.md` - Este arquivo (resumo)

**Total**: 6 arquivos (2 backend, 2 frontend, 2 documentação)

---

## 🔍 Pontos de Atenção

### 1. Ambiente de Homologação
- ⚠️ Apenas **HML** disponível no momento
- ⏳ **PROD** será configurado quando TJSP disponibilizar

### 2. Natureza do 2º Grau
- 📌 2º Grau **não faz autuação inicial** (processos vêm do 1º Grau)
- 📌 Foco em **peticionamento intermediário** (contrarrazões, memoriais)
- 📌 Consultas funcionam normalmente

### 3. Credenciais de Teste
- 🔐 Use credenciais específicas do ambiente Civil 2G HML do TJSP
- 🔐 Credenciais do 1º Grau **não** funcionarão no 2º Grau

---

## ✅ Checklist de Validação

Para validar a implementação, siga este checklist:

- [ ] Servidor inicia sem erros
- [ ] Login exibe opção "Civil 2ª Instância (Recursal)"
- [ ] Seleção atualiza indicador para 🏛️ HML
- [ ] Login com credenciais Civil 2G funciona
- [ ] Consultar avisos retorna dados do Civil 2G
- [ ] Consultar processo busca no Civil 2G
- [ ] Network mostra requisições para `eproc-2g-sp-hml.tjsp.jus.br`
- [ ] Peticionamento intermediário funciona

---

## 🚀 Próximos Passos

### Curto Prazo (Imediato)
1. ✅ Implementação completa
2. ⏳ Testes em homologação
3. ⏳ Validação com usuários

### Médio Prazo
1. ⏳ Configurar ambiente PROD (quando disponível)
2. ⏳ Adicionar testes automatizados
3. ⏳ Documentar casos de uso específicos do 2G

### Longo Prazo
1. ⏳ Adicionar outros sistemas (Criminal, Trabalhista, etc.)
2. ⏳ Implementar cache inteligente de tabelas
3. ⏳ Dashboard de status dos ambientes

---

## 📞 Suporte

### Em Caso de Problemas

1. **Verificar logs do servidor** (console do Node.js)
2. **Verificar Network no DevTools** (F12 → Network)
3. **Consultar documentação**: `documentos/CIVIL_2G_HOMOLOGACAO.md`
4. **Verificar endpoints no .env**

### Links Úteis

- **XSD Civil 2G**: https://eproc-2g-sp-hml.tjsp.jus.br/xsd/tipos-servico-intercomunicacao-3.0.0.xsd
- **WSDL MNI 3.0**: https://eproc-2g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl
- **WSDL Tabelas**: https://eproc-2g-sp-hml.tjsp.jus.br/ws/consultarTabela.wsdl

---

## 🎓 Conclusão

A implementação do ambiente **Civil 2G Homologação** foi realizada com sucesso seguindo o princípio de **não reinventar a roda**:

✅ Reutilizou toda infraestrutura MNI 3.0 existente  
✅ Adicionou apenas configurações necessárias (6 arquivos)  
✅ Roteamento automático e inteligente  
✅ Documentação completa  
✅ Pronto para testes em homologação  

O sistema agora suporta **3 ambientes diferentes** com **roteamento automático** baseado na seleção do usuário no login, mantendo a mesma experiência de uso para todas as funcionalidades.

---

**Versão**: 1.0  
**Data**: 03/11/2025  
**Status**: ✅ Implementado e Pronto para Testes  
**Desenvolvedor**: Sistema MNI Web App  
**Ambiente**: Civil 2G Homologação (TJSP)
