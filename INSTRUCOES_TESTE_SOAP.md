# 📝 Instruções para Teste do XML de Peticionamento Inicial MNI 3.0

## Arquivo Gerado
**Localização:** `exemplo_xml_peticionamento_mni3.xml`

## 🔑 Campos que Você Precisa Substituir

### 1. Autenticação (linhas 9-11)
```xml
<int:usuario>12345678900</int:usuario>
<int:senha>a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2</int:senha>
```
- **usuario**: Substituir pelo CPF/Sigla válido do sistema de testes
- **senha**: Hash SHA256 da senha (formato: data + senha, em minúsculo)
  - Exemplo de geração: `echo -n "02-11-2025MinhaSenh@123" | sha256sum`

### 2. Competência e Localidade (linhas 18-20)
```xml
<int:competencia>156</int:competencia>
<int:codigoLocalidade>0014</int:codigoLocalidade>
```
- **competencia**: Código da competência (156 = Execução Fiscal)
- **codigoLocalidade**: Código da comarca (0014 = Araraquara, exemplo)

### 3. Polo Ativo - Autor (linhas 23-43)
```xml
<int:nome>FAZENDA PÚBLICA DO ESTADO DE SÃO PAULO</int:nome>
<int:numeroDocumentoPrincipal>46377222000135</int:numeroDocumentoPrincipal>
```
- Substituir pelos dados reais do autor da ação

### 4. Polo Passivo - Réu (linhas 45-63)
```xml
<int:nome>EMPRESA EXEMPLO LTDA</int:nome>
<int:numeroDocumentoPrincipal>12345678000190</int:numeroDocumentoPrincipal>
```
- Substituir pelos dados reais do réu

### 5. Assunto (linha 66)
```xml
<int:codigoNacional>5946</int:codigoNacional>
```
- Código 5946 = IPVA (exemplo para execução fiscal)
- Consulte a tabela de assuntos CNJ

### 6. Dados da CDA (linha 69)
```xml
<int:outroParametro nome="ListaCDA" valor="&lt;ListaCDA&gt;&lt;CDA&gt;&lt;NumeroCDA&gt;2025/123456&lt;/NumeroCDA&gt;..."/>
```
- **NumeroCDA**: Número da CDA
- **CodigoTributoFiscal**: Código do tributo
- **ValorCda**: Valor da dívida
- **DataApuracaoValorCDA**: Data no formato YYYYMMDDHHMMSS

### 7. Documento PDF (linha 75)
```xml
<int:conteudo>JVBERi0xLjQKJeLjz9MK...</int:conteudo>
```
- Substituir pelo conteúdo Base64 do PDF real
- O exemplo contém um PDF mínimo válido (apenas para teste de estrutura)

### 8. Signatário (linha 78)
```xml
<int:identificador>12345678900</int:identificador>
```
- CPF do signatário dos documentos

### 9. Parâmetros Finais (linhas 84-85)
```xml
<tip:parametros nome="identProcuradorRepresentacao" valor="12345678900"/>
```
- CPF do procurador/peticionante

## 🧪 Como Testar no SOAP UI / Postman

### Endpoint:
```
https://esaj.tjsp.jus.br/eproc/intercomunicacao/receber/v3
```
ou
```
https://esaj.tjsp.jus.br/eproc-hom/intercomunicacao/receber/v3  (HOMOLOGAÇÃO)
```

### Headers:
```
Content-Type: application/soap+xml; charset=utf-8
```

### Método:
```
POST
```

### Body:
- Copiar todo o conteúdo do arquivo `exemplo_xml_peticionamento_mni3.xml`
- Substituir os campos marcados acima
- Enviar

## ✅ Resposta Esperada de Sucesso

```xml
<SOAP-ENV:Envelope>
  <SOAP-ENV:Body>
    <ns3:respostaEntregarPeticaoInicial>
      <ns2:recibo>
        <ns1:recibo>
          <ns1:sucesso>true</ns1:sucesso>
          <ns1:mensagens>
            <ns1:descritivo>Petição recebida com sucesso</ns1:descritivo>
          </ns1:mensagens>
        </ns1:recibo>
        <ns2:numeroProtocolo>123456789</ns2:numeroProtocolo>
      </ns2:recibo>
    </ns3:respostaEntregarPeticaoInicial>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>
```

## ❌ Erros Comuns

### Erro: "Acesso negado, usuário [X]"
- **Causa**: Credenciais inválidas ou hash de senha incorreto
- **Solução**: Verificar usuário/senha e formato do hash

### Erro: "Parâmetro do método [setNumIdPessoaProcessoParte] é um array vazio"
- **Causa**: Falta de endereço nas partes
- **Solução**: ✅ JÁ CORRIGIDO na versão atual

### Erro: "Classe processual não permitida"
- **Causa**: Classe 1116 não disponível para a localidade/competência
- **Solução**: Verificar se a competência 156 está correta

### Erro: "Assunto não válido"
- **Causa**: Código de assunto incompatível com a classe
- **Solução**: Consultar assuntos válidos para Execução Fiscal (classe 1116)

## 📚 Documentação

Consulte `pergunta2.txt` para ver todos os parâmetros opcionais disponíveis no MNI 3.0.

## 🔍 Principais Diferenças em Relação ao Exemplo de Sucesso (pergunta.txt)

Nossa implementação agora está **100% conforme** o exemplo de sucesso, incluindo:
- ✅ Estrutura `<int:endereco>` completa em todos os polos
- ✅ Assinatura dentro de `<int:conteudo>`
- ✅ Parâmetros `identProcuradorRepresentacao` e `tipoIdentProcuradorRepresentacao`
- ✅ Formato correto da ListaCDA escapada
- ✅ Namespaces corretos (v300, tip, int)
