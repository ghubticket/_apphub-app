# EventHub Frontend

Frontend do cliente para compra de ingressos.

## 🚀 Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (utilitários)
- **SASS** (estilos customizados)
- **React Hook Form** + **Zod** (validação)
- **Zustand** (state management)
- **Axios** (API client)

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start
```

## 🎨 Estrutura

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout raiz
│   ├── page.tsx           # Página inicial
│   └── globals.scss       # Estilos globais
├── components/          # Componentes React
│   └── shared/           # Componentes compartilhados
├── styles/               # Estilos SASS
│   ├── _variables.scss   # Variáveis
│   ├── _mixins.scss      # Mixins
│   └── _reset.scss       # Reset CSS
├── lib/                  # Utilitários
│   └── api.ts           # Cliente Axios
└── types/                # TypeScript types
```

## 🎯 Uso

### Tailwind CSS (Utilitários)
```tsx
<div className="container mx-auto px-4 flex flex-col md:flex-row gap-4">
  {/* Container, flexbox, responsivo */}
</div>
```

### SASS (Estilos Customizados)
```tsx
import styles from './Component.module.scss';

<div className={styles.card}>
  {/* Estilos customizados */}
</div>
```

## 🔧 Configuração

1. Copiar `.env.example` para `.env`
2. Configurar `NEXT_PUBLIC_API_URL` com a URL do backend
3. Rodar `npm install`
4. Rodar `npm run dev`

## 📝 Próximos Passos

- [ ] Criar páginas (Landing, Eventos, Checkout)
- [ ] Criar componentes (EventCard, CheckoutForm)
- [ ] Integrar com backend API
- [ ] Implementar autenticação
- [ ] Integrar Mercado Pago

