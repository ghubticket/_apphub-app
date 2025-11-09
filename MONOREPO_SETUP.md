# Setup Monorepo - Next.js com SASS

## ✅ Monorepo é PERFEITO para este projeto!

### Vantagens do Monorepo:
- ✅ **Código compartilhado**: Types, utils, configs entre projetos
- ✅ **Deploy simplificado**: Um repo, múltiplos deploys
- ✅ **Versionamento**: Tudo sincronizado
- ✅ **Desenvolvimento**: Mais fácil de manter

### Estrutura Atual (já está assim!):
```
_apphub-back/
├── backend/              # API Node.js
├── dashboard/            # Dashboard admin (Next.js existente)
├── qr-scanner-app/       # PWA validador (Vite + React)
└── frontend/             # Frontend cliente (Next.js - VAMOS CRIAR)
```

---

## 🎨 Next.js com SASS - Configuração

### 1. Instalar SASS no Next.js

Next.js tem suporte **nativo** para SASS! Basta instalar:

```bash
npm install sass
# ou
yarn add sass
# ou
pnpm add sass
```

**Pronto!** Next.js detecta automaticamente arquivos `.scss` e `.sass`.

---

## 📁 Estrutura Recomendada com SASS

```
frontend/
├── app/                          # Next.js App Router
│   ├── (public)/                # Páginas públicas
│   │   ├── page.tsx             # Landing
│   │   ├── eventos/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Detalhe evento
│   │   └── checkout/
│   │       └── page.tsx         # Checkout
│   ├── layout.tsx               # Layout raiz
│   └── globals.scss             # Estilos globais
│
├── components/                  # Componentes React
│   ├── ui/                      # Componentes base (Shadcn)
│   ├── events/                  # Componentes de eventos
│   │   ├── EventCard.tsx
│   │   ├── EventCard.module.scss
│   │   ├── EventList.tsx
│   │   └── EventList.module.scss
│   ├── checkout/                # Componentes de checkout
│   │   ├── CheckoutForm.tsx
│   │   ├── CheckoutForm.module.scss
│   │   ├── PaymentMethod.tsx
│   │   └── PaymentMethod.module.scss
│   └── shared/                  # Componentes compartilhados
│       ├── Button.tsx
│       ├── Button.module.scss
│       ├── Input.tsx
│       └── Input.module.scss
│
├── styles/                      # Estilos globais e variáveis
│   ├── _variables.scss          # Variáveis SASS
│   ├── _mixins.scss             # Mixins SASS
│   ├── _reset.scss              # Reset CSS
│   └── _utilities.scss          # Classes utilitárias
│
├── lib/                         # Utilitários
│   ├── api.ts                   # Cliente Axios
│   └── utils.ts                 # Helpers
│
├── types/                       # TypeScript types
│   └── index.ts
│
├── public/                      # Arquivos estáticos
│   ├── images/
│   └── favicon.ico
│
├── next.config.js               # Config Next.js
├── tsconfig.json                # Config TypeScript
└── package.json
```

---

## 🎨 Estrutura SASS Recomendada

### `styles/_variables.scss`
```scss
// Cores
$primary: #667eea;
$primary-dark: #764ba2;
$secondary: #f59e0b;
$success: #10b981;
$danger: #ef4444;
$warning: #f59e0b;
$info: #3b82f6;

// Cores neutras
$white: #ffffff;
$black: #000000;
$gray-50: #f9fafb;
$gray-100: #f3f4f6;
$gray-200: #e5e7eb;
$gray-300: #d1d5db;
$gray-400: #9ca3af;
$gray-500: #6b7280;
$gray-600: #4b5563;
$gray-700: #374151;
$gray-800: #1f2937;
$gray-900: #111827;

// Tipografia
$font-family-base: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-size-base: 16px;
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// Espaçamento
$spacing-xs: 0.25rem;   // 4px
$spacing-sm: 0.5rem;     // 8px
$spacing-md: 1rem;       // 16px
$spacing-lg: 1.5rem;     // 24px
$spacing-xl: 2rem;       // 32px
$spacing-2xl: 3rem;      // 48px

// Breakpoints
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1536px;

// Border radius
$radius-sm: 0.25rem;   // 4px
$radius-md: 0.5rem;   // 8px
$radius-lg: 0.75rem;  // 12px
$radius-xl: 1rem;     // 16px
$radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

// Transitions
$transition-fast: 150ms;
$transition-base: 300ms;
$transition-slow: 500ms;
```

