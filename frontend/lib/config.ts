/**
 * Configurações globais da aplicação
 * Centraliza informações do projeto para fácil manutenção
 */

export const APP_CONFIG = {
  // Nome da marca/projeto
  name: 'Pagode do Príncipe',
  
  // Nome completo com prefixo (se necessário)
  fullName: 'Pagode do Príncipe',
  
  // Nome curto/abreviação (se necessário)
  shortName: 'Pagode do Príncipe',
  
  // Logo
  logo: {
    src: '/images/pagode-do-principe.png',
    alt: 'Logotipo Pagode do Príncipe',
  },
  
  // Informações de contato
  contact: {
    email: 'contato@pagodedoprincipe.com.br',
    privacyEmail: 'privacidade@pagodedoprincipe.com.br',
    dpoEmail: 'dpo@pagodedoprincipe.com.br',
  },
  
  // URLs e links
  links: {
    instagram: 'https://www.instagram.com/pagodedoprincipe/',
    website: '/',
  },
  
  // Chaves de storage (mantendo compatibilidade com código existente)
  storage: {
    cartKey: '5521-cart-items',
    activeOrderKey: '5521-active-order-id',
  },
} as const;

// Exportações individuais para facilitar o uso
export const APP_NAME = APP_CONFIG.name;
export const APP_FULL_NAME = APP_CONFIG.fullName;
export const APP_SHORT_NAME = APP_CONFIG.shortName;
export const APP_LOGO = APP_CONFIG.logo.src;
export const APP_LOGO_ALT = APP_CONFIG.logo.alt;

