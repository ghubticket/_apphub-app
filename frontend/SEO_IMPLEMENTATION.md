# Sistema de SEO Implementado

## 📋 Visão Geral

Sistema completo de SEO implementado para o frontend, incluindo:
- ✅ Meta tags (title, description, keywords)
- ✅ Open Graph tags (Facebook, WhatsApp)
- ✅ Twitter Cards
- ✅ Structured Data (JSON-LD) para rich snippets
- ✅ Breadcrumbs
- ✅ Canonical URLs
- ✅ Robots meta tags

## 🗂️ Estrutura de Arquivos

```
frontend/
├── lib/
│   └── seo.ts                    # Utilitários principais de SEO
├── components/
│   └── seo/
│       ├── DynamicMetadata.tsx   # Metadata dinâmica para páginas client-side
│       └── StructuredData.tsx    # Injeção de JSON-LD
└── public/
    └── images/
        └── og-default.jpg        # Imagem padrão para compartilhamento (1200x630px)
```

## 🚀 Como Usar

### 1. Páginas Server-Side (com `export const metadata`)

```typescript
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: 'Título da Página',
  description: 'Descrição da página',
  image: '/images/evento.jpg', // Opcional
  url: '/caminho-da-pagina',
  type: 'website', // ou 'article', 'event', 'product'
  tags: ['tag1', 'tag2'],
});
```

### 2. Páginas Client-Side (com `'use client'`)

```typescript
'use client';

import DynamicMetadata from '@/components/seo/DynamicMetadata';

export default function MyPage() {
  return (
    <>
      <DynamicMetadata
        title="Título da Página"
        description="Descrição da página"
        image="/images/evento.jpg"
        url="/caminho-da-pagina"
        type="website"
      />
      {/* Seu conteúdo aqui */}
    </>
  );
}
```

### 3. Structured Data (JSON-LD)

```typescript
import StructuredData from '@/components/seo/StructuredData';
import { generateEventStructuredData } from '@/lib/seo';

const eventData = generateEventStructuredData({
  name: 'Nome do Evento',
  description: 'Descrição do evento',
  image: '/images/evento.jpg',
  date: '2024-12-31T20:00:00Z',
  location: 'Local do Evento',
  price: 100,
  currency: 'BRL',
  id: 'event-id',
  url: '/eventos/event-id',
});

return (
  <>
    <StructuredData data={eventData} />
    {/* Seu conteúdo aqui */}
  </>
);
```

### 4. Breadcrumbs

```typescript
import StructuredData from '@/components/seo/StructuredData';
import { generateBreadcrumbStructuredData } from '@/lib/seo';

const breadcrumbData = generateBreadcrumbStructuredData([
  { name: 'Início', url: '/' },
  { name: 'Ingressos', url: '/ingressos' },
  { name: 'Evento X', url: '/eventos/evento-x' },
]);

return (
  <>
    <StructuredData data={breadcrumbData} />
    {/* Seu conteúdo aqui */}
  </>
);
```

## 📄 Páginas Implementadas

### ✅ Layout Principal (`app/layout.tsx`)
- Metadata global com Open Graph
- Structured Data da organização
- Configuração base para todas as páginas

### ✅ Home (`app/page.tsx`)
- Metadata otimizada para página inicial
- Breadcrumb structured data
- Tags relevantes para SEO

### ✅ Página de Eventos (`app/eventos/[eventId]/page.tsx`)
- Metadata dinâmica baseada no evento
- Structured Data do tipo Event
- Breadcrumbs
- Open Graph com imagem do evento
- Twitter Cards

### ✅ Página de Ingressos (`app/ingressos/page.tsx`)
- Metadata para listagem de ingressos
- Breadcrumbs

### ✅ Login (`app/login/page.tsx`)
- Metadata com `noindex` (páginas privadas não devem ser indexadas)

### ✅ Cadastro (`app/cadastro/page.tsx`)
- Metadata com `noindex`

## 🖼️ Imagens de Compartilhamento

### Requisitos
- **Tamanho recomendado**: 1200x630 pixels
- **Formato**: JPG ou PNG
- **Localização**: `public/images/og-default.jpg` (padrão)
- **Peso**: Máximo 1MB (recomendado < 500KB)

### Como Funciona
1. Se uma imagem for fornecida na metadata, ela será usada
2. Caso contrário, será usada a imagem padrão (`/images/og-default.jpg`)
3. As imagens são automaticamente convertidas para URLs absolutas

## 🔧 Configuração

### Variáveis de Ambiente

Adicione no `.env`:

```env
NEXT_PUBLIC_SITE_URL=https://toka.com.br
```

Se não configurado, o sistema tentará detectar automaticamente ou usará a URL da API como fallback.

## 📊 Structured Data Types

### Organization
- Dados da empresa/marca
- Contatos
- Redes sociais
- Injetado automaticamente no layout principal

### Event
- Informações do evento
- Data, local, preço
- Organizador
- Usado na página de eventos

### BreadcrumbList
- Navegação hierárquica
- Melhora UX e SEO
- Usado em páginas principais

## 🎯 Boas Práticas

1. **Títulos**: Máximo 60 caracteres
2. **Descrições**: Entre 150-160 caracteres
3. **Imagens OG**: Sempre 1200x630px
4. **URLs**: Sempre absolutas para Open Graph
5. **Structured Data**: Validar com [Google Rich Results Test](https://search.google.com/test/rich-results)
6. **Páginas privadas**: Usar `noindex: true`

## 🧪 Validação

### Ferramentas Recomendadas
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### Checklist
- [ ] Títulos únicos em cada página
- [ ] Descrições relevantes e únicas
- [ ] Imagens OG configuradas
- [ ] Structured Data validado
- [ ] URLs canônicas corretas
- [ ] Robots meta tags apropriadas

## 📝 Notas Importantes

1. **Páginas Client-Side**: Usar `DynamicMetadata` em vez de `export const metadata`
2. **Imagens**: Sempre usar URLs absolutas para Open Graph
3. **Structured Data**: Pode ser combinado (múltiplos `<StructuredData />`)
4. **Performance**: Structured Data é injetado via `useEffect` para não bloquear renderização

## 🔄 Próximos Passos

1. Criar imagem OG padrão real (1200x630px)
2. Adicionar metadata em outras páginas (termos, privacidade, etc.)
3. Implementar sitemap.xml
4. Implementar robots.txt
5. Adicionar hreflang tags (se houver múltiplos idiomas)

