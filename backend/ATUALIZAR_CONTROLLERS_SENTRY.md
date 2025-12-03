# Atualização de Controllers para Sentry

Este documento lista todos os controllers que precisam ser atualizados para usar o utilitário centralizado de captura de erros.

## Status

- ✅ `authController.ts` - Parcialmente atualizado
- ✅ `ordersController.ts` - Parcialmente atualizado  
- ⏳ `paymentController.ts` - Pendente
- ⏳ `ticketsController.ts` - Pendente
- ⏳ `ticketTypesController.ts` - Pendente
- ⏳ `eventsController.ts` - Pendente
- ⏳ `usersController.ts` - Pendente
- ⏳ `promoterCodesController.ts` - Pendente
- ⏳ `newsletterController.ts` - Pendente
- ⏳ `catalogController.ts` - Pendente

## Como Aplicar

Para cada controller, faça:

1. **Adicionar import:**
```typescript
import { captureControllerError } from '../utils/sentryErrorHandler';
```

2. **Substituir catch blocks:**
```typescript
// ANTES
catch (error: any) {
    console.error('Erro...', error);
    res.status(500).json({ ... });
}

// DEPOIS
catch (error: any) {
    console.error('Erro...', error);
    
    captureControllerError(error, req, {
        controller: 'nomeController',
        action: 'nomeAction',
        statusCode: 500,
        extra: { /* contexto adicional */ },
    });
    
    res.status(500).json({ ... });
}
```

## Regras

- ✅ **ENVIAR ao Sentry:** Erros 500, erros de banco, erros de integração
- ❌ **NÃO ENVIAR:** Erros 400/401/404/409 (validação, não encontrado, etc)

O utilitário `captureControllerError` já faz essa diferenciação automaticamente!

