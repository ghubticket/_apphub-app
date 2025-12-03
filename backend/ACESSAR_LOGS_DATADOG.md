# Como Acessar Logs no Datadog Sem Onboarding

## 🎯 Solução: URLs Diretas (Bookmarks)

Crie bookmarks com estas URLs para acessar diretamente, sem passar pelo onboarding:

### 1. Logs Explorer (Principal)
```
https://us5.datadoghq.com/logs/explorer
```

### 2. Logs Explorer com Filtro
```
https://us5.datadoghq.com/logs/explorer?query=service%3Aeventhub-backend
```

### 3. Live Tail (Tempo Real)
```
https://us5.datadoghq.com/logs/live-tail
```

### 4. Logs Explorer - Últimas 24h
```
https://us5.datadoghq.com/logs/explorer?query=service%3Aeventhub-backend&from_ts=0&to_ts=0&live=false
```

## 📌 Como Criar Bookmarks

### Chrome/Edge:
1. Acesse uma das URLs acima
2. Pressione `Ctrl + D` (ou `Cmd + D` no Mac)
3. Salve como bookmark
4. Pronto! Sempre acesse por aqui

### Ou Adicione à Barra de Favoritos:
1. Arraste a URL para a barra de favoritos
2. Renomeie para "Datadog Logs"
3. Clique sempre nele

## 🔧 Por Que Isso Funciona?

O Datadog redireciona para onboarding quando:
- Não detecta logs ainda
- É a primeira vez acessando

Mas as URLs diretas (`/logs/explorer`) **sempre** vão para a tela de logs, mesmo sem dados.

## ✅ Depois Que Logs Começarem a Aparecer

Uma vez que os logs começarem a aparecer no Datadog:
- O redirecionamento para onboarding vai parar automaticamente
- Você poderá acessar normalmente por "Logs" no menu
- Mas os bookmarks continuam funcionando (mais rápido!)

## 🎯 URL Recomendada (Use Esta!)

**Crie um bookmark com esta URL:**
```
https://us5.datadoghq.com/logs/explorer?query=service%3Aeventhub-backend
```

Esta URL:
- ✅ Vai direto para logs (sem onboarding)
- ✅ Já filtra por seu serviço
- ✅ Sempre funciona

## 📱 Atalho Rápido

Adicione esta URL aos seus favoritos e sempre use ela para acessar os logs!

