/**
 * Configurações globais da aplicação
 * Centraliza informações do projeto para fácil manutenção
 */

export const APP_CONFIG = {
  // Nome da marca/projeto
  name: 'vicente',
  
  // Nome completo com prefixo (se necessário)
  fullName: 'vicente',
  
  // Nome curto/abreviação (se necessário)
  shortName: 'vicente',
  
  // Logo
  logo: {
    src: '/images/logo-header.svg',
    alt: 'Logotipo vicente',
  },
  
  // Informações de contato
  contact: {
    email: 'contato@vicente.com.br',
    privacyEmail: 'privacidade@vicente.com.br',
    dpoEmail: 'dpo@vicente.com.br',
    supportEmail: 'suporte@vicente.com.br',
    whatsapp: [
      {
        name: 'Suporte',
        phone: '5511982631238', // Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
        role: 'Suporte',
      },
    ],
    supportHours: {
      weekdays: 'Segunda a Sexta: 09h às 18h',
      weekends: 'Sábado: 09h às 13h',
      closed: 'Domingo',
    },
  },
  
  // Informações legais
  legal: {
    cnpj: '00.380.558/0001-88',
    companyName: 'vicente',
    lgpdLaw: 'Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)',
  },
  
  // Informações do desenvolvedor
  developer: {
    name: 'Guilherme Henrique',
    instagram: 'https://www.instagram.com/5521/',
  },
  
  // URLs e links
  links: {
    instagram: 'https://www.instagram.com/vicente/',
    website: '/',
    privacy: '/privacidade',
    terms: '/termos',
  },
  
  // Chaves de storage (mantendo compatibilidade com código existente)
  storage: {
    cartKey: 'vicente-cart-items',
    activeOrderKey: '5521-active-order-id',
  },
} as const;

// Exportações individuais para facilitar o uso
export const APP_NAME = APP_CONFIG.name;
export const APP_FULL_NAME = APP_CONFIG.fullName;
export const APP_SHORT_NAME = APP_CONFIG.shortName;
export const APP_LOGO = APP_CONFIG.logo.src;
export const APP_LOGO_ALT = APP_CONFIG.logo.alt;
export const CONTACT_EMAIL = APP_CONFIG.contact.email;
export const PRIVACY_EMAIL = APP_CONFIG.contact.privacyEmail;
export const DPO_EMAIL = APP_CONFIG.contact.dpoEmail;
export const SUPPORT_EMAIL = APP_CONFIG.contact.supportEmail;
export const COMPANY_CNPJ = APP_CONFIG.legal.cnpj;
export const COMPANY_NAME = APP_CONFIG.legal.companyName;
export const LGPD_LAW = APP_CONFIG.legal.lgpdLaw;
export const DEVELOPER_NAME = APP_CONFIG.developer.name;
export const DEVELOPER_INSTAGRAM = APP_CONFIG.developer.instagram;

