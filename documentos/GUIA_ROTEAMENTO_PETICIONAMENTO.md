# Guia de Roteamento - Peticionamento Intermediário

**Data:** 1 de novembro de 2025

## 📍 Rotas Disponíveis

### MNI 2.2 - Primeiro Grau Civil (Legado)

```
POST /api/peticionamento/intermediario
```

**Quando usar:**
- Ambiente: Primeiro Grau Civil (1G_CIVIL)
- Sistema que suporta MNI 2.2

**Body:**
```json
{
  "cpfSigla": "12345678900",
  "senha": "senha123",
  "numeroProcesso": "60261559420258260960",
  "tipoDocumento": 13,
  "documento": "JVBERi0xLjQKJe...",
  "nomeDocumento": "Petição.pdf",
  "mimetype": "application/pdf",
  "nivelSigilo": 0,
  "descricaoDocumento": "Descrição"
}
```

### MNI 3.0 - Execução Fiscal (Novo)

```
POST /api/mni3/peticao
```

**Quando usar:**
- Ambiente: Primeiro Grau Execução Fiscal (1G_EXEC_FISCAL)
- Sistema que suporta APENAS MNI 3.0

**Headers:**
```
Authorization: Bearer <base64(usuario:senha)>
Content-Type: application/json
```

**Body:**
```json
{
  "numeroProcesso": "60261559420258260960",
  "codigoTipoDocumento": "82400092",
  "documento": "JVBERi0xLjQKJe...",
  "nomeDocumento": "Petição.pdf",
  "mimetype": "application/pdf",
  "descricaoDocumento": "Descrição",
  "cpfProcurador": "37450364840"
}
```

## 🔍 Como Determinar Qual Rota Usar

### 1. Verificar Ambiente Atual

```bash
curl http://localhost:3000/api/ambiente/info
```

**Resposta:**
```json
{
  "ambiente": "HML",
  "sistema": {
    "sistema": "1G_EXEC_FISCAL",
    "nome": "Primeiro Grau Execução Fiscal",
    "ambientesDisponiveis": ["HML"]
  }
}
```

### 2. Lógica de Decisão

```javascript
// Pseudocódigo
async function entregarPeticao(dados) {
    // Obter info do sistema
    const info = await fetch('/api/ambiente/info').then(r => r.json());
    
    if (info.sistema.sistema === '1G_EXEC_FISCAL') {
        // Usar MNI 3.0
        return await entregarPeticaoMNI3(dados);
    } else {
        // Usar MNI 2.2
        return await entregarPeticaoMNI2_2(dados);
    }
}
```

## ⚠️ Erro Comum

### Mensagem de Erro

```
{
  "success": false,
  "message": "O sistema \"Primeiro Grau Execução Fiscal\" não suporta MNI 2.2. Use apenas endpoints MNI 3.0."
}
```

### Solução

**NÃO USE:** `/api/peticionamento/intermediario`  
**USE:** `/api/mni3/peticao`

## 📊 Comparação de Rotas

| Aspecto | MNI 2.2 | MNI 3.0 |
|---------|---------|---------|
| **Rota** | `/api/peticionamento/intermediario` | `/api/mni3/peticao` |
| **Método** | POST | POST |
| **Autenticação** | Body (cpfSigla, senha) | Header Bearer |
| **Sistema** | 1G_CIVIL | 1G_EXEC_FISCAL |
| **Conteúdo Doc** | Base64 direto | SHA-256 (convertido automaticamente) |
| **Tipo Doc** | Número inteiro (ex: 13) | String numérica (ex: "82400092") |

## 🚀 Exemplo de Implementação Frontend

### JavaScript Puro

