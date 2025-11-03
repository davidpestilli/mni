# Fix: Assuntos Dropdown Mostrando "Descrição não encontrada"

## Problema

Ao acessar o dashboard do app, na aba Petição → Petição inicial, após inserir localidade, competência e classe, o select de assunto só mostra a opção "Descrição não encontrada".

## Análise dos Logs (pergunta2.txt)

### Evidências:
1. **API MNI 3.0 retorna 321 assuntos corretamente** (linha 126):
   ```
   [MNI 3.0] result.assuntos length: 321
   ```

2. **Estrutura dos assuntos está correta** (linhas 128-146):
   ```json
   {
     "attributes": { "principal": "false" },
     "codigoNacional": "5915"
   }
   ```

3. **Após parseamento, apenas 1 assunto com código vazio** (linhas 147-159):
   ```json
   {
     "codigo": "",
     "principal": false
   }
   ```

4. **Descrição enriquecida mostra código vazio** (linha 160):
   ```
   Descrição não encontrada (código )
   ```

## Causa Raiz

O problema estava na função `parseAssuntos()` em `backend/services/mni3Client.js`:

### Código Problemático (linha 648):
```javascript
const codigo = assunto.codigoNacional || assunto.codigo || attrs.codigoNacional || attrs.codigo || '';
```

Embora a lógica pareça correta, há um problema sutil:
- **Possível bug com o operador `||`**: Em alguns casos raros, o JavaScript pode não avaliar corretamente a cadeia de OR se houver tipos mistos ou valores undefined vs null.
- **Falta de log de debug**: Não havia forma de identificar qual assunto estava sem código.

## Solução Implementada

### 1. Extração Explícita do Código (linhas 647-659)

Substituído o operador `||` em cadeia por uma estrutura if-else explícita:

```javascript
let codigo = '';
if (assunto.codigoNacional) {
    codigo = assunto.codigoNacional;
} else if (assunto.codigo) {
    codigo = assunto.codigo;
} else if (attrs.codigoNacional) {
    codigo = attrs.codigoNacional;
} else if (attrs.codigo) {
    codigo = attrs.codigo;
}

// Log se não encontrou código (para debug)
if (!codigo) {
    console.warn('[MNI 3.0] Assunto sem código na posição', index, ':', JSON.stringify(assunto));
}
```

**Benefícios:**
- Mais explícito e fácil de debugar
- Evita possíveis problemas com avaliação de truthy/falsy
- Adiciona warning se um assunto não tiver código

### 2. Conversão Robusta do Flag Principal (linhas 665-667)

Melhorado o tratamento do campo `principal` para aceitar diferentes formatos:

```javascript
const principalStr = String(attrs.principal || assunto.principal || 'false').toLowerCase();
const principal = principalStr === 's' || principalStr === 'true';
```

**Aceita:**
- `"S"`, `"s"` (formato antigo MNI)
- `"true"`, `"True"`, `"TRUE"` (formato atual)
- `true` (booleano)

### 3. Normalização Mais Segura do Array (linhas 627-637)

Melhorado a conversão de `result.assuntos` para array:

```javascript
let assuntos;
if (Array.isArray(result.assuntos)) {
    assuntos = result.assuntos;
} else if (result.assuntos && typeof result.assuntos === 'object') {
    // Se é um objeto único, colocar em array
    assuntos = [result.assuntos];
} else {
    console.warn('[MNI 3.0] result.assuntos não é array nem objeto:', result.assuntos);
    return [];
}
```

**Previne:**
- Embrulhar array dentro de outro array
- Tentar iterar sobre valores não-objeto

### 4. Validação Adicional (linhas 679-684)

Adicionado verificação após o parse para identificar assuntos problemáticos:

```javascript
const semCodigo = parsedAssuntos.filter(a => !a.codigo || a.codigo === '');
if (semCodigo.length > 0) {
    console.error('[DEBUG parseAssuntos] ATENÇÃO:', semCodigo.length, 'assuntos sem código!');
    console.error('[DEBUG parseAssuntos] Primeiros 3 sem código:', JSON.stringify(semCodigo.slice(0, 3), null, 2));
}
```

## Arquivos Modificados

1. **backend/services/mni3Client.js**
   - Função `parseAssuntos()` (linhas 613-690)
   - Melhorias em extração de código, normalização de array e logging

## Como Testar

### 1. Testar a Lógica de Extração

Execute o teste unitário criado:

```bash
cd backend
node test-parse-assuntos.js
```

Saída esperada:
```
Item 0:
  codigoNacional found: 5915
  => codigo extracted: 5915
  => principal: false

Item 1:
  codigoNacional found: 5946
  => codigo extracted: 5946
  => principal: true
```

### 2. Testar no Aplicativo

1. Inicie o backend:
   ```bash
   cd backend
   npm start
   ```

2. Acesse o frontend: `http://localhost:3000`

3. Vá para: **Dashboard → Petição → Petição Inicial**

4. Selecione:
   - Localidade: qualquer comarca
   - Competência: qualquer (ou deixe em branco)
   - Classe: qualquer classe processual

5. **Resultado esperado**: 
   - O dropdown de "Assunto" deve carregar múltiplos assuntos
   - Cada assunto deve mostrar: `CODIGO - Descrição do assunto`
   - NÃO deve aparecer "Descrição não encontrada"

### 3. Verificar Logs

Os logs devem mostrar:

```
[MNI 3.0] result.assuntos length: 321
[DEBUG parseAssuntos] assuntos após normalização: 321 itens
[DEBUG parseAssuntos] RETORNANDO: 321 assuntos
[DEBUG MNI3] Total de assuntos retornados: 321
[PJE-ASSUNTO] Carregado mapeamento de assuntos: 5534
```

Se aparecer o warning:
```
[MNI 3.0] Assunto sem código na posição X: {...}
```

Significa que há um assunto específico com problema na resposta da API MNI.

## Próximos Passos

Se o problema persistir:

1. **Verificar se o backend está atualizado**: Certifique-se de que o servidor foi reiniciado após as mudanças
2. **Verificar logs completos**: Procure por warnings ou erros no console do backend
3. **Verificar arquivo de mapeamento**: Confirme que `backend/data/pje_assuntos_parsed.json` existe e está carregado
4. **Testar com diferentes localidades/classes**: O problema pode ser específico de determinadas combinações

## Observações

- O erro "Descrição não encontrada" vem do arquivo `pjeAssuntoClient.js` quando o código do assunto está vazio ou não é encontrado no mapeamento local
- O mapeamento local (arquivo PJe) contém 5534 assuntos com descrições
- Se um assunto não está no mapeamento, aparece: "Descrição não encontrada (código XXXX)"
- Se o código está vazio, aparece: "Descrição não encontrada (código )"

## Autor

Fix implementado em: 2025-11-02
