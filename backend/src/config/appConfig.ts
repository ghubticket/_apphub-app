/**
 * Configurações globais da aplicação (Backend)
 * Centraliza informações do projeto para fácil manutenção
 */

export const APP_CONFIG = {
  // Nome da marca/projeto
  name: process.env.APP_NAME || 'Toka',
  
  // Nome completo com prefixo (se necessário)
  fullName: process.env.APP_FULL_NAME || 'Toka',
  
  // Informações de contato
  contact: {
    email: process.env.CONTACT_EMAIL || 'contato@toka.com.br',
    privacyEmail: process.env.PRIVACY_EMAIL || 'privacidade@toka.com.br',
    dpoEmail: process.env.DPO_EMAIL || 'dpo@toka.com.br',
    supportEmail: process.env.SUPPORT_EMAIL || 'suporte@toka.com.br',
  },
  
  // Informações legais
  legal: {
    companyName: process.env.COMPANY_NAME || 'Toka',
    cnpj: process.env.COMPANY_CNPJ || '45.380.558/0001-88',
  },
  
  // URLs
  urls: {
    website: process.env.WEBSITE_URL || 'https://toka.com.br',
    privacy: process.env.PRIVACY_URL || 'https://toka.com.br/privacidade',
    terms: process.env.TERMS_URL || 'https://toka.com.br/termos',
  },
} as const;

// Exportações individuais para facilitar o uso
export const APP_NAME = APP_CONFIG.name;
export const APP_FULL_NAME = APP_CONFIG.fullName;
export const CONTACT_EMAIL = APP_CONFIG.contact.email;
export const PRIVACY_EMAIL = APP_CONFIG.contact.privacyEmail;
export const DPO_EMAIL = APP_CONFIG.contact.dpoEmail;
export const SUPPORT_EMAIL = APP_CONFIG.contact.supportEmail;
export const COMPANY_NAME = APP_CONFIG.legal.companyName;
export const COMPANY_CNPJ = APP_CONFIG.legal.cnpj;