```javascript
async function entregarPeticao(dados) {
    try {
        // 1. Obter informações do sistema
        const infoResponse = await fetch('/api/ambiente/info');
        const info = await infoResponse.json();
        
        const sistema = info.sistema.sistema;
        
        if (sistema === '1G_EXEC_FISCAL') {
            // 2. Usar MNI 3.0
            return await entregarPeticaoMNI3(dados);
        } else {
            // 3. Usar MNI 2.2
            return await entregarPeticaoMNI2_2(dados);
        }
    } catch (error) {
        console.error('Erro ao entregar petição:', error);
        throw error;
    }
}

// Peticionamento MNI 2.2
async function entregarPeticaoMNI2_2(dados) {
    const token = btoa(`${dados.usuario}:${dados.senha}`);
    
    const response = await fetch('/api/peticionamento/intermediario', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            cpfSigla: dados.usuario,
            senha: dados.senha,
            numeroProcesso: dados.numeroProcesso,
            tipoDocumento: dados.tipoDocumento,
            documento: dados.documentoBase64,
            nomeDocumento: dados.nomeDocumento,
            mimetype: dados.mimetype,
            descricaoDocumento: dados.descricao
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
    
    return await response.json();
}

// Peticionamento MNI 3.0
async function entregarPeticaoMNI3(dados) {
    const token = btoa(`${dados.usuario}:${dados.senha}`);
    
    const response = await fetch('/api/mni3/peticao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            numeroProcesso: dados.numeroProcesso,
            codigoTipoDocumento: dados.codigoTipoDocumento,
            documento: dados.documentoBase64,
            nomeDocumento: dados.nomeDocumento,
            mimetype: dados.mimetype,
            descricaoDocumento: dados.descricao,
            cpfProcurador: dados.cpfProcurador
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
    
    return await response.json();
}
```

### React

```javascript
import { useState } from 'react';

function PeticionamentoIntermediario() {
    const [sistema, setSistema] = useState(null);
    
    useEffect(() => {
        // Obter informações do sistema ao carregar
        fetch('/api/ambiente/info')
            .then(r => r.json())
            .then(data => setSistema(data.sistema.sistema));
    }, []);
    
    const handleEntregarPeticao = async (formData) => {
        try {
            const endpoint = sistema === '1G_EXEC_FISCAL' 
                ? '/api/mni3/peticao'
                : '/api/peticionamento/intermediario';
            
            const token = btoa(`${formData.usuario}:${formData.senha}`);
            
            const body = sistema === '1G_EXEC_FISCAL'
                ? {
                    numeroProcesso: formData.numeroProcesso,
                    codigoTipoDocumento: formData.tipoDocumento,
                    documento: formData.documentoBase64,
                    nomeDocumento: formData.nomeDocumento,
                    mimetype: formData.mimetype,
                    descricaoDocumento: formData.descricao,
                    cpfProcurador: formData.cpfProcurador
                  }
                : {
                    cpfSigla: formData.usuario,
                    senha: formData.senha,
                    numeroProcesso: formData.numeroProcesso,
                    tipoDocumento: formData.tipoDocumento,
                    documento: formData.documentoBase64,
                    nomeDocumento: formData.nomeDocumento,
                    mimetype: formData.mimetype,
                    descricaoDocumento: formData.descricao
                  };
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('Protocolo:', result.data.numeroProtocolo);
                // Processar sucesso
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro:', error);
            // Exibir erro ao usuário
        }
    };
    
    return (
        <form onSubmit={async (e) => {
            e.preventDefault();
            await handleEntregarPeticao(/* dados do formulário */);
        }}>
            {/* Formulário */}
        </form>
    );
}
```

## 🧪 Teste Manual com cURL

### MNI 2.2

```bash
curl -X POST http://localhost:3000/api/peticionamento/intermediario \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(echo -n 'usuario:senha' | base64)" \
  -d '{
    "cpfSigla": "usuario",
    "senha": "senha",
    "numeroProcesso": "60261559420258260960",
    "tipoDocumento": 13,
    "documento": "JVBERi0xLjQKJe...",
    "nomeDocumento": "Petição.pdf",
    "mimetype": "application/pdf"
  }'
```

### MNI 3.0

```bash
curl -X POST http://localhost:3000/api/mni3/peticao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(echo -n 'usuario:senha' | base64)" \
  -d '{
    "numeroProcesso": "60261559420258260960",
    "codigoTipoDocumento": "82400092",
    "documento": "JVBERi0xLjQKJe...",
    "nomeDocumento": "Petição.pdf",
    "mimetype": "application/pdf",
    "descricaoDocumento": "Teste"
  }'
```

## 🔧 Códigos de Tipo de Documento

### MNI 2.2 (Genérico)
- 13 = Petição genérica
- Consultar `/api/tabelas?nomeTabela=TipoDocumento` para lista completa

### MNI 3.0 (Execução Fiscal)
- 82400092 = Petição (testado e funcionando)
- Consultar com suporte para outros códigos disponíveis

## 🆘 Suporte

Se você receber:

```
O sistema "Primeiro Grau Execução Fiscal" não suporta MNI 2.2. 
Use apenas endpoints MNI 3.0.
```

**Significado:** Você está em um ambiente que APENAS suporta MNI 3.0  
**Solução:** Use a rota `/api/mni3/peticao` ao invés de `/api/peticionamento/intermediario`

---

**Última Atualização:** 1 de novembro de 2025
