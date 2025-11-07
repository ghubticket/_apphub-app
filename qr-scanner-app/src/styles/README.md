# Sistema de Estilos - Design System

## Estrutura

```
src/styles/
├── variables.css    # Variáveis CSS (cores, espaçamentos, tipografia, etc)
├── reset.css        # Reset CSS e estilos base
└── templates.css    # Templates reutilizáveis (cards, buttons, inputs, etc)
```

## Uso

### 1. Variáveis CSS (`variables.css`)

Todas as variáveis estão disponíveis globalmente via `:root`:

```css
/* Cores */
background: var(--color-primary);
color: var(--color-text-primary);

/* Espaçamentos */
padding: var(--spacing-md);
margin: var(--spacing-lg);

/* Border Radius */
border-radius: var(--radius-lg);

/* Shadows */
box-shadow: var(--shadow-xl);

/* Typography */
font-size: var(--font-size-base);
font-weight: var(--font-weight-semibold);
```

### 2. Templates Reutilizáveis (`templates.css`)

Classes prontas para uso:

```html
<!-- Card -->
<div class="card">Conteúdo</div>
<div class="card card-compact">Conteúdo compacto</div>
<div class="card card-spacious">Conteúdo espaçoso</div>

<!-- Botões -->
<button class="btn btn-primary">Primário</button>
<button class="btn btn-secondary">Secundário</button>
<button class="btn btn-success">Sucesso</button>
<button class="btn btn-danger">Perigo</button>

<!-- Inputs -->
<input type="text" class="input" placeholder="Digite...">

<!-- Flexbox -->
<div class="flex flex-center">Centralizado</div>
<div class="flex flex-between">Space Between</div>
<div class="flex flex-col gap-md">Coluna</div>

<!-- Espaçamentos -->
<div class="mb-lg mt-md p-sm">Espaçamentos</div>

<!-- Texto -->
<p class="text-primary font-semibold text-lg">Texto estilizado</p>
```

## Padrões

### Cards
- Use `.card` para containers de conteúdo
- Padding padrão: `var(--spacing-md)`
- Border radius: `var(--radius-lg)`
- Box shadow: `var(--shadow-md)`

### Botões
- Use `.btn` + `.btn-primary`, `.btn-secondary`, etc.
- Sempre use variáveis CSS para cores
- Transições: `var(--transition-base)`

### Espaçamentos
- Use variáveis: `var(--spacing-sm)`, `var(--spacing-md)`, etc.
- Nunca use valores hardcoded como `1rem`, `16px`, etc.

## Manutenção

- **Nunca duplique estilos** - Use templates ou variáveis
- **Sempre use variáveis CSS** - Facilita manutenção e consistência
- **Organize por componente** - Cada componente tem seu próprio arquivo CSS
- **Documente estilos customizados** - Comentários explicando o propósito

