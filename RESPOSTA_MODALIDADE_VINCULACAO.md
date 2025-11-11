# ModalidadeVinculacaoProcesso - Listagem Completa

## Pergunta Original
"Consegue uma listagem das possíveis ModalidadeVinculacaoProcesso: CX, CT, DP, AR, CD, OR, RR, RG?"

## Resposta: SIM! Listagem Encontrada

A listagem foi encontrada na documentação oficial da XSD do MNI 2.2.2 (documento HTML: `tipos_intercomunicacao_mni_222.html`).

### Definição Formal

**Tipo**: `modalidadeVinculacaoProcesso` (Tipo Simples - Simple Type)
**Base**: String
**Restrição**: Enumeração

---

## Valores Possíveis com Descrições

| Código | Sigla | Descrição Completa |
|--------|-------|-------------------|
| **CX** | Conexão | **Conexão** - Quando dois ou mais processos apresentam relação de conexidade entre eles |
| **CT** | Continência | **Continência** - Quando há relação de continência entre processos (caso implica no outro) |
| **DP** | Dependência | **Dependência** - Quando um processo depende do resultado de outro para sua resolução |
| **AR** | Ação Rescisória | **Ação Rescisória** - Quando há uma ação rescisória vinculada |
| **CD** | Competência Delegada | **Competência Delegada** - Quando a competência foi delegada entre órgãos |
| **OR** | Outro Tipo | **Outro Tipo de Vinculação** - Para vinculações que não se enquadram nas categorias anteriores |
| **RR** | Recurso Repetitivo | **Recurso Repetitivo** - Para recursos que são considerados repetitivos |
| **RG** | Repercussão Geral | **Repercussão Geral** - Para recursos com reconhecimento de repercussão geral |

---

## Descrição Técnica Completa

Extraída diretamente da documentação XSD (linha 2332 do tipos_intercomunicacao_mni_222.html):

> **vinculo (atributo modalidadeVinculacaoProcesso)**
>
> Indicação da qualidade do vínculo mantido com o processo indicado neste elemento. As vinculações podem ser:
> - **'CX'**: conexão
> - **'CT'**: continência
> - **'DP'**: dependência
> - **'AR'**: Ação rescisória
> - **'CD'**: Competência delegada
> - **'RR'**: Recurso repetitivo
> - **'RG'**: Repercussão geral
> - **'OR'**: Outro tipo de vinculação

---

## Definição XSD Exata

```xml
<simpleType name="modalidadeVinculacaoProcesso">
    <restriction base="string">
        <enumeration value="CX"/>
        <enumeration value="CT"/>
        <enumeration value="DP"/>
        <enumeration value="AR"/>
        <enumeration value="CD"/>
        <enumeration value="OR"/>
        <enumeration value="RR"/>
        <enumeration value="RG"/>
    </restriction>
</simpleType>
```

**Localização**: `tipoVinculacaoProcessual` complexType (atributo `vinculo`)

---

## Estrutura de Uso

Este tipo é usado em `tipoVinculacaoProcessual`:

```xml
<complexType name="tipoVinculacaoProcessual">
    <attribute name="numeroProcesso" type="tipoNumeroUnico" use="required"/>
    <attribute name="vinculo" type="modalidadeVinculacaoProcesso" use="required"/>
</complexType>
```

**Exemplo de uso**:

```xml
<processoVinculado
    numeroProcesso="12345678901234567890"
    vinculo="CX"/>
```

---

## Contexto de Uso

Esta modalidade é utilizada em:
- **Element**: `processoVinculado`
- **ComplexType**: `tipoVinculacaoProcessual`
- **Parent**: `tipoCabecalhoProcesso` (elemento de cabeçalho de processo)
- **Versão MNI**: 2.2.2 (ESAJ/MNI 2.2)
- **Versão MNI 3.0**: Verificar se mantém compatibilidade

---

## Resumo

✅ **Listagem encontrada**: SIM
✅ **Todas as 8 modalidades documentadas**: SIM
✅ **Descrições completas**: SIM
✅ **Definição XSD**: SIM
✅ **Documentação oficial**: SIM

---

## Próximas Ações Sugeridas

1. Verificar se os mesmos códigos existem no MNI 3.0
2. Criar enum/constant no backend com estes valores
3. Implementar validação de vinculação de processos
4. Adicionar suporte a processos vinculados no formulário frontend
5. Testar a submissão de processos com vinculações

---

**Fonte**: `/documentos/tipos_intercomunicacao_mni_222.html` - Documentação oficial TJSC/MNI 2.2.2
**Data do Documento**: Página de ajuda oficial do EProc MNI 2.2.2
