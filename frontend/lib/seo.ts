import type { Metadata } from "next";
import { APP_CONFIG, APP_NAME } from "./config";

/**
 * URL base do site (deve ser configurado via variável de ambiente)
 */
export const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Em produção, usar variável de ambiente ou URL padrão
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Fallback para desenvolvimento
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
    "https://toka.com.br"
  );
};

/**
 * URL completa para uma imagem de compartilhamento
 */
export const getOgImageUrl = (imagePath?: string): string => {
  const baseUrl = getBaseUrl();

  if (imagePath) {
    // Se já for uma URL completa, retornar como está
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    // Se for uma URL relativa, adicionar baseUrl
    if (imagePath.startsWith("/")) {
      return `${baseUrl}${imagePath}`;
    }
    // Se não começar com /, adicionar
    return `${baseUrl}/${imagePath}`;
  }

  // Imagem padrão de compartilhamento
  return `${baseUrl}/images/og-default.jpg`;
};

/**
 * Interface para opções de metadata
 */
export interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "event";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  nofollow?: boolean;
}

/**
 * Gera metadata completa para SEO
 * Inclui: title, description, Open Graph, Twitter Cards, robots, etc.
 */
export function generateMetadata(options: SEOOptions = {}): Metadata {
  const {
    title,
    description,
    image,
    url,
    type = "website",
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = [],
    noindex = false,
    nofollow = false,
  } = options;

  const baseUrl = getBaseUrl();
  const siteName = APP_NAME;
  const defaultTitle = `${APP_NAME} - Ingressos para Eventos`;
  const defaultDescription = `Compre ingressos para os melhores eventos com ${APP_NAME}. Eventos exclusivos, pagamento seguro e entrega imediata.`;
  const defaultImage = getOgImageUrl();

  const finalTitle = title ? `${title} | ${APP_NAME}` : defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalImage = getOgImageUrl(image);
  const finalUrl = url
    ? url.startsWith("http")
      ? url
      : `${baseUrl}${url}`
    : baseUrl;

  // Robots meta
  const robots = [];
  if (noindex) robots.push("noindex");
  if (nofollow) robots.push("nofollow");
  if (robots.length === 0) {
    robots.push("index", "follow");
  }

  // Next.js OpenGraph só aceita 'article' ou 'website'
  // Mapear 'event' e 'product' para 'website'
  const openGraphType: "article" | "website" =
    type === "article" ? "article" : "website";

  const metadata: Metadata = {
    title: finalTitle,
    description: finalDescription,
    keywords: tags.length > 0 ? tags.join(", ") : undefined,
    authors: author ? [{ name: author }] : undefined,
    creator: author,
    publisher: siteName,
    robots: robots.join(", "),
    openGraph: {
      type: openGraphType,
      locale: "pt_BR",
      url: finalUrl,
      siteName: siteName,
      title: finalTitle,
      description: finalDescription,
      images: [
        {
          url: finalImage,
          width: 1200,
          height: 630,
          alt: title || siteName,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags.length > 0 && { tags }),
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [finalImage],
      creator: APP_CONFIG.links.instagram
        ? `@${APP_CONFIG.links.instagram.split("/").pop()}`
        : undefined,
      site: siteName,
    },
    alternates: {
      canonical: finalUrl,
    },
    other: {
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:type": "image/jpeg",
    },
  };

  return metadata;
}

/**
 * Gera metadata específica para eventos
 */
export function generateEventMetadata(event: {
  name: string;
  description?: string;
  image?: string;
  date?: string;
  location?: string;
  id: string;
}): Metadata {
  const { name, description, image, date, location, id } = event;

  const eventUrl = `/eventos/${id}`;
  const eventDescription = description
    ? `${description.substring(0, 155)}...`
    : `Ingressos para ${name}. ${date ? `Data: ${date}.` : ""} ${
        location ? `Local: ${location}.` : ""
      } Compre agora com ${APP_NAME}!`;

  const tags = [
    "ingressos",
    "eventos",
    name.toLowerCase(),
    ...(location ? [location.toLowerCase()] : []),
  ];

  return generateMetadata({
    title: name,
    description: eventDescription,
    image: image,
    url: eventUrl,
    type: "event",
    tags,
  });
}

/**
 * Gera metadata para páginas estáticas
 */
export function generatePageMetadata(
  pageTitle: string,
  pageDescription: string,
  pagePath: string,
  image?: string
): Metadata {
  return generateMetadata({
    title: pageTitle,
    description: pageDescription,
    image: image,
    url: pagePath,
    type: "website",
  });
}

/**
 * Gera structured data (JSON-LD) para eventos
 */
export function generateEventStructuredData(event: {
  name: string;
  description?: string;
  image?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  address?: string;
  price?: number;
  currency?: string;
  id: string;
  url: string;
}): object {
  const baseUrl = getBaseUrl();
  const {
    name,
    description,
    image,
    date,
    startDate,
    endDate,
    location,
    address,
    price,
    currency = "BRL",
    id,
    url,
  } = event;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: name,
    description: description || `Ingressos para ${name}`,
    image: image ? getOgImageUrl(image) : getOgImageUrl(),
    startDate: startDate || date,
    ...(endDate && { endDate }),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: location || "Local a definir",
      ...(address && {
        address: { "@type": "PostalAddress", streetAddress: address },
      }),
    },
    ...(price && {
      offers: {
        "@type": "Offer",
        url: `${baseUrl}${url}`,
        price: price,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        validFrom: new Date().toISOString(),
      },
    }),
    organizer: {
      "@type": "Organization",
      name: APP_NAME,
      url: baseUrl,
    },
    url: `${baseUrl}${url}`,
  };
}

/**
 * Gera structured data (JSON-LD) para organização
 */
export function generateOrganizationStructuredData(): object {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: baseUrl,
    logo: `${baseUrl}${APP_CONFIG.logo.src}`,
    description: `Plataforma de venda de ingressos para eventos. ${APP_NAME} oferece a melhor experiência para compra de ingressos online.`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: APP_CONFIG.contact.email,
      availableLanguage: "Portuguese",
    },
    sameAs: [
      ...(APP_CONFIG.links.instagram ? [APP_CONFIG.links.instagram] : []),
    ],
  };
}

/**
 * Gera structured data (JSON-LD) para breadcrumbs
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
): object {
  const baseUrl = getBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}
