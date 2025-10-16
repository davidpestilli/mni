# 🚀 Início Rápido - MNI Web App

## Comandos para começar agora

### 1. Instalar dependências

```bash
cd C:\Users\david\MNI\mni-web-app\backend
npm install
```

### 2. Configurar ambiente

```bash
# Copiar arquivo de exemplo
copy .env.example .env

# Editar .env com suas configurações
notepad .env
```

**Configure no .env:**
```env
MNI_ENDPOINT=https://[URL_DO_TRIBUNAL]/ws/mni
MNI_WSDL_URL=https://[URL_DO_TRIBUNAL]/ws/mni?wsdl
```

### 3. Iniciar servidor

```bash
npm start
```

### 4. Acessar aplicação

Abra o navegador em: **http://localhost:3000/login.html**

---

## ✅ Checklist de Verificação

Antes de começar, certifique-se de que você tem:

- [ ] Node.js instalado (versão 16+)
- [ ] URL do endpoint MNI de **homologação**
- [ ] Credenciais de teste do eproc
- [ ] Acesso à rede do tribunal (se necessário)

---

## 🎯 Primeiro Teste

1. **Login**: Use CPF ou sigla + senha de homologação
2. **Ver Avisos**: A lista de avisos pendentes carrega automaticamente
3. **Consultar Processo**: Digite um número de processo (20 dígitos)
4. **Testar Upload**: Na aba "Peticionamento", teste o upload de um PDF

---

## ⚠️ Problemas Comuns

### "Cannot find module 'soap'"
```bash
cd backend
npm install
```

### "Falha ao conectar com serviço MNI"
- Verifique a URL no arquivo `.env`
- Teste o WSDL no navegador
- Confirme acesso à rede

### "Autenticação inválida"
- Verifique se está usando credenciais de **homologação**
- Use **sigla** se tiver múltiplos perfis
- Teste login na interface web do eproc

---

## 📝 Próximos Passos

1. **Ler o README.md completo** para entender toda a aplicação
2. **Ajustar os parsers** em `backend/services/mniClient.js` conforme retorno real
3. **Testar diferentes cenários** de uso
4. **Consultar o ROADMAP_APRENDIZAGEM_MNI.md** para aprender mais sobre MNI

---

## 🆘 Precisa de Ajuda?

1. Verifique os logs do servidor no terminal
2. Abra o console do navegador (F12) para ver erros no frontend
3. Consulte o README.md seção "Troubleshooting"
4. Revise os documentos de referência do MNI na pasta raiz

---

**Boa sorte com seus testes! 🎉**
