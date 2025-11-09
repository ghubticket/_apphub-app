# 🚀 Setup Rápido - Frontend EventHub

## 1. Instalar Dependências

```bash
cd frontend
npm install
```

## 2. Configurar Variáveis de Ambiente

```bash
# Copiar .env.example para .env
cp .env.example .env

# Editar .env e configurar:
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 3. Rodar em Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## ✅ O que já está configurado:

- ✅ Next.js 14 (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS (utilitários)
- ✅ SASS (estilos customizados)
- ✅ Fonte Quicksand (Google Fonts)
- ✅ Componente Button (exemplo)
- ✅ Cliente API (Axios)
- ✅ Estrutura de pastas

## 📁 Estrutura Criada:

```
frontend/
├── app/
│   ├── layout.tsx          # Layout com fonte Quicksand
│   ├── page.tsx            # Página inicial (exemplo)
│   └── globals.scss        # Estilos globais (Tailwind + SASS)
├── components/
│   └── shared/
│       ├── Button.tsx      # Componente Button (exemplo)
│       ├── Button.module.scss
│       └── Container.tsx   # Componente Container
├── styles/
│   ├── _variables.scss     # Variáveis SASS
│   ├── _mixins.scss        # Mixins SASS
│   └── _reset.scss         # Reset CSS
├── lib/
│   └── api.ts              # Cliente Axios configurado
└── package.json
```

## 🎨 Como Usar:

### Tailwind (Utilitários):
```tsx
<div className="container mx-auto px-4 flex flex-col md:flex-row gap-4">
  {/* Container, flexbox, responsivo */}
</div>
```

### SASS (Custom):
```tsx
import styles from './Component.module.scss';

<div className={styles.card}>
  {/* Seus estilos customizados */}
</div>
```

## 🎯 Próximos Passos:

1. Criar páginas (Landing, Eventos, Checkout)
2. Criar componentes (EventCard, CheckoutForm)
3. Integrar com backend API
4. Implementar autenticação

---

**Pronto para começar!** 🎉

