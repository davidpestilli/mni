# Migração para React + Vite + Tailwind

## 📋 Resumo

O projeto MNI foi migrado de HTML/CSS/Vanilla JS para **React + Vite + Tailwind CSS 3.3.5**, mantendo **toda a funcionalidade e lógica** do projeto original.

## ✅ O que foi Migrado

### Estrutura do Projeto

```
mni/
├── backend/                    # Backend inalterado (Express + SOAP)
│   └── server.js              # Atualizado para servir build React
│
├── frontend/                   # Frontend original (mantido para referência)
│
├── frontend-react/             # Novo frontend React + Vite + Tailwind
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Avisos.jsx
│   │   │   ├── Processos.jsx
│   │   │   ├── Peticionamento.jsx
│   │   │   ├── PeticionamentoInicial.jsx
│   │   │   └── DebugSOAP.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── utils.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
```

### Componentes Migrados

| Original | React Component | Status |
|----------|----------------|--------|
| `login.html` + `login.js` | `Login.jsx` | ✅ Completo |
| `index.html` + `app.js` | `Dashboard.jsx` | ✅ Completo |
| `avisos.js` | `Avisos.jsx` | ✅ Completo |
| `processos.js` | `Processos.jsx` | ✅ Completo |
| `peticionamento.js` | `Peticionamento.jsx` | ✅ Completo |
| `peticionamento-inicial.html` | `PeticionamentoInicial.jsx` | 🔄 Placeholder |
| `ambiente.js` | Integrado no `Dashboard.jsx` | ✅ Completo |
| `debug.js` | `DebugSOAP.jsx` | ✅ Completo |
| `utils.js` | `utils/utils.js` | ✅ Completo |
| `style.css` | `index.css` (Tailwind) | ✅ Completo |

### Funcionalidades Mantidas

✅ **Autenticação**
- Login com CPF/Sigla + Senha
- Seleção de Sistema (Civil 1G, Exec Fiscal, Civil 2G)
- Seleção de Ambiente (HML/PROD)
- ID Representado (opcional)
- Gestão de token no localStorage
- Context API para estado global de autenticação

✅ **Avisos Pendentes**
- Carregamento paralelo de avisos aguardando e abertos
- Suporte MNI 2.2 e MNI 3.0
- Botão "Abrir Prazo"
- Descrições de classe processual (cache)
- Filtro por ID Representado

✅ **Consulta de Processos**
- Consulta por número de processo (20 dígitos)
- Chave de consulta (opcional)
- Data de referência (opcional)
- Exibição de detalhes, movimentos e documentos
- Download de documentos (Base64)

✅ **Peticionamento Intermediário**
- Upload de PDF (máx 11MB)
- Seleção de tipo de documento
- CPF do signatário
- Descrição
- Conversão arquivo → Base64

✅ **Debug SOAP**
- Visualização de logs de requisições SOAP
- Request/Response XML
- Limpeza de logs
- Interface master-detail

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
# Backend (não mudou)
cd backend
npm install

# Frontend React (novo)
cd ../frontend-react
npm install
```

### 2. Desenvolvimento

#### Opção A: Frontend e Backend Separados (Recomendado)

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Roda em http://localhost:3000

# Terminal 2 - Frontend React (dev server)
cd frontend-react
npm run dev
# Roda em http://localhost:5173 com proxy para API
```

#### Opção B: Frontend Build + Backend Integrado

```bash
# 1. Build do frontend React
cd frontend-react
npm run build
# Gera pasta dist/

# 2. Rodar backend (serve automaticamente o build)
cd ../backend
npm start
# Acesse http://localhost:3000
```

### 3. Produção

```bash
# 1. Build do frontend
cd frontend-react
npm run build

# 2. Deploy do backend + frontend-react/dist
cd ../backend
npm start
```

## 🛠️ Tecnologias Usadas

### Frontend React

- **React 18.2** - Biblioteca UI
- **React Router DOM 6.20** - Roteamento SPA
- **Vite 5.0** - Build tool e dev server
- **Tailwind CSS 3.3.5** - Framework CSS utility-first
- **PostCSS + Autoprefixer** - Processamento CSS

### Backend (Inalterado)

- **Express 4.18** - Web framework
- **SOAP 1.0** - Cliente SOAP para MNI
- **XML2JS 0.6** - Parser XML
- **Dotenv 16.3** - Variáveis de ambiente

## 📦 Estrutura de Rotas React

```jsx
/login               → Login.jsx (público)
/dashboard           → Dashboard.jsx (protegido)
/peticionamento-inicial → PeticionamentoInicial.jsx (protegido)
/                    → Redireciona para /dashboard
```

**Rotas Protegidas:**
- Requerem autenticação (token no localStorage)
- Redirecionam para `/login` se não autenticado
- Gerenciadas pelo `AuthContext`

## 🎨 Sistema de Estilos

### Tailwind Config

```javascript
// tailwind.config.js
{
  theme: {
    extend: {
      colors: {
        primary: { 50-900 },  // Azul
        success: { 50-700 },  // Verde
        danger: { 50-700 },   // Vermelho
        warning: { 50-600 }   // Amarelo
      }
    }
  }
}
```

