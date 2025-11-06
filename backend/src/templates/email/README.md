# Templates de Email

Esta pasta contém os templates de email do sistema EventHub.

## Estrutura

```
templates/
├── README.md (este arquivo)
├── base.html (template base com layout comum)
├── ticket-confirmation.html (confirmação de compra com ingressos)
├── payment-pending.html (pagamento pendente)
├── payment-confirmed.html (pagamento confirmado)
├── order-cancelled.html (pedido cancelado)
└── ... (outros templates conforme necessário)
```

## Como usar

```typescript
import { renderTemplate } from '../utils/templateRenderer';
import { sendEmail } from '../services/emailService';

// Renderizar template
const html = await renderTemplate('ticket-confirmation', {
    customerName: 'João Silva',
    orderNumber: 'ORD-12345',
    eventName: 'Show de Rock',
    // ... outros dados
});

// Enviar email
await sendEmail({
    to: 'cliente@exemplo.com',
    subject: 'Seus ingressos estão confirmados!',
    html
});
```

## Variáveis disponíveis

Cada template recebe um objeto com as variáveis necessárias. Consulte a documentação de cada template para ver quais variáveis são esperadas.

