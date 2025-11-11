# Análise: TipoParte em EProc - Resposta Definitiva

## Pergunta Original
"Com relação às partes no EProc, não consegui visualizar a informação TipoParte (em sentido estrito) que também era presente no serviço de 2ª instância do Esaj. Apesar do serviço retornar um objeto TipoParte, ele não possui a descrição (ex Apelante, Apelado, Agravado, etc). Sabe se essa informação está atrelada a alguma outra que não identifiquei?"

## Resposta: SIM, A INFORMAÇÃO EXISTE!

A tabela **TipoParte** foi consultada com sucesso e contém **TODAS as descrições solicitadas**.

### Estrutura dos Dados Retornados

Cada registro da tabela TipoParte contém:

```json
{
  "CodTipoParte": "6",           // Código numérico único
  "SigParte": "APNTE",            // Sigla abreviada (ex: APNTE)
  "DesTipoParte": "APELANTE",     // DESCRIÇÃO COMPLETA ← ISSO QUE FALTAVA!
  "DesTipoPartePlural": "apelantes",  // Forma plural
  "SinPolo": "A",                 // Indica se é polo Ativo (A) ou Passivo (R)
  "SinExibeConsultaPublica": "S", // Se é exibido em consulta pública
  "CodMniModalidadePoloProcessual": "1"  // Modalidade do polo
}
```

### Exemplos de Dados Encontrados

#### Polo Ativo (SinPolo = "A") - Alguns Exemplos:
| Código | Sigla | Descrição | Descrição Plural |
|--------|-------|-----------|------------------|
| 1 | AUTOR | AUTOR | autores |
| 4 | AGVAN | AGRAVANTE | agravantes |
| 6 | APNTE | APELANTE | apelantes |
| 5 | REQNT | REQUERENTE | requerentes |
| 8 | AUTOR | PARTE AUTORA | parte autoras |

#### Polo Passivo (SinPolo = "R") - Alguns Exemplos:
| Código | Sigla | Descrição | Descrição Plural |
|--------|-------|-----------|------------------|
| 52 | RÉU | RÉU | réus |
| 55 | AGVADO | AGRAVADO | agravados |
| 57 | APELADO | APELADO | apelados |
| 58 | REQRIDO | REQUERIDO | requeridos |
| 69 | EXETADO | EXECUTADO | executados |

### Total de Registros

A tabela contém **mais de 100 tipos de partes** diferentes, cobrindo:
- Processos cíveis (Autor, Réu, Apelante, Apelado, etc.)
- Processos criminais (Acusado, Denunciado, Investigado, etc.)
- Processos administrativos (Autoridade, Requerente, etc.)
- Embargos (Embargante, Embargado)
- Execução (Exequente, Executado)
- E muitos outros tipos

## ONDE ESTAVA A INFORMAÇÃO?

### ❌ No Código Backend Atual (NUNCA era consultada):

```javascript
// tabelaClient.js - Linha 323
// TipoParte está listada como "conhecida" mas NUNCA é consultada
'TipoParte',  // ← Aqui estava, mas sem método de consulta
```

### ✅ Informação Disponível em Dois Lugares:

#### 1. Quando CONSULTANDO um processo existente:
- O campo `relacionamentoProcessual` retorna a descrição (ex: "Apelante", "Apelado")
- Mas isso apenas funciona para processos já cadastrados

#### 2. Quando SUBMETENDO um novo processo:
- A tabela TipoParte deveria ser consultada para permitir ao usuário escolher o tipo
- **Atualmente isso NÃO acontece** - o sistema não envia o tipo de parte

## POR QUE A INFORMAÇÃO NÃO APARECIA?

### Razão 1: Tabela Nunca Era Consultada
O `tabelaClient.js` conhecia a tabela mas não tinha método para consultá-la:
```javascript
// Não existiam métodos como:
async consultarTipoParte() {
    return await this.consultarTabela('TipoParte');
}
```

### Razão 2: Frontend Não Tinha Seletor
O formulário (`peticionamento-inicial.html`) nunca pedia ao usuário para escolher o tipo de parte:
- Apenas perguntava: Polo (Ativo/Passivo) + Tipo de Pessoa (Física/Jurídica)
- Não perguntava: **QUAL o tipo de parte** (Autor, Réu, Apelante, etc.)

### Razão 3: Backend Não Coletava o Campo
A rota `/api/peticionamento/inicial` não coletava ou processava `tipoParticipacao`:
```javascript
// Coletava:
const { poloAtivo, poloPassivo } = req.body;

// Mas cada parte em poloAtivo/poloPassivo não tinha:
tipoParticipacao: "6"  // (código para APELANTE)
```

### Razão 4: XML Não Incluía o Campo
O serviço MNI 3.0 (`mni3Client.js` - método `construirPoloXML()`) não incluía o tipo no XML:
```xml
<!-- Gerado atualmente (INCOMPLETO): -->
<int:polo polo="AT">
    <int:parte>
        <int:pessoa>
            <int:nome>João Silva</int:nome>
            <!-- ❌ Falta: <int:tipoRelacionamento>6</int:tipoRelacionamento> -->
        </int:pessoa>
    </int:parte>
</int:polo>
```

## RESUMO DA RESPOSTA

| Aspecto | Status | Detalhes |
|---------|--------|----------|
| **Tabela TipoParte existe?** | ✅ SIM | Com 100+ registros |
| **Contém descrição?** | ✅ SIM | Campo `DesTipoParte` com valores como "APELANTE", "APELADO" |
| **Pode ser consultada?** | ✅ SIM | Via `tabelaClient.consultarTabela('TipoParte')` |
| **Está em ESAJ e EPROC?** | ✅ SIM | Ambos retornam `relacionamentoProcessual` |
| **É usada no sistema?** | ❌ NÃO | Nunca é consultada ou enviada nas submissões |
| **Diferença ESAJ vs EPROC?** | ✅ MESMA | Ambos têm o mesmo problema - não usam TipoParte |

## CONCLUSÃO

A informação TipoParte **NÃO está faltando** no EProc. O problema é que:

1. A tabela está disponível e contém todos os dados
2. O sistema nunca a consulta
3. O backend nunca coleta o tipo de parte do usuário
4. O frontend nunca oferece opção de escolher o tipo
5. O XML enviado ao MNI nunca inclui o tipo

**É um gap de IMPLEMENTAÇÃO, não de dados.**

## Próximos Passos Sugeridos

Para implementar o suporte completo a TipoParte:

1. ✅ Criar endpoint para listar TipoParte: `GET /api/tabelas/tipos-parte`
2. ✅ Adicionar seletor no frontend: Campo dropdown com tipos de parte
3. ✅ Modificar formulário para coletar tipo ao criar partes
4. ✅ Atualizar backend para processar e validar o tipo
5. ✅ Incluir tipo no XML gerado para MNI
6. ✅ Testar submissão com tipo preenchido