### Classes Customizadas

```css
/* src/index.css */
@layer components {
  .btn { /* base button */ }
  .btn-primary { /* gradient primary */ }
  .btn-secondary { /* gray secondary */ }
  .card { /* white card com shadow */ }
  .input { /* input field */ }
  .badge { /* status badge */ }
  /* ... e mais */
}
```

## 📝 Diferenças da Implementação Original

### Mudanças Positivas

✅ **Componentes Reutilizáveis**
- Código modular em vez de arquivos HTML/JS separados
- Componentes podem ser reutilizados

✅ **Gestão de Estado Melhorada**
- React Hooks (`useState`, `useEffect`)
- Context API para autenticação global
- Props e callbacks para comunicação entre componentes

✅ **Roteamento SPA**
- Navegação sem reload de página
- URLs amigáveis
- Histórico do navegador funciona corretamente

✅ **Build Otimizado**
- Vite gera bundle otimizado
- Code splitting automático
- Hot Module Replacement (HMR) no dev

✅ **CSS Utility-First**
- Tailwind reduz tamanho do CSS
- Classes reutilizáveis
- Design system consistente

### Funcionalidades a Implementar

🔄 **Peticionamento Inicial Completo**
- Formulário cascata (Localidade → Competência → Classe → Assunto)
- Gestão de múltiplas partes
- Validação CPF/CNPJ/OAB
- O original está em `frontend/peticionamento-inicial.html` (1174 linhas)

## 🔧 Configuração do Backend

O `server.js` foi atualizado para servir automaticamente o build React:

```javascript
// Detecta build React e serve, senão usa frontend vanilla
if (fs.existsSync(reactBuildPath)) {
    app.use(express.static(reactBuildPath));
} else {
    app.use(express.static(vanillaFrontendPath));
}

// Suporte SPA - todas as rotas servem index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(reactBuildPath, 'index.html'));
});
```

## 🧪 Testando a Migração

### Checklist de Funcionalidades

- [ ] Login com CPF/Sigla + Senha
- [ ] Seleção de Sistema e Ambiente
- [ ] Carregamento de Avisos Pendentes
- [ ] Carregamento de Prazos Abertos
- [ ] Botão "Abrir Prazo"
- [ ] Consulta de Processo
- [ ] Download de Documentos
- [ ] Peticionamento Intermediário
- [ ] Upload de PDF
- [ ] Debug SOAP (visualização de logs)
- [ ] Logout

### Comandos de Teste

```bash
# Verificar se backend está rodando
curl http://localhost:3000/api/health

# Verificar se frontend está buildado
ls frontend-react/dist/index.html

# Rodar frontend dev com proxy
cd frontend-react && npm run dev
```

## 📚 Próximos Passos

### Melhorias Sugeridas

1. **Peticionamento Inicial Completo**
   - Migrar formulário cascata de `peticionamento-inicial.html`
   - Implementar gestão de partes (polo ativo/passivo)

2. **Testes Automatizados**
   - Jest + React Testing Library
   - Testes de componentes
   - Testes de integração

3. **Validações Aprimoradas**
   - Yup ou Zod para schemas de validação
   - Feedback visual melhorado

4. **Estado Global Avançado**
   - Zustand ou Redux Toolkit (se necessário)
   - Persistência de estado além do localStorage

5. **Acessibilidade**
   - ARIA labels
   - Navegação por teclado
   - Contraste de cores WCAG AA

6. **Performance**
   - React.memo em componentes grandes
   - Lazy loading de rotas
   - Virtualization para listas grandes

## 🆘 Troubleshooting

### Problema: "Cannot find module react"

```bash
cd frontend-react
rm -rf node_modules package-lock.json
npm install
```

### Problema: Build não aparece no servidor

```bash
# Verificar se dist existe
ls frontend-react/dist

# Se não existir, buildar novamente
cd frontend-react
npm run build

# Reiniciar backend
cd ../backend
npm start
```

### Problema: Proxy não funciona no dev

```bash
# Verificar vite.config.js
{
  server: {
    proxy: {
      '/api': 'http://localhost:3000'  // Certifique-se que está correto
    }
  }
}
```

### Problema: Estilos Tailwind não aplicam

```bash
# Verificar se PostCSS está configurado
cat frontend-react/postcss.config.js

# Verificar content em tailwind.config.js
content: ["./index.html", "./src/**/*.{js,jsx}"]

# Rebuildar
npm run dev
```

## 📄 Licença

Este projeto mantém a mesma licença e propósito educacional do projeto original.

⚠️ **NÃO USE EM PRODUÇÃO** - Aplicação desenvolvida para fins de:
- Aprendizagem
- Testes
- Troubleshooting
- Demonstrações técnicas

## 👨‍💻 Autor

Migração realizada mantendo toda a lógica e funcionalidades do projeto MNI original.

---

**Data da Migração:** 2025-01-16
**Versão React:** 18.2.0
**Versão Vite:** 5.0.0
**Versão Tailwind:** 3.3.5
