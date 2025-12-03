/**
 * Script para substituir console.log/error/warn por logger
 * Uso: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git'];
const EXCLUDE_FILES = ['replace-console-logs.js'];

// Padrões de substituição
const replacements = [
  {
    // console.log('mensagem')
    pattern: /console\.log\((['"`])([^'"`]+)\1\)/g,
    replacement: "logger.info('$2')",
  },
  {
    // console.log('mensagem', objeto)
    pattern: /console\.log\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: "logger.info('$2', $3)",
  },
  {
    // console.error('mensagem')
    pattern: /console\.error\((['"`])([^'"`]+)\1\)/g,
    replacement: "logger.error('$2')",
  },
  {
    // console.error('mensagem', objeto)
    pattern: /console\.error\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: "logger.error('$2', $3)",
  },
  {
    // console.warn('mensagem')
    pattern: /console\.warn\((['"`])([^'"`]+)\1\)/g,
    replacement: "logger.warn('$2')",
  },
  {
    // console.warn('mensagem', objeto)
    pattern: /console\.warn\((['"`])([^'"`]+)\1\s*,\s*([^)]+)\)/g,
    replacement: "logger.warn('$2', $3)",
  },
];

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  if (EXCLUDE_FILES.includes(fileName)) return false;
  if (!fileName.endsWith('.ts') && !fileName.endsWith('.js')) return false;
  return true;
}

function shouldProcessDir(dirPath) {
  const dirName = path.basename(dirPath);
  return !EXCLUDE_DIRS.includes(dirName);
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let hasConsole = false;

    // Verificar se tem console.log/error/warn
    if (/console\.(log|error|warn)/.test(content)) {
      hasConsole = true;

      // Adicionar import do logger se não existir
      if (!content.includes("import logger") && !content.includes("from '@/utils/logger'")) {
        // Encontrar última linha de import
        const importRegex = /^import\s+.*$/gm;
        const imports = content.match(importRegex);
        if (imports && imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          const insertIndex = lastImportIndex + lastImport.length;
          content = content.slice(0, insertIndex) + 
                   "\nimport logger from '@/utils/logger';" + 
                   content.slice(insertIndex);
          modified = true;
        } else {
          // Se não houver imports, adicionar no início
          content = "import logger from '@/utils/logger';\n" + content;
          modified = true;
        }
      }

      // Aplicar substituições
      replacements.forEach(({ pattern, replacement }) => {
        const newContent = content.replace(pattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Processado: ${filePath}`);
      return true;
    } else if (hasConsole) {
      console.log(`⚠️  Tem console mas não foi modificado: ${filePath}`);
    }
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (shouldProcessDir(filePath)) {
        walkDir(filePath, fileList);
      }
    } else if (stat.isFile() && shouldProcessFile(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Executar
console.log('🔍 Procurando arquivos com console.log/error/warn...\n');

const files = walkDir(SRC_DIR);
let processedCount = 0;

files.forEach((file) => {
  if (processFile(file)) {
    processedCount++;
  }
});

console.log(`\n✅ Processamento concluído! ${processedCount} arquivo(s) modificado(s).`);
console.log('\n⚠️  IMPORTANTE: Revise as mudanças manualmente antes de commitar!');
console.log('   Alguns console.log podem precisar de ajustes manuais.');

