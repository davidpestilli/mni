# 🚀 Início Rápido - MNI React

## Instalação

### Windows (Método Mais Fácil)

1. **Duplo clique em `START_REACT.bat`**
2. Escolha uma opção:
   - `1` - Desenvolvimento (recomendado para testes)
   - `2` - Build + Produção
   - `3` - Apenas Frontend
   - `4` - Apenas Backend

### Manual

```bash
# 1. Instalar dependências
cd frontend-react
npm install

cd ../backend
npm install

# 2. Rodar em desenvolvimento
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend-react
npm run dev
```

## Acesso

- **Frontend Dev:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Frontend Build:** http://localhost:3000 (após `npm run build`)

## Credenciais de Teste

Use as mesmas credenciais do sistema original MNI.

## Estrutura do Projeto Migrado

```
mni/
├── frontend-react/        # 🆕 Novo frontend React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── contexts/     # Context API
│   │   ├── utils/        # Utilitários
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── backend/              # ✅ Backend mantido (atualizado)
│   └── server.js         # Serve React build automaticamente
│
├── frontend/             # 📦 Frontend original (mantido)
│
├── MIGRACAO_REACT.md     # 📚 Documentação completa
└── START_REACT.bat       # 🚀 Script de início rápido
```

## Verificar Instalação

```bash
# Verificar se backend está OK
curl http://localhost:3000/api/health

# Verificar se build React existe
ls frontend-react/dist/index.html
```

## Próximos Passos

1. **Testar Login** - Faça login com suas credenciais
2. **Testar Avisos** - Verifique se os avisos carregam
3. **Testar Processos** - Consulte um processo
4. **Comparar** - Compare com o frontend original

## Principais Diferenças

| Aspecto | Original | React |
|---------|----------|-------|
| Tecnologia | HTML/CSS/JS | React + Vite + Tailwind |
| Arquivos | Múltiplos HTML | SPA (Single Page App) |
| Estilos | CSS tradicional | Tailwind utility-first |
| Estado | localStorage | React Hooks + Context |
| Rotas | Páginas separadas | React Router |
| Build | Nenhum | Vite (otimizado) |

## Problemas Comuns

### "Erro ao conectar com servidor"

✅ Verifique se o backend está rodando na porta 3000

### "Não encontra módulo react"

```bash
cd frontend-react
npm install
```

### "Porta 5173 já em uso"

```bash
# Mude a porta em vite.config.js
server: { port: 5174 }
```

## 📚 Documentação

- **Completa:** `MIGRACAO_REACT.md`
- **Original:** `README.md`
- **Frontend React:** `frontend-react/README.md`

## ⚠️ Aviso

Este projeto é para **fins educacionais e de teste**. Não use em produção.
