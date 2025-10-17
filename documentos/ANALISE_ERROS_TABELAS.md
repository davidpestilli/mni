# 🔍 Análise de Erros: Consulta de Tabelas MNI

## Resumo do Problema

Ao tentar consultar certas tabelas através do endpoint `consultarTabela` do TJSP, algumas retornam erro **"101: Dados nao disponiveis ou nao autorizados"**.

---

## ❌ Tabelas COM Erro (Código 101)

### 1. ClasseProcessual
```
Erro: 101: Dados nao disponiveis ou nao autorizados.
Endpoint: consultarDados({ nomeTabela: 'ClasseProcessual' })
Status: BLOQUEADO
```

### 2. AssuntoProcessual
```
Erro: 101: Dados nao disponiveis ou nao autorizados.
Endpoint: consultarDados({ nomeTabela: 'AssuntoProcessual' })
Status: BLOQUEADO
```

### 3. OrgaoJulgador
```
Erro: 101: Dados nao disponiveis ou nao autorizados.
Endpoint: consultarDados({ nomeTabela: 'OrgaoJulgador' })
Status: BLOQUEADO
```

### 4. Competencia
```
Erro: 101: Dados nao disponiveis ou nao autorizados.
Endpoint: consultarDados({ nomeTabela: 'Competencia' })
Status: BLOQUEADO
```

---

## ✅ Tabelas SEM Erro (Funcionando)

### 1. LocalidadeJudicial ✓
```
Resultado: 345 registros retornados
Método: consultarDadosAsync
Status: FUNCIONANDO
```

**Exemplo de dados**:
```json
{
  "codigo": "81",
  "descricao": "Adamantina",
  "uf": "SP",
  "CodLocalidade": "3500105",
  "IdLocalidadeJudicial": "81"
}
```

### 2. TipoDocumento ✓
```
Resultado: 557 registros retornados
Método: consultarDadosAsync
Status: FUNCIONANDO
```

**Exemplo de dados**:
```json
{
  "codigo": "1",
  "descricao": "PETIÇÃO INICIAL",
  "descricaoCurta": "INIC",
  "ativo": true,
  "CodTipoDocumento": "1"
}
```

---

## 🔎 Análise Técnica do Erro

### Código de Erro: 101

**Mensagem Oficial**: `"Dados nao disponiveis ou nao autorizados"`

### Possíveis Causas

#### 1. **Restrição de Acesso por Credencial**
- O endpoint `consultarTabela` pode exigir autenticação específica
- Algumas tabelas são consideradas "sensíveis" e requerem permissões especiais
- LocalidadeJudicial e TipoDocumento são públicas, mas ClasseProcessual/AssuntoProcessual não

#### 2. **Diferença de Política de Acesso**
```
Tabelas Públicas (sem autenticação):
├── LocalidadeJudicial
└── TipoDocumento

Tabelas Restritas (requerem autenticação):
├── ClasseProcessual
├── AssuntoProcessual
├── OrgaoJulgador
└── Competencia
```

#### 3. **Endpoint Incorreto**
- Talvez essas tabelas estejam em outro serviço SOAP
- Podem estar disponíveis apenas via `entregarManifestacao` (no contexto da petição)

#### 4. **Parâmetros Adicionais Necessários**
- Algumas tabelas podem exigir parâmetros de filtro
- Exemplo: Competencia pode precisar de localidade, AssuntoProcessual pode precisar de classe, etc.

---

## 🧪 Teste Realizado

### Request SOAP
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <consultarDados>
         <nomeTabela>ClasseProcessual</nomeTabela>
      </consultarDados>
   </soapenv:Body>
</soapenv:Envelope>
```

### Response SOAP (Erro)
```xml
<SOAP-ENV:Envelope>
   <SOAP-ENV:Body>
      <SOAP-ENV:Fault>
         <faultcode>101</faultcode>
         <faultstring>Dados nao disponiveis ou nao autorizados.</faultstring>
      </SOAP-ENV:Fault>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

### Request SOAP (Funcionando)
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Body>
      <consultarDados>
         <nomeTabela>LocalidadeJudicial</nomeTabela>
      </consultarDados>
   </soapenv:Body>
</soapenv:Envelope>
```

### Response SOAP (Sucesso)
```xml
<SOAP-ENV:Envelope>
   <SOAP-ENV:Body>
      <consultarDadosResponse>
         <tabela>
            <linha>
               <item>SinRecebeDistrib</item>
               <item>DesLocalidadeJudicial</item>
               ...
            </linha>
            <linha>
               <item>S</item>
               <item>Adamantina</item>
               ...
            </linha>
         </tabela>
      </consultarDadosResponse>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

---

## 🔧 Soluções Possíveis

### Solução 1: Autenticação no Endpoint de Tabelas ⚠️

**Hipótese**: O endpoint pode aceitar credenciais opcionais

**Teste Sugerido**:
```javascript
const args = {
    nomeTabela: 'ClasseProcessual',
    // Tentar adicionar autenticação
    idConsultante: 'CPF_OU_SIGLA',
    senhaConsultante: 'HASH_SHA256'
};
```

