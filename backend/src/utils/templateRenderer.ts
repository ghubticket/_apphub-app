import fs from 'fs';
import path from 'path';

/**
 * Substitui variáveis em uma string HTML
 */
const replaceVariables = (html: string, variables: Record<string, any>): string => {
    let result = html;

    // Processar loops {{#each array}}...{{/each}}
    result = result.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (match, arrayName, content) => {
            const array = variables[arrayName];
            if (!Array.isArray(array) || array.length === 0) {
                return '';
            }

            return array
                .map((item: any, index: number) => {
                    let itemContent = content;
                    // Substituir {{this.propriedade}} com valores do item
                    itemContent = itemContent.replace(
                        /\{\{this\.(\w+)\}\}/g,
                        (m: string, prop: string) => {
                            return item[prop] || '';
                        }
                    );
                    // Substituir {{@index}} com o índice
                    itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
                    return itemContent;
                })
                .join('');
        }
    );

    // Substituir variáveis no formato {{variavel}}
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value || ''));
    }

    // Remover blocos condicionais não preenchidos {{#if var}}...{{/if}}
    result = result.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (match, varName, content) => {
            return variables[varName] ? content : '';
        }
    );

    return result;
};

/**
 * Renderiza um template HTML substituindo variáveis
 * Automaticamente envolve com o template base
 *
 * @param templateName Nome do template (sem extensão)
 * @param variables Objeto com variáveis para substituir
 * @returns HTML renderizado completo
 */
export const renderTemplate = (templateName: string, variables: Record<string, any>): string => {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template não encontrado: ${templateName}.html`);
    }

    // Ler conteúdo do template
    let content = fs.readFileSync(templatePath, 'utf-8');

    // Substituir variáveis no conteúdo
    content = replaceVariables(content, variables);

    // Renderizar com template base
    return renderBaseTemplate(content, variables);
};

/**
 * Renderiza template base com conteúdo
 */
export const renderBaseTemplate = (
    content: string,
    variables: Record<string, any> = {}
): string => {
    const basePath = path.join(__dirname, '../templates/email/base.html');

    if (!fs.existsSync(basePath)) {
        throw new Error('Template base não encontrado');
    }

    let html = fs.readFileSync(basePath, 'utf-8');

    // Substituir {{content}} com o conteúdo fornecido
    html = html.replace(/\{\{\s*content\s*\}\}/g, content);

    // Substituir outras variáveis
    const defaultVars = {
        year: new Date().getFullYear(),
        subject: 'EventHub',
        ...variables,
    };

    html = replaceVariables(html, defaultVars);

    return html;
};
