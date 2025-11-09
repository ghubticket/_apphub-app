# 🚀 Comandos Rápidos - Frontend

## Setup Inicial

```bash
# 1. Entrar na pasta
cd frontend

# 2. Instalar dependências
npm install

# 3. Copiar .env.example para .env (manualmente)
# Editar .env e configurar NEXT_PUBLIC_API_URL

# 4. Rodar em desenvolvimento
npm run dev
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # http://localhost:3000

# Build
npm run build        # Build para produção

# Produção
npm start            # Rodar build de produção

# Lint
npm run lint         # Verificar erros
```

## 📁 Estrutura Criada

```
frontend/
├── app/
│   ├── layout.tsx          ✅ Layout com Quicksand
│   ├── page.tsx            ✅ Página inicial (exemplo)
│   └── globals.scss        ✅ Tailwind + SASS
├── components/
│   └── shared/
│       ├── Button.tsx       ✅ Componente Button
│       ├── Button.module.scss
│       ├── Card.tsx         ✅ Componente Card
│       ├── Card.module.scss
│       └── Container.tsx    ✅ Componente Container
├── styles/
│   ├── _variables.scss      ✅ Variáveis SASS
│   ├── _mixins.scss         ✅ Mixins SASS
│   └── _reset.scss          ✅ Reset CSS
├── lib/
│   └── api.ts               ✅ Cliente Axios
└── package.json             ✅ Dependências
```

## ✅ Tudo Pronto!

- ✅ Next.js 14 configurado
- ✅ Tailwind CSS configurado
- ✅ SASS configurado
- ✅ TypeScript configurado
- ✅ Componentes base criados
- ✅ Cliente API configurado

## 🎨 Exemplo de Uso

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

### Combinado:
```tsx
import styles from './Component.module.scss';

<div className={`${styles.card} container mx-auto p-4 flex gap-4`}>
  {/* Tailwind + SASS juntos */}
</div>
```

---

**Próximo passo:** `npm install` e depois `npm run dev`! 🎉