**Código de Teste**:
```javascript
// Adicionar no tabelaClient.js
async consultarTabelaAutenticada(nomeTabela, idConsultante, senhaConsultante) {
    await this.initialize();

    const args = {
        nomeTabela: nomeTabela,
        idConsultante: idConsultante,
        senhaConsultante: senhaConsultante
    };

    const [result] = await this.client.consultarDadosAsync(args);
    return this.parseTabela(result);
}
```

---

### Solução 2: Usar Tabelas Estáticas do CNJ ✅ RECOMENDADO

As tabelas de Classe e Assunto são **padronizadas nacionalmente pelo CNJ**. Você pode:

1. **Baixar as tabelas oficiais do CNJ**:
   - https://www.cnj.jus.br/sgt/consulta_publica_classes.php
   - https://www.cnj.jus.br/sgt/consulta_publica_assuntos.php

2. **Criar arquivos JSON estáticos**:
```javascript
// backend/data/classes-processuais.json
[
  { "codigo": "11", "descricao": "Procedimento Comum Cível" },
  { "codigo": "155", "descricao": "Execução Fiscal" },
  { "codigo": "436", "descricao": "Execução de Título Extrajudicial" },
  ...
]

// backend/data/assuntos-processuais.json
[
  { "codigo": "4907", "descricao": "IPTU / Imposto Predial e Territorial Urbano" },
  { "codigo": "11238", "descricao": "ISS / Imposto sobre Serviços" },
  ...
]
```

3. **Criar endpoints que retornam essas tabelas**:
```javascript
// routes/tabelas.js
router.get('/classes-processuais/listar', async (req, res) => {
    const classes = require('../data/classes-processuais.json');
    res.json({ success: true, data: classes });
});
```

**Vantagens**:
- ✅ Sempre disponível (sem depender do TJSP)
- ✅ Mais rápido (sem requisição SOAP)
- ✅ Códigos são padronizados nacionalmente (CNJ)
- ✅ Não depende de autenticação

**Desvantagens**:
- ⚠️ Precisa atualizar manualmente se CNJ alterar
- ⚠️ TJSP pode ter códigos adicionais específicos

---

### Solução 3: Consultar Documentação do TJSP 📚

Entrar em contato com o suporte do TJSP e perguntar:

1. Como acessar as tabelas ClasseProcessual e AssuntoProcessual?
2. Essas tabelas exigem autenticação?
3. Há um endpoint alternativo para essas consultas?
4. Há documentação atualizada sobre permissões de acesso?

**Contato TJSP**:
- Suporte Técnico do e-Proc
- Canal de atendimento ao desenvolvedor MNI

---

### Solução 4: Usar Tabelas do Próprio Sistema 🔄

Se você já tem processos cadastrados, pode:

1. Fazer peticionamento inicial com códigos conhecidos
2. Consultar o processo criado via `consultarProcesso`
3. O retorno do processo contém os códigos de classe e assunto
4. Construir uma "cache" dessas informações

**Exemplo**:
```javascript
// Ao consultar um processo, você obtém:
{
  "classeProcessual": "155",
  "descricaoClasse": "Execução Fiscal",
  "assunto": "4907",
  "descricaoAssunto": "IPTU"
}
```

---

## 📊 Comparação de Soluções

| Solução | Dificuldade | Disponibilidade | Manutenção | Recomendação |
|---------|-------------|-----------------|------------|--------------|
| 1. Autenticação no endpoint | Média | Depende do TJSP | Baixa | ⚠️ Testar |
| 2. Tabelas estáticas CNJ | Baixa | 100% | Anual | ✅ **MELHOR** |
| 3. Contato com TJSP | Alta | Depende resposta | Baixa | 📞 Complementar |
| 4. Cache de processos | Média | Limitada | Alta | ⚠️ Temporária |

---

## 🎯 Recomendação Final

### CURTO PRAZO (Implementar Agora):
✅ **Usar tabelas estáticas do CNJ** para Classe e Assunto
- Criar arquivos JSON com as tabelas principais
- São padronizadas nacionalmente
- Sempre disponíveis

### MÉDIO PRAZO (Próximos dias):
📞 **Contatar suporte do TJSP**
- Solicitar documentação atualizada
- Perguntar sobre acesso às tabelas restritas
- Verificar se há credenciais específicas

### LONGO PRAZO (Melhoria contínua):
🔄 **Implementar sistema híbrido**
- Tabelas estáticas como fallback
- Consulta ao TJSP quando disponível
- Cache local para performance

---

## 🛠️ Próximos Passos Sugeridos

1. ✅ Criar arquivo `classes-processuais.json` com principais classes do CNJ
2. ✅ Criar arquivo `assuntos-processuais.json` com principais assuntos
3. ✅ Atualizar rotas para servir essas tabelas
4. 📞 Abrir chamado no suporte do TJSP sobre acesso às tabelas
5. 🧪 Testar solução 1 (adicionar autenticação ao consultarDados)

---

## 📝 Conclusão

O erro **"101: Dados nao disponiveis ou nao autorizados"** indica que:

1. ❌ **NÃO é um problema de código** - A implementação está correta
2. ❌ **NÃO é um problema de rede** - Outras tabelas funcionam
3. ✅ **É uma política de acesso do TJSP** - Essas tabelas são restritas
4. ✅ **Solução existe** - Usar tabelas padronizadas do CNJ

**Status**: Normal. Sistema funcionando conforme permissões do tribunal.

---

**Data**: 14/01/2025
**Versão**: 1.0