### `styles/_mixins.scss`
```scss
// Responsive breakpoints
@mixin respond-to($breakpoint) {
  @if $breakpoint == sm {
    @media (min-width: $breakpoint-sm) { @content; }
  }
  @if $breakpoint == md {
    @media (min-width: $breakpoint-md) { @content; }
  }
  @if $breakpoint == lg {
    @media (min-width: $breakpoint-lg) { @content; }
  }
  @if $breakpoint == xl {
    @media (min-width: $breakpoint-xl) { @content; }
  }
  @if $breakpoint == 2xl {
    @media (min-width: $breakpoint-2xl) { @content; }
  }
}

// Flexbox center
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// Truncate text
@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Button base
@mixin button-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-sm $spacing-md;
  font-weight: $font-weight-medium;
  border-radius: $radius-md;
  transition: all $transition-base;
  cursor: pointer;
  border: none;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Card base
@mixin card-base {
  background: $white;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  padding: $spacing-lg;
}
```

### `styles/_reset.scss`
```scss
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: $font-size-base;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: $font-family-base;
  font-weight: $font-weight-normal;
  line-height: 1.5;
  color: $gray-900;
  background-color: $gray-50;
}

// Links
a {
  color: $primary;
  text-decoration: none;
  transition: color $transition-base;
  
  &:hover {
    color: $primary-dark;
  }
}

// Images
img {
  max-width: 100%;
  height: auto;
  display: block;
}

// Buttons
button {
  font-family: inherit;
  font-size: inherit;
}

// Inputs
input, textarea, select {
  font-family: inherit;
  font-size: inherit;
}
```

### `app/globals.scss`
```scss
// Importar variáveis e mixins primeiro
@import '../styles/variables';
@import '../styles/mixins';
@import '../styles/reset';

// Estilos globais
:root {
  // CSS Variables (para usar no JS se precisar)
  --color-primary: #{$primary};
  --color-primary-dark: #{$primary-dark};
  --spacing-md: #{$spacing-md};
  --radius-md: #{$radius-md};
}

// Classes utilitárias globais
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 $spacing-md;
  
  @include respond-to(lg) {
    padding: 0 $spacing-lg;
  }
}

.text-center {
  text-align: center;
}

.mt-1 { margin-top: $spacing-sm; }
.mt-2 { margin-top: $spacing-md; }
.mt-3 { margin-top: $spacing-lg; }
.mb-1 { margin-bottom: $spacing-sm; }
.mb-2 { margin-bottom: $spacing-md; }
.mb-3 { margin-bottom: $spacing-lg; }
```

---

## 📦 Exemplo de Componente com SASS

### `components/events/EventCard.tsx`
```tsx
import styles from './EventCard.module.scss';
import Image from 'next/image';

interface EventCardProps {
  id: string;
  title: string;
  date: Date;
  location: string;
  image: string;
  price: number;
}

export default function EventCard({
  id,
  title,
  date,
  location,
  image,
  price
}: EventCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.imageWrapper}>
        <Image
          src={image}
          alt={title}
          fill
          className={styles.image}
        />
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.date}>
          {new Date(date).toLocaleDateString('pt-BR')}
        </p>
        <p className={styles.location}>{location}</p>
        <div className={styles.footer}>
          <span className={styles.price}>
            R$ {price.toFixed(2)}
          </span>
          <a href={`/eventos/${id}`} className={styles.button}>
            Ver Detalhes
          </a>
        </div>
      </div>
    </article>
  );
}
```

