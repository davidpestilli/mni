# Limitação: Descrições de Classes no MNI 3.0

## 📋 Problema Identificado

O MNI 3.0 retorna **apenas códigos nacionais** das classes processuais, sem as descrições textuais.

### Exemplo de Resposta do MNI 3.0:
```xml
<ns2:codigosClasse>7</ns2:codigosClasse>
<ns2:codigosClasse>32</ns2:codigosClasse>
<ns2:codigosClasse>34</ns2:codigosClasse>
```

## 🚫 Por que Não Podemos Usar MNI 2.2 para Descrições?

### MNI 3.0 → Códigos Nacionais (Padrão CNJ)
- Código 7 = ?
- Código 32 = ?
- Código 34 = ?

### MNI 2.2 TJSP → Códigos Locais do Tribunal
- Código 420006 = "Abertura, Registro e Cumprimento de Testamento"
- Código 012000 = "ACAO CAUTELAR"
- Código 012004 = "ACAO CAUTELAR (MATERIA PENAL)"

### Incompatibilidade
Os sistemas de códigos são **completamente diferentes** e **não há correspondência direta**.

Tentamos buscar a tabela nacional `ClasseProcessual` no MNI 2.2:
```
Erro 101: Dados não disponíveis ou não autorizados
```

Esse é exatamente o problema que motivou a criação do MNI 3.0!

## ✅ Solução Atual Implementada

### Código da API (backend/routes/mni3.js)
A rota `/api/mni3/classes/:codigoLocalidade` agora retorna:

```json
{
  "success": true,
  "versao": "3.0",
  "count": 70,
  "data": [
    {
      "codigo": "7",
      "descricao": "Classe Processual (Código Nacional 7)",
      "descricaoCurta": "Classe 7",
      "ativo": true,
      "permitePeticionamentoInicial": true,
      "codigoNacional": "7",
      "fonte": "MNI 3.0 (apenas códigos nacionais)"
    },
    {
      "codigo": "32",
      "descricao": "Classe Processual (Código Nacional 32)",
      "descricaoCurta": "Classe 32",
      ...
    }
  ],
  "observacao": "IMPORTANTE: MNI 3.0 retorna apenas códigos nacionais. Use esses códigos para peticionamento - o sistema e-Proc reconhece os códigos nacionais.",
  "aviso": "Descrições genéricas. Para descrições completas, seria necessário: (1) tabela de mapeamento manual CNJ, ou (2) integração com serviço público CNJ..."
}
```

### Como Funciona
1. **MNI 3.0** filtra quais classes são válidas para o contexto (localidade + competência)
2. Retornamos os códigos com **descrição genérica**: `"Classe 7"`, `"Classe 32"`, etc.
3. O **sistema e-Proc reconhece os códigos nacionais** para peticionamento
4. Usuário vê no frontend: `"Classe 7"`, `"Classe 32"`, etc.

## 🔮 Soluções Futuras Possíveis

### Opção 1: Tabela de Mapeamento Manual (CNJ)
Criar arquivo JSON com mapeamento código → descrição:
```json
{
  "7": "Procedimento Comum Cível",
  "32": "Execução de Título Extrajudicial",
  "34": "Procedimento Ordinário",
  ...
}
```

**Fonte**: Tabelas Processuais Unificadas do CNJ (Resolução CNJ nº 46/2007 e atualizações)

**Prós**: Solução simples e rápida
**Contras**: Requer manutenção manual quando CNJ atualizar

### Opção 2: Integração com Serviço Público CNJ
Verificar se o CNJ oferece webservice público para consulta de classes nacionais.

**Prós**: Sempre atualizado
**Contras**: Dependência de serviço externo

### Opção 3: Web Scraping da Documentação CNJ
Extrair dados das tabelas públicas do CNJ.

**Prós**: Dados oficiais
**Contras**: Frágil a mudanças no site

## 📝 Recomendação

**Para desenvolvimento**: A solução atual (códigos genéricos) é suficiente, pois:
- O sistema e-Proc aceita os códigos nacionais
- A filtragem do MNI 3.0 garante que apenas classes válidas sejam exibidas
- Evita peticionamentos com classes inválidas (problema do MNI 2.2)

**Para produção**: Implementar Opção 1 (tabela de mapeamento manual):
1. Consultar documentação oficial do CNJ
2. Criar arquivo `backend/data/classes-nacionais-cnj.json`
3. Carregar no startup da aplicação
4. Cruzar com códigos do MNI 3.0

## 📚 Referências

- **Resolução CNJ nº 46/2007**: Cria as Tabelas Processuais Unificadas
- **MNI 3.0 WSDL**: https://eproc-1g-sp-hml.tjsp.jus.br/ws/intercomunicacao3.0/wsdl/servico-intercomunicacao-3.0.0.wsdl
- **Documentação MNI**: http://www.cnj.jus.br/mni

## ⚠️ Importante

**NÃO tente** usar códigos do MNI 2.2 para peticionamento MNI 3.0!
Os códigos são incompatíveis e causarão erros.

**SIM**, use os códigos nacionais retornados pelo MNI 3.0.
O e-Proc reconhece e aceita esses códigos.

---

**Data**: 2025-10-15
**Status**: Solução temporária implementada
**Próximo passo**: Criar tabela de mapeamento CNJ
