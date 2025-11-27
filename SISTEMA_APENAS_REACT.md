# ⚠️ Sistema Vanilla Desativado - APENAS REACT

## 📌 Mudança Realizada

A partir de agora, **APENAS o sistema React é servido**. O sistema vanilla (JavaScript puro) foi completamente desativado para evitar confusão e bugs como o que ocorreu com os contadores.

## 🎯 O que mudou

### Antes
```
Backend → Verifica React build
         → Se existir → Serve React
         → Se NÃO existir → Fallback para vanilla ❌ PROBLEMA!
```

### Depois
```
Backend → Verifica React build
         → Se existir → Serve React ✅
         → Se NÃO existir → ERRO FATAL e encerra ⚠️
```

## ⚡ Implicações

### ✅ Vantagens
- **Sem confusão**: Sempre usa o mesmo sistema (React)
- **Sem cache**: Não há dúvida sobre qual sistema está sendo servido
- **Sem bugs duplicados**: Alterações feitas apenas em um lugar
- **Clara responsabilidade**: Está claro que React é o padrão

### ⚠️ Requisitos Obrigatórios

Sempre que quiser rodar o servidor, faça:

```bash
# 1. Build do React (se fez alterações)
cd frontend-react
npm run build

# 2. Voltar para backend
cd ../backend

# 3. Iniciar servidor
npm start
```

## 📂 Estrutura

```
mni/
├── frontend/                    ❌ DESATIVADO
│   ├── js/
│   ├── css/
│   └── peticionamento-inicial.html
│
├── frontend-react/              ✅ ATIVO
│   ├── src/
│   │   ├── components/
│   │   │   └── PeticionamentoInicial.jsx
│   │   └── ...
│   ├── dist/                    (Build aqui)
│   └── package.json
│
└── backend/                     🖥️ SERVIDOR
    ├── server.js               (Modificado)
    └── package.json
```

## 🔴 Erro Comum

### Se tentar iniciar sem build React:
```
❌ ERRO FATAL: Frontend React não encontrado!
   Caminho esperado: /mni/frontend-react/dist
   Execute: npm run build (dentro de frontend-react)
```

**Solução**: Execute `npm run build` em `frontend-react/`

## 📋 Checklist de Deployment

- [ ] Fez alterações em React? Execute `npm run build` em `frontend-react/`
- [ ] Build foi bem-sucedido? (Procure por `✓ built in X.XXs`)
- [ ] Iniciou o backend? (`npm start` em `backend/`)
- [ ] Servidor iniciou sem erros? (Procure por `📦 Servindo frontend React`)

## 🔗 Referências

- **Modificado**: `backend/server.js` (linhas 1-16, 27-40, 54-76)
- **Componente React**: `frontend-react/src/components/PeticionamentoInicial.jsx`
- **Arquivo vanilla**: `frontend/js/peticionamento-inicial.js` (IGNORADO)

## 💡 Dicas

1. **Desenvolvimento rápido**: Use `npm run dev` em `frontend-react/` para live reload
2. **Produção**: Use `npm run build` em `frontend-react/` antes de iniciar o server
3. **Debug**: Verifique o console do servidor para confirmar que React está sendo servido

---

**Data de implementação**: 2025-11-27
**Motivo**: Evitar problemas de cache e confusão entre sistemas