### `components/events/EventCard.module.scss`
```scss
@import '../../styles/variables';
@import '../../styles/mixins';

.card {
  @include card-base;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform $transition-base, box-shadow $transition-base;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-xl;
  }
}

.imageWrapper {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: $gray-200;
}

.image {
  object-fit: cover;
}

.content {
  padding: $spacing-md;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.25rem;
  font-weight: $font-weight-bold;
  color: $gray-900;
  margin-bottom: $spacing-sm;
  @include truncate;
}

.date {
  font-size: 0.875rem;
  color: $gray-600;
  margin-bottom: $spacing-xs;
}

.location {
  font-size: 0.875rem;
  color: $gray-500;
  margin-bottom: $spacing-md;
  @include truncate;
}

.footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.price {
  font-size: 1.5rem;
  font-weight: $font-weight-bold;
  color: $primary;
}

.button {
  @include button-base;
  background: $primary;
  color: $white;
  
  &:hover {
    background: $primary-dark;
  }
}
```

---

## ⚙️ Configuração Next.js

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // SASS já funciona nativamente, mas podemos configurar:
  sassOptions: {
    includePaths: ['./styles'],
    // Variáveis globais (opcional)
    // prependData: `@import "styles/variables.scss";`,
  },
  
  // Otimizações
  images: {
    domains: ['res.cloudinary.com'], // Cloudinary
    formats: ['image/avif', 'image/webp'],
  },
  
  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
```

---

## 📦 Package.json

### `frontend/package.json`
```json
{
  "name": "eventhub-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "sass": "^1.77.0",
    "axios": "^1.7.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.6.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.0"
  }
}
```

---

## 🚀 Comandos para Criar o Frontend

```bash
# 1. Criar pasta frontend
cd _apphub-back
mkdir frontend
cd frontend

# 2. Inicializar Next.js
npx create-next-app@latest . --typescript --app --no-tailwind --eslint

# 3. Instalar SASS
npm install sass

# 4. Instalar dependências adicionais
npm install axios react-hook-form zod @hookform/resolvers zustand

# 5. Criar estrutura de pastas
mkdir -p components/{ui,events,checkout,shared}
mkdir -p styles lib types

# 6. Criar arquivos SASS base
touch styles/_variables.scss
touch styles/_mixins.scss
touch styles/_reset.scss

# 7. Renomear globals.css para globals.scss
mv app/globals.css app/globals.scss

# 8. Atualizar layout.tsx para importar .scss
# (trocar import './globals.css' por './globals.scss')
```

---

## ✅ Vantagens do SASS no Next.js

1. **Suporte Nativo**: Não precisa de configuração extra
2. **CSS Modules**: `.module.scss` funciona automaticamente
3. **Variáveis e Mixins**: Organização melhor
4. **Aninhamento**: Código mais limpo
5. **Importações**: `@import` funciona perfeitamente

---

## 🎨 Workflow de Desenvolvimento

### 1. Criar Componente
```bash
# Criar componente + SASS
touch components/events/EventCard.tsx
touch components/events/EventCard.module.scss
```

### 2. Estrutura do Componente
```tsx
// EventCard.tsx
import styles from './EventCard.module.scss';

export default function EventCard() {
  return <div className={styles.card}>...</div>;
}
```

### 3. Estilizar com SASS
```scss
// EventCard.module.scss
@import '../../styles/variables';
@import '../../styles/mixins';

.card {
  @include card-base;
  // seus estilos aqui
}
```

---

## 📝 Próximos Passos

1. ✅ Criar estrutura `frontend/`
2. ✅ Configurar Next.js com SASS
3. ✅ Criar componentes base (Button, Input, Card)
4. ✅ Criar páginas (Landing, Evento, Checkout)
5. ✅ Integrar com backend API

---

## 💡 Dicas

- **CSS Modules**: Use `.module.scss` para estilos scoped
- **Variáveis Globais**: Importe em `globals.scss` ou use `sassOptions.prependData`
- **Mixins**: Crie reutilizáveis em `styles/_mixins.scss`
- **Responsive**: Use mixin `@include respond-to(md)`
- **Performance**: Next.js otimiza SASS automaticamente

---

**Pronto para começar!** 🚀

Posso ajudar a criar os componentes iniciais quando você quiser!

