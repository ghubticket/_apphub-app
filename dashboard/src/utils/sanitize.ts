/**
 * Utilitário de Sanitização HTML para prevenir XSS
 * 
 * Versão simplificada usando apenas regex e validações
 * (Otimizado para Next.js - não usa jsdom)
 */

/**
 * Remove scripts e tags perigosas de HTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  let clean = dirty

  // Remover scripts
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remover event handlers
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  clean = clean.replace(/on\w+\s*=\s*[^\s>]*/gi, '')
  
  // Remover javascript: URLs
  clean = clean.replace(/javascript:/gi, '')
  
  // Remover data: URLs perigosos (manter apenas image)
  clean = clean.replace(/data:(?!image\/)[^"'\s]*/gi, '')
  
  // Remover iframes
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  
  // Remover object/embed
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
  clean = clean.replace(/<embed\b[^>]*>/gi, '')
  
  // Remover form/input/button
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
  clean = clean.replace(/<input\b[^>]*>/gi, '')
  clean = clean.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '')

  return clean.trim()
}

/**
 * Remove todas as tags HTML
 */
export function stripHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  return dirty
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Valida e sanitiza conteúdo de editor
 */
export function sanitizeEditorContent(editorHtml: string, maxLength: number = 2000): string {
  if (!editorHtml || typeof editorHtml !== 'string') {
    throw new Error('Conteúdo do editor é obrigatório')
  }

  // Remove tags vazias
  let clean = editorHtml.replace(/<p><\/p>/g, '').trim()

  if (!clean || clean === '<p></p>' || clean === '') {
    throw new Error('Conteúdo do editor não pode estar vazio')
  }

  // Sanitizar
  clean = sanitizeHtml(clean)

  // Verificar tamanho
  const textContent = stripHtml(clean)

  if (textContent.length > maxLength) {
    throw new Error(`Conteúdo deve ter no máximo ${maxLength} caracteres`)
  }

  return clean
}

