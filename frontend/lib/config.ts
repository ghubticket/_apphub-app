/**
 * Configurações globais da aplicação
 * Centraliza informações do projeto para fácil manutenção
 */

export const APP_CONFIG = {
  // Nome da marca/projeto
  name: 'Toka',
  
  // Nome completo com prefixo (se necessário)
  fullName: 'Toka',
  
  // Nome curto/abreviação (se necessário)
  shortName: 'Toka',
  
  // Logo
  logo: {
    src: '/images/toka.webp',
    alt: 'Logotipo Toka',
  },
  
  // Informações de contato
  contact: {
    email: 'contato@toka.com.br',
    privacyEmail: 'privacidade@toka.com.br',
    dpoEmail: 'dpo@toka.com.br',
  },
  
  // URLs e links
  links: {
    instagram: 'https://www.instagram.com/toka/',
    website: '/',
  },
  
  // Chaves de storage (mantendo compatibilidade com código existente)
  storage: {
    cartKey: 'toka-cart-items',
    activeOrderKey: '5521-active-order-id',
  },
} as const;

// Exportações individuais para facilitar o uso
export const APP_NAME = APP_CONFIG.name;
export const APP_FULL_NAME = APP_CONFIG.fullName;
export const APP_SHORT_NAME = APP_CONFIG.shortName;
export const APP_LOGO = APP_CONFIG.logo.src;
export const APP_LOGO_ALT = APP_CONFIG.logo.alt;

