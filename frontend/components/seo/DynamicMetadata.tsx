'use client';

import { useEffect } from 'react';
import { SEOOptions } from '@/lib/seo';

interface DynamicMetadataProps extends SEOOptions {
  children?: React.ReactNode;
}

/**
 * Componente para injetar meta tags dinamicamente em páginas client-side
 * Usa next/head ou manipulação direta do DOM
 */
export default function DynamicMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
  nofollow = false,
  children,
}: DynamicMetadataProps) {
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const siteName = 'Vicente';
    
    // Title
    if (title) {
      document.title = `${title} | ${siteName}`;
    }
    
    // Description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }
    
    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title ? `${title} | ${siteName}` : undefined },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: url ? (url.startsWith('http') ? url : `${baseUrl}${url}`) : baseUrl },
      { property: 'og:image', content: image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : `${baseUrl}/images/og-default.jpg` },
      { property: 'og:site_name', content: siteName },
      { property: 'og:locale', content: 'pt_BR' },
    ];
    
    ogTags.forEach(({ property, content }) => {
      if (content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      }
    });
    
    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title ? `${title} | ${siteName}` : undefined },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image ? (image.startsWith('http') ? image : `${baseUrl}${image}`) : `${baseUrl}/images/og-default.jpg` },
    ];
    
    twitterTags.forEach(({ name, content }) => {
      if (content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      }
    });
    
    // Robots
    const robots = [];
    if (noindex) robots.push('noindex');
    if (nofollow) robots.push('nofollow');
    if (robots.length === 0) {
      robots.push('index', 'follow');
    }
    
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', robots.join(', '));
    
    // Canonical URL
    if (url) {
      const finalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', finalUrl);
    }
  }, [title, description, image, url, type, noindex, nofollow]);

  return <>{children}</>;
}

