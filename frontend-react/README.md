# MNI Frontend React

Frontend React + Vite + Tailwind do projeto MNI.

## 🚀 Quick Start

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar dev server (com proxy para API)
npm run dev
# Acesse http://localhost:5173
```

### Build para Produção

```bash
# Gerar build otimizado
npm run build
# Arquivos gerados em: dist/

# Preview do build
npm run preview
```

## 📦 Estrutura

```
src/
├── components/          # Componentes React
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Avisos.jsx
│   ├── Processos.jsx
│   ├── Peticionamento.jsx
│   ├── PeticionamentoInicial.jsx
│   └── DebugSOAP.jsx
├── contexts/
│   └── AuthContext.jsx  # Contexto de autenticação
├── utils/
│   └── utils.js         # Funções utilitárias
├── App.jsx              # Componente raiz
├── main.jsx             # Entry point
└── index.css            # Estilos Tailwind
```

## 🛠️ Stack

- **React** 18.2
- **React Router DOM** 6.20
- **Vite** 5.0
- **Tailwind CSS** 3.3.5

## 📝 Configurações

### Vite

- Dev server: `localhost:5173`
- API proxy: `/api` → `http://localhost:3000`

### Tailwind

- Custom colors: primary, success, danger, warning
- Custom components: btn, card, input, badge
- Utilities customizadas

## 🔗 Backend

O backend deve estar rodando em `http://localhost:3000`

```bash
cd ../backend
npm run dev
```

## 📚 Documentação Completa

Veja `MIGRACAO_REACT.md` na raiz do projeto para documentação completa da migração.
