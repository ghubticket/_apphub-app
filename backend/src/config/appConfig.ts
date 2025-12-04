/**
 * Configurações globais da aplicação (Backend)
 * Centraliza informações do projeto para fácil manutenção
 */

export const APP_CONFIG = {
  // Nome da marca/projeto
  name: process.env.APP_NAME || 'vicente',
  
  // Nome completo com prefixo (se necessário)
  fullName: process.env.APP_FULL_NAME || 'vicente',
  
  // Informações de contato
  contact: {
    email: process.env.CONTACT_EMAIL || 'contato@vicente.com.br',
    privacyEmail: process.env.PRIVACY_EMAIL || 'privacidade@vicente.com.br',
    dpoEmail: process.env.DPO_EMAIL || 'dpo@vicente.com.br',
    supportEmail: process.env.SUPPORT_EMAIL || 'suporte@vicente.com.br',
  },
  
  // Informações legais
  legal: {
    companyName: process.env.COMPANY_NAME || 'vicente',
    cnpj: process.env.COMPANY_CNPJ || '45.380.558/0001-88',
  },
  
  // URLs
  urls: {
    website: process.env.WEBSITE_URL || 'https://vicente.com.br',
    privacy: process.env.PRIVACY_URL || 'https://vicente.com.br/privacidade',
    terms: process.env.TERMS_URL || 'https://vicente.com.br/termos',
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

