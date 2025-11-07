# 🔧 Solução de Problemas - Acesso à Câmera

## Problemas Comuns e Soluções

### 1. "Permissão negada" / "NotAllowedError"

**Causa:** O navegador bloqueou o acesso à câmera.

**Solução:**
- **Chrome (Android):**
  1. Toque no ícone de cadeado/info na barra de endereço
  2. Vá em "Configurações do site"
  3. Permita "Câmera"
  4. Recarregue a página

- **Safari (iOS):**
  1. Vá em Configurações → Safari → Câmera
  2. Permita acesso à câmera
  3. Recarregue a página

- **Chrome (Desktop):**
  1. Clique no ícone de cadeado na barra de endereço
  2. Permita "Câmera"
  3. Recarregue a página

### 2. "Câmera já está em uso" / "NotReadableError"

**Causa:** Outro aplicativo está usando a câmera.

**Solução:**
- Feche outros apps que possam estar usando a câmera (WhatsApp, Instagram, etc.)
- Reinicie o navegador
- Reinicie o dispositivo se necessário

### 3. "Nenhuma câmera encontrada" / "NotFoundError"

**Causa:** Nenhuma câmera disponível ou não detectada.

**Solução:**
- Verifique se há uma câmera no dispositivo
- Verifique se a câmera não está bloqueada fisicamente
- Tente em outro navegador

### 4. "Acesso à câmera requer HTTPS"

**Causa:** Navegadores modernos exigem HTTPS para acesso à câmera (exceto localhost).

**Solução para desenvolvimento:**
- Use `http://localhost:5174` no desktop
- Para celular, você pode:
  1. Usar um túnel HTTPS (ngrok, Cloudflare Tunnel, etc.)
  2. Ou configurar HTTPS local (mais complexo)

**Solução para produção:**
- Use HTTPS sempre em produção

### 5. "Seu navegador não suporta acesso à câmera"

**Causa:** Navegador muito antigo ou sem suporte a `getUserMedia`.

**Solução:**
- Atualize o navegador
- Use Chrome, Firefox ou Safari atualizados

## 📱 Dicas para Celular

1. **Use Chrome ou Safari** (navegadores mais compatíveis)
2. **Permita permissões** quando solicitado
3. **Feche outros apps** que possam estar usando a câmera
4. **Recarregue a página** após permitir permissões
5. **Instale como PWA** para melhor experiência

## 🔍 Verificar Permissões

No console do navegador (F12), você pode verificar:

```javascript
// Verificar se há suporte
navigator.mediaDevices && navigator.mediaDevices.getUserMedia

// Listar câmeras disponíveis
navigator.mediaDevices.enumerateDevices().then(devices => {
  console.log(devices.filter(d => d.kind === 'videoinput'));
});
```

## ✅ Checklist

- [ ] Navegador atualizado (Chrome, Firefox ou Safari)
- [ ] Permissões de câmera permitidas no navegador
- [ ] Nenhum outro app usando a câmera
- [ ] Dispositivo tem câmera disponível
- [ ] Página recarregada após permitir permissões
- [ ] Tentando em HTTPS (produção) ou localhost (desenvolvimento)

