const fs = require('fs');
const path = require('path');

// Diretórios a processar
const directories = [
    path.join(__dirname, '../frontend'),
];

// Extensões de arquivo a processar
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Tipos de console a remover
const consoleTypes = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'table', 'group', 'groupEnd', 'time', 'timeEnd', 'assert', 'clear', 'count', 'dir', 'dirxml'];

let totalFiles = 0;
let totalRemoved = 0;

/**
 * Remove console.* de um arquivo usando regex
 * Remove linhas completas que contêm apenas console.* (com espaços/tabs antes)
 */
function removeConsoleFromFile(content) {
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Verificar se a linha contém apenas console.* (possivelmente com espaços/tabs antes)
        let isConsoleLine = false;
        
        for (const type of consoleTypes) {
            // Padrão: espaços/tabs opcionais + console.tipo( + qualquer coisa + );
            // Ou: espaços/tabs opcionais + console.tipo( + qualquer coisa (incluindo quebras de linha)
            const singleLinePattern = new RegExp(`^\\s*console\\.${type}\\([^;]*\\);?\\s*$`);
            const multiLineStartPattern = new RegExp(`^\\s*console\\.${type}\\(.*$`);
            
            if (singleLinePattern.test(trimmed)) {
                // Linha única com console.* - remover
                isConsoleLine = true;
                totalRemoved++;
                break;
            } else if (multiLineStartPattern.test(trimmed)) {
                // Início de console.* multi-linha - remover esta e as próximas até encontrar );
                isConsoleLine = true;
                totalRemoved++;
                
                // Procurar o fechamento na mesma linha ou nas próximas
                let parenCount = 0;
                let inString = false;
                let stringChar = null;
                let escaped = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (escaped) {
                        escaped = false;
                        continue;
                    }
                    if (char === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (!inString && (char === '"' || char === "'" || char === '`')) {
                        inString = true;
                        stringChar = char;
                        continue;
                    }
                    if (inString && char === stringChar) {
                        inString = false;
                        stringChar = null;
                        continue;
                    }
                    if (!inString) {
                        if (char === '(') parenCount++;
                        if (char === ')') parenCount--;
                    }
                }
                
                // Se não fechou na mesma linha, procurar nas próximas
                if (parenCount > 0) {
                    let j = i + 1;
                    while (j < lines.length && parenCount > 0) {
                        const nextLine = lines[j];
                        totalRemoved++;
                        
                        for (let k = 0; k < nextLine.length; k++) {
                            const char = nextLine[k];
                            if (escaped) {
                                escaped = false;
                                continue;
                            }
                            if (char === '\\') {
                                escaped = true;
                                continue;
                            }
                            if (!inString && (char === '"' || char === "'" || char === '`')) {
                                inString = true;
                                stringChar = char;
                                continue;
                            }
                            if (inString && char === stringChar) {
                                inString = false;
                                stringChar = null;
                                continue;
                            }
                            if (!inString) {
                                if (char === '(') parenCount++;
                                if (char === ')') parenCount--;
                            }
                        }
                        
                        if (parenCount === 0) {
                            i = j; // Pular todas as linhas até aqui
                            break;
                        }
                        j++;
                    }
                }
                
                break;
            }
        }
        
        if (!isConsoleLine) {
            newLines.push(line);
        }
    }
    
    return newLines.join('\n');
}

/**
 * Processa um arquivo
 */
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const newContent = removeConsoleFromFile(content);
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            totalFiles++;
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Erro ao processar ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Processa um diretório recursivamente
 */
function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return;
    }
    
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Ignorar node_modules, .next, .git, etc.
        if (entry.isDirectory()) {
            if (['node_modules', '.next', '.git', 'dist', 'build', '.cache'].includes(entry.name)) {
                continue;
            }
            processDirectory(fullPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
                processFile(fullPath);
            }
        }
    }
}

// Executar
console.log('🔍 Procurando arquivos com console.* no frontend...\n');

for (const dir of directories) {
    if (fs.existsSync(dir)) {
        processDirectory(dir);
    } else {
        console.warn(`⚠️  Diretório não encontrado: ${dir}`);
    }
}

console.log(`\n✅ Processamento concluído!`);
console.log(`📁 Arquivos modificados: ${totalFiles}`);
console.log(`🗑️  Linhas de console.* removidas: ${totalRemoved}`);

