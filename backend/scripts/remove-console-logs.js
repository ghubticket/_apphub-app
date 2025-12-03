/**
 * Script para REMOVER TODOS os console.log do código
 * 
 * Uso: node scripts/remove-console-logs.js
 * 
 * Remove TODOS os console.* do código (Sentry faz o monitoramento)
 * - console.log → removido
 * - console.error → removido
 * - console.warn → removido
 * - console.info → removido
 * - console.debug → removido
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_SRC = path.join(__dirname, '../src');
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git'];
const EXCLUDE_FILES = ['.d.ts', '.js.map'];

// Padrões de console a serem removidos/substituídos
const CONSOLE_PATTERNS = [
    /console\.log\(/g,
    /console\.error\(/g,
    /console\.warn\(/g,
    /console\.info\(/g,
    /console\.debug\(/g,
];

// Função para verificar se deve processar o arquivo
function shouldProcessFile(filePath) {
    // Ignorar arquivos compilados e de definição
    if (filePath.includes('.d.ts') || filePath.includes('.js.map')) {
        return false;
    }
    
    // Apenas arquivos TypeScript
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return false;
    }
    
    // Ignorar scripts (eles podem precisar de console)
    if (filePath.includes('/scripts/')) {
        return false;
    }
    
    return true;
}

// Função para encontrar todos os arquivos TypeScript
function findTypeScriptFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Ignorar diretórios excluídos
            if (!EXCLUDE_DIRS.includes(file)) {
                findTypeScriptFiles(filePath, fileList);
            }
        } else if (shouldProcessFile(filePath)) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Função para remover/substituir console.*
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];
    
    // Verificar se tem console.*
    const hasConsole = CONSOLE_PATTERNS.some(pattern => pattern.test(content));
    
    if (!hasConsole) {
        return { modified: false, changes: [] };
    }
    
    // REMOVER TODOS os console.* (Sentry faz o monitoramento)
    // Não substituir por logger - apenas remover
    CONSOLE_PATTERNS.forEach((pattern, index) => {
        const methods = ['log', 'error', 'warn', 'info', 'debug'];
        const method = methods[index];
        
        if (pattern.test(content)) {
            // Remover console.* completamente
            // Padrão: console.method(...) ou console.method(...);
            // Captura linha inteira incluindo quebras de linha antes
            const regex = new RegExp(`\\s*console\\.${method}\\([^)]*\\);?\\s*`, 'g');
            const matches = content.match(regex);
            
            if (matches) {
                matches.forEach(match => {
                    // Remover completamente (não comentar)
                    content = content.replace(match, '');
                    changes.push(`Removido: console.${method}(...)`);
                    modified = true;
                });
            }
        }
    });
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return { modified, changes };
}

// Função principal
function main() {
    console.log('🔍 Procurando arquivos TypeScript...');
    
    const files = findTypeScriptFiles(BACKEND_SRC);
    console.log(`📁 Encontrados ${files.length} arquivos para processar\n`);
    
    let totalModified = 0;
    let totalChanges = 0;
    const modifiedFiles = [];
    
    files.forEach(file => {
        const result = processFile(file);
        
        if (result.modified) {
            totalModified++;
            totalChanges += result.changes.length;
            modifiedFiles.push({
                file: path.relative(BACKEND_SRC, file),
                changes: result.changes
            });
        }
    });
    
    // Relatório
    console.log('📊 Relatório:\n');
    console.log(`✅ Arquivos modificados: ${totalModified}`);
    console.log(`📝 Total de mudanças: ${totalChanges}\n`);
    
    if (modifiedFiles.length > 0) {
        console.log('📋 Arquivos modificados:');
        modifiedFiles.forEach(({ file, changes }) => {
            console.log(`\n  📄 ${file}`);
            changes.slice(0, 3).forEach(change => {
                console.log(`     - ${change}`);
            });
            if (changes.length > 3) {
                console.log(`     ... e mais ${changes.length - 3} mudanças`);
            }
        });
    }
    
    console.log('\n✨ Concluído!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Revise as mudanças: git diff');
    console.log('   2. Teste o código: npm run build');
    console.log('   3. Commit: git add . && git commit -m "chore: remove console logs, use Sentry"');
}

// Executar
main();

