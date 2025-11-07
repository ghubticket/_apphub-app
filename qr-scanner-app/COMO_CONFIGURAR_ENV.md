# 🔧 Como Configurar o arquivo .env

## ⚠️ Problema

Quando você acessa o app via ngrok no celular, o app tenta acessar `http://localhost:3001/api`, mas `localhost` no celular aponta para o próprio celular, não para o seu computador!

## ✅ Solução

Configure o arquivo `.env` para usar o IP do seu computador.

### Passo 1: Descobrir o IP do seu computador

**Windows:**
```powershell
ipconfig
```
Procure por "Endereço IPv4" na seção do seu adaptador Wi-Fi/Ethernet.

**Ou use o script:**
```bash
cd qr-scanner-app
npm run get-ip
```

### Passo 2: Criar o arquivo `.env`

Na pasta `qr-scanner-app`, crie um arquivo chamado `.env` (sem extensão, apenas `.env`).

**Conteúdo do arquivo:**
```env
VITE_API_URL=http://192.168.18.157:3001/api
```

**⚠️ IMPORTANTE:** Substitua `192.168.18.157` pelo IP do seu computador!

### Passo 3: Reiniciar o servidor

**MUITO IMPORTANTE:** Após criar/editar o `.env`, você DEVE:

1. **Parar o servidor** (Ctrl+C no terminal onde está rodando)
2. **Iniciar novamente:**
   ```bash
   npm run dev
   ```

O Vite só carrega variáveis de ambiente na inicialização!

### Passo 4: Verificar

No console do navegador (F12), você deve ver:
```
✅ Usando VITE_API_URL do .env: http://192.168.18.157:3001/api
🔗 API URL configurada: http://192.168.18.157:3001/api
```

Se ainda aparecer `localhost`, o `.env` não foi carregado. Verifique:
- [ ] Arquivo está na pasta `qr-scanner-app` (mesma pasta do `package.json`)
- [ ] Nome do arquivo é exatamente `.env` (sem extensão)
- [ ] Servidor foi reiniciado após criar o arquivo
- [ ] IP está correto no arquivo

## 📝 Exemplo Completo

**Estrutura de pastas:**
```
qr-scanner-app/
├── .env          ← Arquivo aqui!
├── package.json
├── vite.config.ts
└── src/
```

**Conteúdo do `.env`:**
```env
VITE_API_URL=http://192.168.18.157:3001/api
```

**Depois de criar, reinicie:**
```bash
# Parar (Ctrl+C)
# Depois:
npm run dev
```

## 🔍 Troubleshooting

### "Ainda mostra localhost no console"

- Verifique se o arquivo está na pasta correta
- Verifique se o nome é exatamente `.env` (não `.env.txt` ou `.env.local`)
- **Reinicie o servidor** (muito importante!)

### "Erro de conexão continua"

- Verifique se o backend está rodando: `http://192.168.18.157:3001`
- Verifique se o IP está correto
- Verifique se o celular está na mesma rede Wi-Fi

### "Como saber se o .env foi carregado?"

No console do navegador, você verá:
- ✅ Se carregou: `✅ Usando VITE_API_URL do .env: http://...`
- ❌ Se não carregou: `❌ ERRO: VITE_API_URL não configurado!`

